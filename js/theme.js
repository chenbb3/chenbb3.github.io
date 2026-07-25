/* ============================================================
   theme.js — 配色切换引擎
   处理：预设主题、自定义取色、暗色模式、localStorage 持久化
   ============================================================ */

const THEME_PRESETS = {
  zhusha:  { accent: '#be4f4f', name: '朱砂' },
  dianqing: { accent: '#3b5e7a', name: '靛青' },
  zhuqing:  { accent: '#5a825a', name: '竹青' },
};

const STORAGE_KEY = 'blog-theme';

/** 模块级状态缓存，避免重复读取 localStorage */
let _state = null;
let _initialized = false;

/**
 * 验证并规范化 localStorage 解析结果
 * @param {any} parsed
 * @returns {object} 合法的主题状态
 */
function validateState(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const valid = {};
  // preset: 必须是已知 key 或 null
  valid.preset = (parsed.preset && THEME_PRESETS[parsed.preset]) ? parsed.preset : null;
  // accent: 必须是 hex 字符串或 null
  valid.accent = (typeof parsed.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accent))
    ? parsed.accent : null;
  // dark: 必须是 boolean 或 null
  valid.dark = (typeof parsed.dark === 'boolean') ? parsed.dark : null;
  // 如果 preset 和 accent 都无效，回退到默认
  if (!valid.preset && !valid.accent) valid.preset = 'zhusha';
  return valid;
}

/**
 * 从 localStorage 读取保存的主题设置
 * @returns {{ preset: string|null, accent: string|null, dark: boolean|null }}
 */
function loadTheme() {
  if (_state) return { ..._state };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const validated = validateState(JSON.parse(raw));
      if (validated) return validated;
    }
  } catch (_) { /* corrupted data, ignore */ }
  return { preset: 'zhusha', accent: null, dark: null };
}

/**
 * 保存主题设置到 localStorage
 * @param {object} state
 */
function saveTheme(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    _state = { ...state };
  } catch (_) {
    console.warn('无法保存主题设置: localStorage 可能已满');
  }
}

/**
 * 检测系统是否偏好暗色模式
 * @returns {boolean}
 */
function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 应用点睛色到 CSS 变量
 * @param {string} hex
 */
function applyAccent(hex) {
  document.documentElement.style.setProperty('--color-accent', hex);
}

/**
 * 应用暗色/亮色模式
 * @param {boolean} dark
 */
function applyDarkMode(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/**
 * 激活一个预设主题
 * @param {string} presetKey — THEME_PRESETS 的 key
 * @returns {object} 更新后的 state
 */
function activatePreset(presetKey) {
  const preset = THEME_PRESETS[presetKey];
  if (!preset) return { ...loadTheme() };

  const state = loadTheme();
  state.preset = presetKey;
  state.accent = null;
  applyAccent(preset.accent);
  saveTheme(state);
  updatePickerUI(state);
  return { ...state };
}

/**
 * 设置自定义颜色
 * @param {string} hex
 * @returns {object} 更新后的 state
 */
function activateCustom(hex) {
  const state = loadTheme();
  state.preset = null;
  state.accent = hex;
  applyAccent(hex);
  saveTheme(state);
  updatePickerUI(state);
  return { ...state };
}

/**
 * 切换暗色模式
 * @returns {object} 更新后的 state
 */
function toggleDarkMode() {
  const state = loadTheme();
  const dark = state.dark === null ? !prefersDark() : !state.dark;
  state.dark = dark;
  applyDarkMode(dark);
  saveTheme(state);
  updatePickerDarkIcon(dark);
  return { ...state };
}

/** 获取当前实际使用的 accent 颜色 */
function getCurrentAccent(state) {
  if (state.accent) return state.accent;
  if (state.preset && THEME_PRESETS[state.preset]) {
    return THEME_PRESETS[state.preset].accent;
  }
  return THEME_PRESETS.zhusha.accent;
}

/** 更新预设色块的高亮状态 */
function updatePickerUI(state) {
  document.querySelectorAll('.color-picker__preset').forEach(btn => {
    const key = btn.dataset.theme;
    btn.classList.toggle('color-picker__preset--active', key === state.preset);
  });
  const dot = document.querySelector('.color-picker__dot');
  if (dot) dot.style.backgroundColor = getCurrentAccent(state);
}

/** 更新暗色模式图标 */
function updatePickerDarkIcon(dark) {
  const icon = document.querySelector('.color-picker__dark-icon');
  if (icon) {
    icon.textContent = dark ? '◑' : '◐';
    icon.title = dark ? '切换亮色模式' : '切换暗色模式';
  }
}

/**
 * 初始化主题系统
 * 调用时机：DOM ready 之后
 */
function initTheme() {
  if (_initialized) return;
  _initialized = true;

  const state = loadTheme();
  const accent = getCurrentAccent(state);
  applyAccent(accent);

  const dark = state.dark !== null ? state.dark : prefersDark();
  applyDarkMode(dark);

  buildColorPicker();
  updatePickerUI(state);
  updatePickerDarkIcon(dark);
  bindColorPickerEvents();

  // 监听系统配色变化（用户未手动设置时跟随系统）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const current = loadTheme();
    if (current.dark === null) {
      applyDarkMode(e.matches);
      updatePickerDarkIcon(e.matches);
    }
  });
}

