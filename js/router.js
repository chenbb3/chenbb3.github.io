/* ============================================================
   router.js — 轻量 hash SPA 路由
   路由表:
     #/                → 主页
     #/posts/:slug     → 文章页
     #/about           → 关于页
   ============================================================ */

/**
 * 路由表：匹配函数 → 处理函数
 * 每条规则: { match: (hash) => params | null, handler: (params) => void }
 */
const routes = [];

/**
 * 注册路由
 * @param {function} match — (hash: string) => object | null
 * @param {function} handler — (params: object) => Promise<void> | void
 */
function route(match, handler) {
  routes.push({ match, handler });
}

/**
 * 解析当前 hash 并执行匹配的路由
 */
async function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';

  // 标准化: 去掉尾部斜杠（保留根路径）
  const normalized = hash.length > 1 ? hash.replace(/\/$/, '') : hash;

  for (const { match, handler } of routes) {
    const params = match(normalized);
    if (params !== null) {
      try {
        await handler(params);
      } catch (err) {
        console.error('路由处理失败:', err);
        showError('页面加载失败');
      }
      return;
    }
  }

  // 404 fallback — 回到首页
  window.location.hash = '#/';
}

/**
 * 显示错误信息
 * @param {string} msg
 */
function showError(msg) {
  const articleView = document.getElementById('article-view');
  if (articleView) {
    articleView.innerHTML = `
      <div class="article-view container">
        <a class="back-link" href="#/">← 返回首页</a>
        <p class="text-muted">${escapeHtml(msg)}</p>
      </div>
    `;
  }
}

/**
 * 渲染主页视图
 */
async function renderHome() {
  const homeView = document.getElementById('home-view');
  const articleView = document.getElementById('article-view');

  if (homeView) homeView.style.display = 'block';
  if (articleView) articleView.style.display = 'none';

  // 加载文章列表（失败时友好降级）
  const posts = await loadPostList();
  const listContainer = document.getElementById('posts-list');
  if (listContainer) {
    renderPostList(posts, listContainer);
  }

  document.title = '老陈的知识库';
}

/**
 * 渲染文章视图
 * @param {string} slug
 * @param {boolean} isPage
 */
async function renderArticle(slug, isPage = false) {
  const homeView = document.getElementById('home-view');
  const articleView = document.getElementById('article-view');

  if (!articleView) {
    console.error('article-view container not found');
    return;
  }

  // 先显示加载状态，再隐藏主页（避免白屏闪烁）
  articleView.innerHTML = '<div class="article-view container"><p class="text-muted" style="text-align:center;padding:var(--space-xl)">加载中...</p></div>';
  articleView.style.display = 'block';
  if (homeView) homeView.style.display = 'none';

  try {
    const { title, date, html } = await loadMarkdown(slug, { isPage });
    document.title = `${title} — 老陈的知识库`;

    articleView.innerHTML = `
      <div class="article-view container">
        <a class="back-link" href="#/">← 返回</a>
        <article class="prose">
          <h1 class="article-title">${escapeHtml(title)}</h1>
          ${date ? `<time class="article-date">${escapeHtml(date)}</time>` : ''}
          <div class="article-body">${html}</div>
        </article>
      </div>
    `;

    window.scrollTo(0, 0);
  } catch (err) {
    showError(`文章加载失败: ${escapeHtml(err.message)}`);
  }
}

/**
 * 初始化路由系统
 */
function initRouter() {
  // 主页
  route(
    (hash) => (hash === '/' ? {} : null),
    () => renderHome()
  );

  // 文章页: #/posts/:slug
  route(
    (hash) => {
      const m = hash.match(/^\/posts\/([a-zA-Z0-9_-]+)$/);
      return m ? { slug: m[1] } : null;
    },
    (params) => renderArticle(params.slug)
  );

  // 关于页: #/about
  route(
    (hash) => (hash === '/about' ? { slug: 'about', isPage: true } : null),
    (params) => renderArticle(params.slug, true)
  );

  // 监听 hash 变化
  window.addEventListener('hashchange', handleRoute);

  // 首次加载
  handleRoute();
}
