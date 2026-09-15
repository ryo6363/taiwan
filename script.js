const CHECKLIST_STORAGE_KEY = 'taiwan-trip-checklist';
const THEME_STORAGE_KEY = 'taiwan-trip-theme';
const TWAC_DISMISS_KEY = 'taiwan-trip-twac-dismissed';

const DEPARTURE = new Date(2026, 8, 18, 21, 5); // 2026-09-18 21:05
const ARRIVAL_DATE = new Date(2026, 8, 18); // 2026-09-18 00:00 (local)
const TRIP_END_EXCLUSIVE = new Date(2026, 8, 22); // 2026-09-22 00:00 (day after last day)
const TWAC_OPEN = new Date(ARRIVAL_DATE.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before arrival

function loadChecklistState() {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('チェックリストの読み込みに失敗しました', err);
    return {};
  }
}

function saveChecklistState(state) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('チェックリストの保存に失敗しました', err);
  }
}

function setupChecklists() {
  const state = loadChecklistState();
  const inputs = [...document.querySelectorAll('.check-input[data-id]')];

  inputs.forEach((input) => {
    const id = input.dataset.id;
    const isChecked = Boolean(state[id]);
    input.checked = isChecked;
    input.closest('.check-item')?.classList.toggle('is-done', isChecked);

    input.addEventListener('change', () => {
      state[input.dataset.id] = input.checked;
      saveChecklistState(state);
      input.closest('.check-item')?.classList.toggle('is-done', input.checked);
      const section = input.closest('.checklist')?.dataset.section;
      if (section) {
        updateProgress(section);
      }
    });
  });

  const sections = [...document.querySelectorAll('.checklist[data-section]')].map((el) => el.dataset.section);
  [...new Set(sections)].forEach(updateProgress);
}

function updateProgress(section) {
  const items = [...document.querySelectorAll(`.checklist[data-section="${section}"] .check-input`)];
  if (items.length === 0) {
    return;
  }
  const done = items.filter((input) => input.checked).length;
  const label = document.querySelector(`[data-progress-for="${section}"]`);
  if (label) {
    label.textContent = `${done} / ${items.length} 完了`;
  }
}

function setupThemeToggle() {
  const button = document.getElementById('theme-toggle');
  const root = document.documentElement;

  function apply(theme) {
    if (theme) {
      root.dataset.theme = theme;
    } else {
      delete root.dataset.theme;
    }
    const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    button.textContent = isDark ? '☀️' : '🌙';
  }

  let saved = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (err) {
    saved = null;
  }
  apply(saved);

  button.addEventListener('click', () => {
    const currentlyDark = root.dataset.theme === 'dark' ||
      (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = currentlyDark ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (err) {
      console.error('テーマの保存に失敗しました', err);
    }
  });
}

function setupTabNav() {
  const chips = [...document.querySelectorAll('.tab-chip')];
  const sections = chips
    .map((chip) => document.getElementById(chip.dataset.target))
    .filter(Boolean);

  if (sections.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const chip = chips.find((c) => c.dataset.target === entry.target.id);
        if (!chip) {
          return;
        }
        if (entry.isIntersecting) {
          chips.forEach((c) => c.classList.remove('is-active'));
          chip.classList.add('is-active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

function isSameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function setupTodayBadges() {
  const now = new Date();
  document.querySelectorAll('.day-card[data-date]').forEach((card) => {
    const [y, m, d] = card.dataset.date.split('-').map(Number);
    const cardDate = new Date(y, m - 1, d);
    const badge = card.querySelector('.today-badge');
    if (badge && isSameCalendarDay(now, cardDate)) {
      badge.hidden = false;
    }
  });
}

function setupHeroStatus() {
  const el = document.getElementById('hero-status');
  if (!el) {
    return;
  }
  const now = new Date();

  if (now < ARRIVAL_DATE) {
    const diffMs = ARRIVAL_DATE.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
    el.textContent = days === 0 ? '🎉 本日出発！' : `🗓️ 出発まであと ${days} 日`;
  } else if (now < TRIP_END_EXCLUSIVE) {
    const dayNum = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - ARRIVAL_DATE.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    el.textContent = `✈️ 旅行中 — DAY ${dayNum}`;
  } else {
    el.textContent = '🏠 旅行終了、お疲れ様でした！';
  }
}

function setupMapLinks() {
  document.querySelectorAll('[data-map-query]').forEach((el) => {
    const query = el.dataset.mapQuery;
    if (!query) {
      return;
    }
    el.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  });
}

function setupDayTabs() {
  const tabs = [...document.querySelectorAll('.day-tab[data-day-target]')];
  const cards = [...document.querySelectorAll('.day-card[id]')];
  if (tabs.length === 0 || cards.length === 0) {
    return;
  }

  function showDay(targetId) {
    cards.forEach((card) => {
      card.hidden = card.id !== targetId;
    });
    tabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.dayTarget === targetId);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showDay(tab.dataset.dayTarget));
  });

  const now = new Date();
  const todayCard = cards.find((card) => {
    const [y, m, d] = card.dataset.date.split('-').map(Number);
    return isSameCalendarDay(now, new Date(y, m - 1, d));
  });
  showDay(todayCard ? todayCard.id : cards[0].id);
}

function setupTwacBanner() {
  const banner = document.getElementById('twac-banner');
  const text = document.getElementById('twac-banner-text');
  const dismissButton = document.getElementById('twac-dismiss');
  if (!banner || !text || !dismissButton) {
    return;
  }

  let dismissed = false;
  try {
    dismissed = localStorage.getItem(TWAC_DISMISS_KEY) === '1';
  } catch (err) {
    dismissed = false;
  }

  const now = new Date();
  const isOpen = now >= TWAC_OPEN && now < DEPARTURE;

  if (isOpen && !dismissed) {
    text.textContent = '✅ 台湾入国カード(TWAC)のオンライン事前登録が可能です(到着日の3日前から)。まだの方はお早めに登録しましょう。';
    banner.hidden = false;
  }

  dismissButton.addEventListener('click', () => {
    banner.hidden = true;
    try {
      localStorage.setItem(TWAC_DISMISS_KEY, '1');
    } catch (err) {
      console.error('バナー状態の保存に失敗しました', err);
    }
  });
}

setupChecklists();
setupThemeToggle();
setupTabNav();
setupTodayBadges();
setupHeroStatus();
setupTwacBanner();
setupMapLinks();
setupDayTabs();