/**
 * 在页面上构建颜色选择器 DOM
 */
function buildColorPicker() {
  if (document.getElementById('color-picker')) return;

  const html = `
    <div class="color-picker" id="color-picker">
      <button class="color-picker__trigger" id="picker-trigger" aria-label="切换配色">
        <span class="color-picker__dot"></span>
      </button>
      <div class="color-picker__panel" id="picker-panel">
        ${Object.entries(THEME_PRESETS).map(([key, p]) =>
          `<button class="color-picker__preset" data-theme="${key}" style="--c: ${p.accent}" aria-label="${p.name}"></button>`
        ).join('')}
        <label class="color-picker__custom" title="自定义颜色">
          <span class="color-picker__custom-icon">+</span>
          <input type="color" class="color-picker__input" id="picker-custom-input" value="#be4f4f">
        </label>
        <button class="color-picker__dark-toggle" id="picker-dark-toggle" aria-label="切换暗色模式" title="切换暗色模式">
          <span class="color-picker__dark-icon">◐</span>
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * 绑定颜色选择器的交互事件
 */
function bindColorPickerEvents() {
  const trigger = document.getElementById('picker-trigger');
  const panel = document.getElementById('picker-panel');
  if (!trigger || !panel) return;

  // 展开/收起面板
  trigger.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('color-picker__panel--visible');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  // 点击面板外关闭
  document.addEventListener('click', (e) => {
    const picker = document.getElementById('color-picker');
    if (picker && !picker.contains(e.target)) {
      panel.classList.remove('color-picker__panel--visible');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  // 预设色块点击
  panel.querySelectorAll('.color-picker__preset').forEach(btn => {
    btn.addEventListener('click', () => {
      activatePreset(btn.dataset.theme);
    });
  });

  // 自定义取色器（debounced）
  let customTimer;
  const customInput = document.getElementById('picker-custom-input');
  if (customInput) {
    customInput.value = getCurrentAccent(loadTheme());
    customInput.addEventListener('input', (e) => {
      clearTimeout(customTimer);
      customTimer = setTimeout(() => activateCustom(e.target.value), 80);
    });
  }

  // 暗色模式切换
  const darkToggle = document.getElementById('picker-dark-toggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', toggleDarkMode);
  }

  // 键盘快捷键: 按 D 切换暗色模式（仅当焦点在 body 上）
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD' && e.target === document.body) {
      toggleDarkMode();
    }
  });
}
