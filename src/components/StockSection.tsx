import { useEffect } from 'react';
import { usePreferences } from '../data/usePreferences';
import { useQuote, fetchQuotes } from '../data/useQuote';
import type { WatchItem } from '../data/usePreferences';

/**
 * 自选股板块（用户在 CustomSheet 里管理 watchlist）
 * - 每只股票拉新浪 hq.sinajs.cn 实时行情（JSONP）
 * - 5 分钟缓存
 * - 用户没设置自选股时显示空状态引导
 */
export default function StockSection() {
  const { prefs } = usePreferences();
  const watchlist = prefs.watchlist;

  // 一次性拉所有 watchlist 行情（避免每个 useQuote 各自发请求）
  useEffect(() => {
    if (watchlist.length > 0) {
      fetchQuotes(watchlist.map((w) => w.code));
    }
  }, [watchlist]);

  if (watchlist.length === 0) {
    return (
      <div
        className="bg-white rounded-2xl shadow-card p-5 mb-3 text-center"
      >
        <div className="text-[28px] mb-1">⭐</div>
        <div className="text-[13.5px] font-bold text-[#1f1f23] mb-1">还没有自选股</div>
        <div className="text-[12px] text-gray-500 leading-[1.7]">
          点击底部「定制我的专属早报」，<br />
          按名字搜索添加你关注的股票
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-3 mb-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[13px] font-bold text-[#1f1f23]">
          我的自选 <span className="text-gray-400 text-[12px] font-normal">({watchlist.length})</span>
        </span>
        <span className="text-[10.5px] text-gray-400">实时 · 来自新浪</span>
      </div>
      <div className="space-y-1">
        {watchlist.map((w) => (
          <StockRow key={w.code} item={w} />
        ))}
      </div>
    </div>
  );
}

function StockRow({ item }: { item: WatchItem }) {
  const q = useQuote(item.code);

  if (!q) {
    return (
      <div className="flex items-center justify-between rounded-lg px-2.5 py-2.5 bg-[#FAFAFA]">
        <div>
          <div className="text-[14px] font-bold text-[#1f1f23]">{item.name}</div>
          <div className="text-[11px] text-gray-400">{item.code.toUpperCase()}</div>
        </div>
        <div className="text-[12px] text-gray-400">— —</div>
      </div>
    );
  }

  const color = q.isUp ? '#E54D42' : '#1FAE6F';
  const arrow = q.isUp ? '▲' : '▼';
  const sign = q.isUp ? '+' : '';

  return (
    <div className="flex items-center justify-between rounded-lg px-2.5 py-2 bg-[#FAFAFA]">
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-[#1f1f23] truncate">{item.name}</div>
        <div className="text-[11px] text-gray-400">{item.code.toUpperCase()}</div>
      </div>
      <div className="text-right">
        <div className="text-[15.5px] font-bold tabular-nums leading-none" style={{ color }}>
          {q.last.toFixed(q.last < 10 ? 3 : 2)}
        </div>
        <div className="text-[11.5px] mt-1 font-semibold tabular-nums" style={{ color }}>
          {arrow} {sign}{q.pct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
