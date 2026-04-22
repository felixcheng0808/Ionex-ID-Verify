(function () {
  const PAGES = [
    { href: '/index.html',           label: '首頁',    match: ['/', '/index.html'] },
    { href: '/document-review.html', label: '證件審核', match: ['/document-review.html'] },
    { href: '/verify-test.html',     label: 'OCR 測試', match: ['/verify-test.html'] },
    { href: '/error-logs.html',      label: '錯誤紀錄', match: ['/error-logs.html'] },
  ];

  const path = window.location.pathname;
  const current = PAGES.find(p => p.match.includes(path)) || null;

  const css = `
    #ionex-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      height: 52px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex; align-items: center;
      padding: 0 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,.25);
      font-family: 'Microsoft JhengHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    }
    #ionex-nav .nav-logo {
      color: white; font-weight: 700; font-size: 15px; text-decoration: none;
      margin-right: 32px; white-space: nowrap; opacity: 1;
      letter-spacing: .02em;
    }
    #ionex-nav .nav-links {
      display: flex; align-items: center; gap: 4px; flex: 1;
    }
    #ionex-nav .nav-link {
      color: rgba(255,255,255,.8); text-decoration: none;
      padding: 6px 14px; border-radius: 8px;
      font-size: 14px; transition: all .2s; white-space: nowrap;
    }
    #ionex-nav .nav-link:hover  { background: rgba(255,255,255,.15); color: white; }
    #ionex-nav .nav-link.active { background: rgba(255,255,255,.25); color: white; font-weight: 600; }
    #ionex-nav .nav-status {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: rgba(255,255,255,.75);
    }
    #ionex-nav .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #68d391; flex-shrink: 0;
    }
    #ionex-nav .status-dot.error { background: #fc8181; }
    #ionex-nav .status-dot.loading {
      background: rgba(255,255,255,.4);
      animation: navPulse 1s ease-in-out infinite;
    }
    @keyframes navPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // push body content down
  const pushStyle = document.createElement('style');
  pushStyle.textContent = 'body { padding-top: 52px !important; }';
  document.head.appendChild(pushStyle);

  const nav = document.createElement('nav');
  nav.id = 'ionex-nav';

  const links = PAGES.map(p =>
    `<a class="nav-link${current && current.href === p.href ? ' active' : ''}" href="${p.href}">${p.label}</a>`
  ).join('');

  nav.innerHTML = `
    <a class="nav-logo" href="/index.html">Ionex ID Verify</a>
    <div class="nav-links">${links}</div>
    <div class="nav-status">
      <span class="status-dot loading" id="navStatusDot"></span>
      <span id="navStatusText">連線中...</span>
    </div>
  `;

  // inject as first child of body
  if (document.body) {
    document.body.insertBefore(nav, document.body.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.insertBefore(nav, document.body.firstChild);
    });
  }

  // async system status
  fetch('/api/health')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(() => {
      document.getElementById('navStatusDot').className = 'status-dot';
      document.getElementById('navStatusText').textContent = 'API 正常';
    })
    .catch(() => {
      document.getElementById('navStatusDot').className = 'status-dot error';
      document.getElementById('navStatusText').textContent = 'API 無回應';
    });
})();
