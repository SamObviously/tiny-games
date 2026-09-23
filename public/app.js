import { TicTacToe } from './games/tictactoe.js';
import { SnakeMicro } from './games/snake.js';
import { ReflexTester } from './games/reflex.js';
import { MemoryMatrix } from './games/matrix.js';

// Application State
let activeGameInstance = null;
let currentView = 'games';
let sseSource = null;
let visitorInterval = null;
let autoScroll = true;
let currentClientPublicIp = null;

// Remote logging function
function logEvent(source, message, type = 'LOG') {
  fetch('/api/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-ip': currentClientPublicIp || ''
    },
    body: JSON.stringify({ source, message, type, clientIp: currentClientPublicIp })
  }).catch(() => {});
}

// Available Games Definition
const GAMES = {
  tictactoe: {
    title: 'TIC-TAC-TOE',
    desc: '3x3 minimalist strategy against CPU or 2P.',
    badge: 'LOGIC',
    factory: (el) => new TicTacToe(el, logEvent)
  },
  snake: {
    title: 'SNAKE MICRO',
    desc: '16x16 pixel grid. Move with WASD or Buttons.',
    badge: 'ARCADE',
    factory: (el) => new SnakeMicro(el, logEvent)
  },
  reflex: {
    title: 'REFLEX TEST',
    desc: 'Measure click response latency in milliseconds.',
    badge: 'SPEED',
    factory: (el) => new ReflexTester(el, logEvent)
  },
  matrix: {
    title: 'MEMORY MATRIX',
    desc: 'Memorize and replay the flashing tile pattern.',
    badge: 'MEMORY',
    factory: (el) => new MemoryMatrix(el, logEvent)
  }
};

