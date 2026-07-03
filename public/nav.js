(function () {
  const PAGES = [
    { href: '/index.html',           label: '首頁',    icon: '🏠', match: ['/', '/index.html'] },
    { href: '/document-review.html', label: '證件審核', icon: '📋', match: ['/document-review.html'] },
    { href: '/verify-test.html',     label: 'OCR 測試', icon: '🔍', match: ['/verify-test.html'] },
    { href: '/error-logs.html',      label: '錯誤紀錄', icon: '📊', match: ['/error-logs.html'] },
  ];

  const path = window.location.pathname;
  const current = PAGES.find(p => p.match.includes(path)) || null;

  // shared design system (idempotent)
  if (!document.querySelector('link[href="/css/shadcn.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/shadcn.css';
    document.head.appendChild(link);
  }

  const css = `
    #ionex-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      height: 56px;
      background: linear-gradient(135deg, hsl(var(--primary, 243 62% 68%)) 0%, hsl(var(--primary-hover, 258 43% 51%)) 100%);
      display: flex; align-items: center;
      padding: 0 20px;
      box-shadow: var(--shadow, 0 2px 10px rgba(0,0,0,.1));
      font-family: var(--font-sans, 'Microsoft JhengHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif);
    }
    #ionex-nav .nav-logo {
      color: white; font-weight: 700; font-size: 15px; text-decoration: none;
      margin-right: 32px; white-space: nowrap;
      letter-spacing: .02em;
    }
    #ionex-nav .nav-links {
      display: flex; align-items: center; gap: 4px; flex: 1;
    }
    #ionex-nav .nav-link {
      display: flex; align-items: center; gap: 6px;
      color: rgba(255,255,255,.8); text-decoration: none;
      padding: 8px 14px; border-radius: 8px;
      font-size: 14px; transition: all .15s; white-space: nowrap;
    }
    #ionex-nav .nav-link:hover  { background: rgba(255,255,255,.15); color: white; }
    #ionex-nav .nav-link.active { background: rgba(255,255,255,.22); color: white; font-weight: 600; }
    #ionex-nav .nav-status {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: rgba(255,255,255,.75);
    }
    #ionex-nav .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: hsl(var(--success, 142 43% 51%)); flex-shrink: 0;
    }
    #ionex-nav .status-dot.error { background: #fc8181; }
    #ionex-nav .status-dot.loading {
      background: rgba(255,255,255,.4);
      animation: navPulse 1s ease-in-out infinite;
    }
    @keyframes navPulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    #ionex-nav .nav-toggle {
      display: none;
      width: 40px; height: 40px; margin-left: auto;
      background: transparent; border: none; color: white;
      font-size: 22px; line-height: 1; cursor: pointer;
      align-items: center; justify-content: center;
    }

    #ionex-nav-mobile-panel {
      position: fixed; top: 56px; left: 0; right: 0; z-index: 9998;
      background: white; box-shadow: var(--shadow-lg, 0 8px 28px rgba(0,0,0,.16));
      border-top: 1px solid hsl(var(--border, 220 16% 88%));
      padding: 8px; display: none; flex-direction: column; gap: 2px;
    }
    #ionex-nav-mobile-panel.open { display: flex; }
    #ionex-nav-mobile-panel .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 8px;
      font-size: 15px; color: hsl(var(--foreground, 222 20% 18%)); text-decoration: none;
    }
    #ionex-nav-mobile-panel .nav-link.active { background: hsl(var(--accent, 243 75% 96%)); color: hsl(var(--accent-foreground, 243 62% 40%)); font-weight: 700; }
    #ionex-nav-mobile-panel .nav-status {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 14px; font-size: 12px; color: hsl(var(--muted-foreground, 220 9% 46%));
      border-top: 1px solid hsl(var(--border, 220 16% 88%)); margin-top: 4px;
    }

    @media (max-width: 768px) {
      #ionex-nav .nav-links, #ionex-nav .nav-status { display: none; }
      #ionex-nav .nav-toggle { display: flex; }
      #ionex-nav .nav-logo { margin-right: 0; flex: 1; }
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // push body content down
  const pushStyle = document.createElement('style');
  pushStyle.textContent = 'body { padding-top: 56px !important; }';
  document.head.appendChild(pushStyle);

  const nav = document.createElement('nav');
  nav.id = 'ionex-nav';

  const linkHtml = (p, withIcon) =>
    `<a class="nav-link${current && current.href === p.href ? ' active' : ''}" href="${p.href}">${withIcon ? `<span>${p.icon}</span>` : ''}${p.label}</a>`;

  nav.innerHTML = `
    <a class="nav-logo" href="/index.html">Ionex ID Verify</a>
    <div class="nav-links">${PAGES.map(p => linkHtml(p, false)).join('')}</div>
    <div class="nav-status">
      <span class="status-dot loading" id="navStatusDot"></span>
      <span id="navStatusText">連線中...</span>
    </div>
    <button type="button" class="nav-toggle" id="navToggleBtn" aria-label="開啟選單" aria-expanded="false">☰</button>
  `;

  const panel = document.createElement('div');
  panel.id = 'ionex-nav-mobile-panel';
  panel.innerHTML = `
    ${PAGES.map(p => linkHtml(p, true)).join('')}
    <div class="nav-status">
      <span class="status-dot loading" id="navStatusDotMobile"></span>
      <span id="navStatusTextMobile">連線中...</span>
    </div>
  `;

  function inject() {
    document.body.insertBefore(panel, document.body.firstChild);
    document.body.insertBefore(nav, document.body.firstChild);

    const toggleBtn = document.getElementById('navToggleBtn');
    toggleBtn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', String(open));
      toggleBtn.textContent = open ? '✕' : '☰';
    });

    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
        panel.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.textContent = '☰';
      }
    });
  }

  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }

  // async system status
  fetch('/api/health')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(() => {
      ['navStatusDot', 'navStatusDotMobile'].forEach(id => { document.getElementById(id).className = 'status-dot'; });
      ['navStatusText', 'navStatusTextMobile'].forEach(id => { document.getElementById(id).textContent = 'API 正常'; });
    })
    .catch(() => {
      ['navStatusDot', 'navStatusDotMobile'].forEach(id => { document.getElementById(id).className = 'status-dot error'; });
      ['navStatusText', 'navStatusTextMobile'].forEach(id => { document.getElementById(id).textContent = 'API 無回應'; });
    });
})();
