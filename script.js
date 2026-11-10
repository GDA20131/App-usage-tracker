const STORAGE_KEY = 'app-usage-tracker-v1';

const state = {
  apps: [],
  activeAppId: null,
};

const appForm = document.getElementById('appForm');
const appList = document.getElementById('appList');
const resetBtn = document.getElementById('resetBtn');
const appItemTemplate = document.getElementById('appItemTemplate');

function safeLoadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.apps = Array.isArray(parsed.apps) ? parsed.apps : [];
    state.activeAppId = parsed.activeAppId || null;
  } catch (error) {
    console.warn('Unable to parse saved tracker data.', error);
    state.apps = [];
    state.activeAppId = null;
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apps: state.apps,
      activeAppId: state.activeAppId,
    })
  );
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0m';

  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function createApp(name, category) {
  return {
    id: crypto.randomUUID(),
    name,
    category,
    totalMs: 0,
    active: false,
    sessionStart: null,
  };
}

function getActiveApp() {
  return state.apps.find((app) => app.id === state.activeAppId) || null;
}

function calculateLiveMs(app) {
  if (!app || !app.active || !app.sessionStart) return app.totalMs;
  return app.totalMs + (Date.now() - app.sessionStart);
}

function updateStats() {
  const appsCount = state.apps.length;
  const activeCount = state.apps.filter((app) => app.active).length;

  const totalMs = state.apps.reduce((sum, app) => sum + calculateLiveMs(app), 0);
  const todayMs = state.apps.reduce((sum, app) => {
    const appTotal = calculateLiveMs(app);
    return sum + (appTotal > 0 ? appTotal : 0);
  }, 0);

  document.getElementById('appsCount').textContent = String(appsCount);
  document.getElementById('activeCount').textContent = String(activeCount);
  document.getElementById('todayCount').textContent = formatDuration(todayMs);
  document.getElementById('totalCount').textContent = formatDuration(totalMs);
}

function renderApps() {
  appList.innerHTML = '';

  if (state.apps.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No apps tracked yet. Add one to start logging usage.';
    appList.appendChild(empty);
    return;
  }

  state.apps
    .slice()
    .sort((a, b) => calculateLiveMs(b) - calculateLiveMs(a))
    .forEach((app) => {
      const fragment = appItemTemplate.content.cloneNode(true);
      const item = fragment.querySelector('.app-item');
      const badge = fragment.querySelector('.badge');
      const name = fragment.querySelector('.app-name');
      const category = fragment.querySelector('.app-category');
      const currentTime = fragment.querySelector('.current-time');
      const totalTime = fragment.querySelector('.total-time');
      const toggleBtn = fragment.querySelector('.toggle-btn');
      const deleteBtn = fragment.querySelector('.delete-btn');

      const liveMs = calculateLiveMs(app);
      const currentMs = app.active ? Date.now() - app.sessionStart : 0;

      name.textContent = app.name;
      category.textContent = app.category;
      currentTime.textContent = app.active ? formatDuration(currentMs) : '0m';
      totalTime.textContent = formatDuration(liveMs);
      badge.style.background = `linear-gradient(135deg, ${getColorForApp(app.name)}, #38bdf8)`;

      toggleBtn.textContent = app.active ? 'Stop' : 'Start';
      toggleBtn.classList.toggle('active', app.active);

      toggleBtn.addEventListener('click', () => {
        if (app.active) {
          stopApp(app.id);
        } else {
          startApp(app.id);
        }
      });

      deleteBtn.addEventListener('click', () => {
        state.apps = state.apps.filter((entry) => entry.id !== app.id);
        if (state.activeAppId === app.id) {
          state.activeAppId = null;
        }
        saveState();
        render();
      });

      appList.appendChild(fragment);
    });
}

function getColorForApp(name) {
  const palette = ['#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#fb7185'];
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function startApp(appId) {
  const target = state.apps.find((app) => app.id === appId);
  if (!target) return;

  if (state.activeAppId && state.activeAppId !== appId) {
    const current = state.apps.find((app) => app.id === state.activeAppId);
    if (current && current.active) {
      current.totalMs += Date.now() - current.sessionStart;
      current.active = false;
      current.sessionStart = null;
    }
  }

  target.active = true;
  target.sessionStart = Date.now();
  state.activeAppId = appId;
  saveState();
  render();
}

function stopApp(appId) {
  const target = state.apps.find((app) => app.id === appId);
  if (!target || !target.active || !target.sessionStart) return;

  target.totalMs += Date.now() - target.sessionStart;
  target.active = false;
  target.sessionStart = null;
  state.activeAppId = null;
  saveState();
  render();
}

function render() {
  updateStats();
  renderApps();
}

appForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(appForm);
  const name = String(formData.get('appName') || '').trim();
  const category = String(formData.get('appCategory') || 'Other');

  if (!name) return;

  state.apps.push(createApp(name, category));
  appForm.reset();
  saveState();
  render();
});

resetBtn.addEventListener('click', () => {
  const confirmed = window.confirm('Reset all tracked app usage?');
  if (!confirmed) return;

  state.apps = [];
  state.activeAppId = null;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

safeLoadState();
render();

setInterval(() => {
  if (state.activeAppId) {
    render();
  }
}, 1000);

window.addEventListener('beforeunload', () => {
  const liveApp = getActiveApp();
  if (liveApp && liveApp.active && liveApp.sessionStart) {
    liveApp.totalMs += Date.now() - liveApp.sessionStart;
    liveApp.active = false;
    liveApp.sessionStart = null;
    state.activeAppId = null;
    saveState();
  }
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const liveApp = getActiveApp();
    if (liveApp && liveApp.active && liveApp.sessionStart) {
      liveApp.totalMs += Date.now() - liveApp.sessionStart;
      liveApp.active = false;
      liveApp.sessionStart = null;
      state.activeAppId = null;
      saveState();
      render();
    }
  }
});