// Switch Active View
function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewName}`);
  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  window.location.hash = viewName;

  if (viewName === 'admin') {
    initAdminPanel();
  } else {
    teardownAdminPanel();
  }
}

// Select & Launch Game
function selectGame(gameKey) {
  const gameDef = GAMES[gameKey];
  if (!gameDef) return;

  // Highlight card
  document.querySelectorAll('.game-card').forEach(card => {
    card.classList.toggle('active', card.dataset.game === gameKey);
  });

  // Destroy previous game
  if (activeGameInstance && typeof activeGameInstance.destroy === 'function') {
    activeGameInstance.destroy();
  }

  // Update Game Topbar
  document.getElementById('active-game-title').textContent = gameDef.title;
  const stage = document.getElementById('game-stage');
  stage.innerHTML = '';

  // Instantiate new game
  activeGameInstance = gameDef.factory(stage);
  logEvent('SYSTEM', `Loaded game: ${gameDef.title}`);
}

// --- Admin Panel Logic ---
function initAdminPanel() {
  fetchVisitors();
  if (!visitorInterval) {
    visitorInterval = setInterval(fetchVisitors, 5000);
  }

  if (!sseSource) {
    connectSse();
  }
}

function teardownAdminPanel() {
  if (visitorInterval) {
    clearInterval(visitorInterval);
    visitorInterval = null;
  }
  if (sseSource) {
    sseSource.close();
    sseSource = null;
  }
}

function connectSse() {
  sseSource = new EventSource('/api/admin/console-stream');

  sseSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      appendConsoleLog(data);
    } catch {
      // Ignored
    }
  };

  sseSource.onerror = () => {
    appendConsoleLog({
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: 'WARN',
      source: 'ADMIN',
      message: 'Console stream connection interrupted. Reconnecting...'
    });
  };
}

function appendConsoleLog(entry) {
  const container = document.getElementById('admin-console');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'console-entry';

  const typeClass = entry.type === 'ERROR' ? 'type-error' : '';
  row.innerHTML = `
    <span class="console-time">[${entry.time || ''}]</span>
    <span class="console-tag ${typeClass}">[${entry.source || 'SYS'}::${entry.type || 'LOG'}]</span>
    <span class="console-msg">${escapeHtml(entry.message || '')}</span>
  `;

  container.appendChild(row);

  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function fetchVisitors() {
  fetch('/api/admin/visitors')
    .then(res => res.json())
    .then(data => {
      document.getElementById('stat-unique-ips').textContent = data.totalUniqueIps || 0;
      document.getElementById('stat-total-hits').textContent = data.totalHits || 0;

      const tbody = document.getElementById('visitor-table-body');
      tbody.innerHTML = '';

      if (!data.recent || data.recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px;">NO RECORDED VISITS</td></tr>';
        return;
      }

      data.recent.forEach(v => {
        const tr = document.createElement('tr');
        const botBadge = v.isBotOrProxy
          ? '<span class="badge-bot">BOT/PROXY</span>'
          : '<span class="badge-clean">RESIDENTIAL</span>';

        tr.innerHTML = `
          <td><strong>${escapeHtml(v.ip)}</strong></td>
          <td>${escapeHtml(v.location || 'UNKNOWN')}</td>
          <td>${botBadge}</td>
          <td>${v.totalHits}</td>
          <td><button class="btn-inspect" data-ip="${escapeHtml(v.ip)}">EVENTS [${v.eventCount || 0}]</button></td>
        `;
        tbody.appendChild(tr);
      });

      // Bind inspect buttons
      tbody.querySelectorAll('.btn-inspect').forEach(btn => {
        btn.addEventListener('click', () => {
          inspectIp(btn.dataset.ip);
        });
      });
    })
    .catch(() => {});
}

// IP Inspection Handler
function inspectIp(ip) {
  const modal = document.getElementById('inspector-modal');
  document.getElementById('inspect-ip-addr').textContent = ip;
  document.getElementById('inspect-location').textContent = 'FETCHING...';
  document.getElementById('inspect-isp').textContent = 'FETCHING...';
  document.getElementById('inspect-risk').textContent = 'ANALYZING...';
  document.getElementById('inspect-stats').textContent = '...';
  document.getElementById('inspect-event-count').textContent = '...';

  const tbody = document.getElementById('inspect-events-body');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px;">LOADING TIMELINE...</td></tr>';
  modal.style.display = 'flex';

  fetch(`/api/admin/ip-details?ip=${encodeURIComponent(ip)}`)
    .then(res => res.json())
    .then(data => {
      const geo = data.geo || {};
      const stats = data.stats || {};
      const events = data.events || [];

      document.getElementById('inspect-location').textContent = `${geo.city || 'UNKNOWN'}, ${geo.region || ''} (${geo.country || 'UNKNOWN'})`;
      document.getElementById('inspect-isp').textContent = geo.isp || 'UNKNOWN';

      const riskEl = document.getElementById('inspect-risk');
      if (geo.isBotOrProxy) {
        riskEl.innerHTML = '<span class="badge-bot">ALERT: HOSTING / DATACENTER BOT PROXY</span>';
      } else {
        riskEl.innerHTML = '<span class="badge-clean">CLEAN CONSUMER / RESIDENTIAL IP</span>';
      }

      document.getElementById('inspect-stats').textContent = `${stats.count || 0} TOTAL HITS | FIRST: ${stats.firstSeen || 'N/A'}`;
      document.getElementById('inspect-event-count').textContent = `${events.length} EVENTS RECORDED`;

      tbody.innerHTML = '';
      if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px;">NO RECORDED EVENTS FOR THIS IP</td></tr>';
        return;
      }

      events.forEach(ev => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>[${escapeHtml(ev.time || '')}]</td>
          <td><strong>[${escapeHtml(ev.type || 'LOG')}]</strong></td>
          <td>${escapeHtml(ev.source || '')}</td>
          <td>${escapeHtml(ev.message || '')}</td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch(() => {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px;">ERROR RETRIEVING DATA</td></tr>';
    });
}

// Helper: Escape HTML & Truncate
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// DOM Setup
window.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs
  document.getElementById('nav-games').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('games');
  });
  document.getElementById('nav-admin').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('admin');
  });

  // Render game selector cards
  const grid = document.getElementById('game-selector-grid');
  Object.keys(GAMES).forEach(key => {
    const g = GAMES[key];
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.game = key;
    card.innerHTML = `
      <div>
        <div class="game-card-title">${g.title}</div>
        <div class="game-card-desc">${g.desc}</div>
      </div>
      <span class="game-card-badge">${g.badge}</span>
    `;
    card.addEventListener('click', () => selectGame(key));
    grid.appendChild(card);
  });

  // Admin Console actions
  document.getElementById('btn-clear-console').addEventListener('click', () => {
    fetch('/api/admin/clear-console', { method: 'POST' }).then(() => {
      document.getElementById('admin-console').innerHTML = '';
    });
  });

  document.getElementById('btn-send-log').addEventListener('click', () => {
    const input = document.getElementById('input-custom-log');
    const msg = input.value.trim();
    if (!msg) return;
    logEvent('ADMIN', msg);
    input.value = '';
  });

  document.getElementById('input-custom-log').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-send-log').click();
    }
  });

  document.getElementById('btn-autoscroll').addEventListener('click', (e) => {
    autoScroll = !autoScroll;
    e.target.textContent = autoScroll ? 'AUTOSCROLL: ON' : 'AUTOSCROLL: OFF';
  });

  // Admin IP actions
  document.getElementById('btn-refresh-ips').addEventListener('click', fetchVisitors);
  document.getElementById('btn-clear-ips').addEventListener('click', () => {
    fetch('/api/admin/clear-visitors', { method: 'POST' }).then(fetchVisitors);
  });

  // Close inspector modal
  document.getElementById('btn-close-inspector').addEventListener('click', () => {
    document.getElementById('inspector-modal').style.display = 'none';
  });

  // Hash-based routing check
  const initialHash = window.location.hash.replace('#', '') || 'games';
  switchView(initialHash);

  // Default initial game selection
  selectGame('tictactoe');

  // Verify and report public IP
  detectAndReportPublicIp();
});

// Detect and report client public IP
function detectAndReportPublicIp() {
  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => {
      if (data && data.ip) {
        currentClientPublicIp = data.ip;
        fetch('/api/visitor-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicIp: data.ip })
        }).then(() => {
          if (currentView === 'admin') fetchVisitors();
        }).catch(() => {});
      }
    })
    .catch(() => {});
}
