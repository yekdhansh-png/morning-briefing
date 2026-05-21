import { useCallback, useEffect, useState } from 'react';

/* 用户定制偏好（存 localStorage） */

export interface WatchItem {
  name: string;
  code: string; // 带 sh/sz/bj 前缀，如 sz300308
}

export interface SectionOrderItem {
  id: 'stock' | 'news' | 'opportunity'; // 自选股 / 重磅要闻 / 今日机会
  visible: boolean;
}

export interface Preferences {
  watchlist: WatchItem[];
  sectionOrder: SectionOrderItem[];
}

const DEFAULT_PREFERENCES: Preferences = {
  watchlist: [],
  sectionOrder: [
    { id: 'stock', visible: true },
    { id: 'news', visible: true },
    { id: 'opportunity', visible: true },
  ],
};

const KEY = 'briefing-preferences';

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
      sectionOrder:
        Array.isArray(parsed.sectionOrder) && parsed.sectionOrder.length === 3
          ? parsed.sectionOrder
          : DEFAULT_PREFERENCES.sectionOrder,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(prefs: Preferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// 简单的全局 broadcast：用 storage 事件 + 自定义事件
const EVENT = 'briefing-preferences-changed';

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => load());

  useEffect(() => {
    const handler = () => setPrefs(load());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const update = useCallback((next: Preferences) => {
    save(next);
    setPrefs(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const addWatch = useCallback(
    (item: WatchItem) => {
      const cur = load();
      if (cur.watchlist.some((w) => w.code === item.code)) return;
      const next = { ...cur, watchlist: [...cur.watchlist, item] };
      update(next);
    },
    [update],
  );

  const removeWatch = useCallback(
    (code: string) => {
      const cur = load();
      const next = { ...cur, watchlist: cur.watchlist.filter((w) => w.code !== code) };
      update(next);
    },
    [update],
  );

  const moveSection = useCallback(
    (id: SectionOrderItem['id'], dir: 'up' | 'down') => {
      const cur = load();
      const idx = cur.sectionOrder.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= cur.sectionOrder.length) return;
      const arr = [...cur.sectionOrder];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      update({ ...cur, sectionOrder: arr });
    },
    [update],
  );

  const toggleSectionVisible = useCallback(
    (id: SectionOrderItem['id']) => {
      const cur = load();
      const arr = cur.sectionOrder.map((s) =>
        s.id === id ? { ...s, visible: !s.visible } : s,
      );
      update({ ...cur, sectionOrder: arr });
    },
    [update],
  );

  const resetSectionOrder = useCallback(() => {
    const cur = load();
    update({ ...cur, sectionOrder: DEFAULT_PREFERENCES.sectionOrder });
  }, [update]);

  return {
    prefs,
    addWatch,
    removeWatch,
    moveSection,
    toggleSectionVisible,
    resetSectionOrder,
  };
}
