/* ============================================================
   markdown.js — Markdown 加载与渲染
   依赖：marked.js (CDN 全局)
   ============================================================ */

/**
 * 解析 Front Matter（简陋但够用的 YAML 子集）
 * 支持格式：key: value
 * @param {string} raw — --- 之间的原始文本
 * @returns {object}
 */
function parseFrontMatter(raw) {
  const meta = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key) meta[key] = value;
  }
  return meta;
}

/**
 * 加载并渲染 Markdown 文件
 * @param {string} slug — 文件名（不含 .md 扩展名）
 * @param {object} opts
 * @param {boolean} opts.isPage — true 表示从根目录加载，false 表示从 posts/ 加载
 * @returns {Promise<{ meta: object, html: string, title: string, date: string }>}
 */
async function loadMarkdown(slug, opts = {}) {
  const basePath = opts.isPage ? '/' : '/posts/';
  const url = `${basePath}${slug}.md`;
  const fullUrl = new URL(url, window.location.origin).href;

  console.log('[markdown] fetching:', fullUrl);
  const resp = await fetch(fullUrl);
  console.log('[markdown] response:', resp.status, resp.statusText);
  if (!resp.ok) {
    throw new Error(`无法加载文章: ${slug} (${resp.status})`);
  }

  const text = await resp.text();

  // 提取 Front Matter
  let meta = {};
  let body = text;
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fmMatch) {
    meta = parseFrontMatter(fmMatch[1]);
    body = fmMatch[2];
  }

  // 如果没有 Front Matter title，从第一个 # 标题提取
  if (!meta.title) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) meta.title = h1Match[1].trim();
  }

  // 渲染 Markdown
  const html = typeof marked !== 'undefined'
    ? marked.parse(body)
    : `<pre>${escapeHtml(body)}</pre>`;

  return {
    meta,
    html,
    title: meta.title || slug,
    date: meta.date || '',
  };
}

/**
 * HTML 转义（marked 不可用时的 fallback）
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

/**
 * 加载文章清单
 * @returns {Promise<Array<{ slug: string, title: string, date: string }>>}
 */
async function loadPostList() {
  try {
    const resp = await fetch('/posts/index.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('清单格式错误');
    return data;
  } catch (err) {
    console.warn('无法加载文章清单:', err.message);
    return [];
  }
}

/**
 * 渲染文章列表到 DOM
 * @param {Array} posts
 * @param {HTMLElement} container
 */
function renderPostList(posts, container) {
  if (!posts.length) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:var(--space-lg)">暂无文章</p>';
    return;
  }

  const items = posts.map((post, i) => `
    <li class="posts-list__item" style="animation-delay:${0.45 + i * 0.08}s">
      <a class="posts-list__link" href="#/posts/${escapeHtml(post.slug)}">
        <span class="posts-list__title">${escapeHtml(post.title)}</span>
        <time class="posts-list__date">${escapeHtml(post.date)}</time>
      </a>
    </li>
  `).join('');

  container.innerHTML = `<ul class="posts-list">${items}</ul>`;
}
