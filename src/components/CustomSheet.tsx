import { useState } from 'react';
import { useSheet } from '../data/BriefingContext';
import { usePreferences } from '../data/usePreferences';
import { useStockSearch } from '../data/useStockSearch';
import type { SectionOrderItem } from '../data/usePreferences';

/**
 * 早报小助手 - 半屏交互弹层
 * 两个 Tab：自选股管理 / 板块顺序调整
 */
export default function CustomSheet() {
  const { open, setOpen } = useSheet();
  const close = () => setOpen(false);
  const [tab, setTab] = useState<'watch' | 'order'>('watch');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/45" onClick={close} />

      <div
        className="relative mx-auto rounded-t-2xl w-full overflow-hidden"
        style={{
          maxWidth: 480,
          maxHeight: '85vh',
          background: 'linear-gradient(180deg, #1f1d2c 0%, #2a2535 100%)',
          animation: 'sheet-slide-up 240ms ease-out',
        }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex flex-col text-white" style={{ maxHeight: 'calc(85vh - 16px)' }}>
          {/* 头部 */}
          <div className="flex items-center px-4 pt-2 pb-3">
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[16px] mr-3"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #E54D42 100%)' }}
            >
              ✦
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold">定制我的专属早报</div>
              <div className="flex items-center text-[11px] text-white/55 mt-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: '#1FAE6F' }}
                />
                设置即时生效
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 text-[14px]"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              ✕
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="flex px-4 pb-3 gap-2">
            <TabBtn active={tab === 'watch'} onClick={() => setTab('watch')}>
              ⭐ 自选股
            </TabBtn>
            <TabBtn active={tab === 'order'} onClick={() => setTab('order')}>
              🧩 板块顺序
            </TabBtn>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {tab === 'watch' ? <WatchPanel /> : <OrderPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition"
      style={{
        background: active ? 'rgba(229, 77, 66, 0.20)' : 'rgba(255,255,255,0.04)',
        color: active ? '#FF6B5E' : 'rgba(255,255,255,0.65)',
        border: active ? '1px solid rgba(229, 77, 66, 0.5)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {children}
    </button>
  );
}

/* -------------------- 自选股 Tab -------------------- */

function WatchPanel() {
  const { prefs, addWatch, removeWatch } = usePreferences();
  const [query, setQuery] = useState('');
  const { results, loading } = useStockSearch(query);

  const handleAdd = (code: string, name: string) => {
    addWatch({ code, name });
    setQuery('');
  };

  return (
    <div>
      {/* 搜索输入 */}
      <div className="mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索股票名 / 代码 (如 茅台 / 600519)"
          className="w-full bg-white/5 outline-none text-[13.5px] text-white/95 placeholder:text-white/35 rounded-lg px-3.5 py-2.5"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* 搜索结果 */}
      {query.trim() && (
        <div className="mb-4">
          {loading ? (
            <div className="text-center text-white/40 text-[12px] py-4">搜索中…</div>
          ) : results.length === 0 ? (
            <div className="text-center text-white/40 text-[12px] py-4">没找到匹配的股票</div>
          ) : (
            <div className="space-y-1 max-h-[240px] overflow-y-auto">
              {results.map((s) => {
                const exists = prefs.watchlist.some((w) => w.code === s.code);
                return (
                  <button
                    key={s.code}
                    type="button"
                    disabled={exists}
                    onClick={() => handleAdd(s.code, s.name)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div>
                      <div className="text-[13.5px] font-semibold text-white/95">{s.name}</div>
                      <div className="text-[11px] text-white/40">{s.code.toUpperCase()}</div>
                    </div>
                    <span
                      className="text-[11.5px] px-2 py-1 rounded font-semibold"
                      style={{
                        color: exists ? '#666' : '#FF6B5E',
                        background: exists ? 'rgba(255,255,255,0.04)' : 'rgba(229, 77, 66, 0.18)',
                      }}
                    >
                      {exists ? '已添加' : '+ 添加'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 已选 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-white/55">
          已选 <span className="text-white/95 font-semibold">{prefs.watchlist.length}</span> 只
        </span>
        {prefs.watchlist.length > 0 && (
          <span className="text-[10.5px] text-white/35">点 ✕ 移除</span>
        )}
      </div>

      {prefs.watchlist.length === 0 ? (
        <div
          className="rounded-lg p-4 text-center text-[12px] text-white/40"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          还没有自选股，搜索股票名添加 ↑
        </div>
      ) : (
        <div className="space-y-1">
          {prefs.watchlist.map((w) => (
            <div
              key={w.code}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div>
                <div className="text-[13.5px] font-semibold text-white/95">{w.name}</div>
                <div className="text-[11px] text-white/40">{w.code.toUpperCase()}</div>
              </div>
              <button
                type="button"
                onClick={() => removeWatch(w.code)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 text-[12px]"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- 板块顺序 Tab -------------------- */

const SECTION_LABELS: Record<SectionOrderItem['id'], { label: string; icon: string; desc: string }> = {
  stock: { label: '自选股', icon: '⭐', desc: '我的关注股票实时行情' },
  news: { label: '重磅要闻', icon: '📰', desc: '隔夜外盘 + TOP 3 要闻' },
  opportunity: { label: '今日机会', icon: '🔥', desc: '利好催化 + 打新日历' },
};

function OrderPanel() {
  const { prefs, moveSection, toggleSectionVisible, resetSectionOrder } = usePreferences();

  return (
    <div>
      <p className="text-[12px] text-white/55 mb-3 leading-[1.7]">
        通过 ↑ ↓ 调整板块显示顺序，点击 👁 可以隐藏整个板块。
      </p>

      <div className="space-y-2">
        {prefs.sectionOrder.map((sec, idx) => {
          const meta = SECTION_LABELS[sec.id];
          const isFirst = idx === 0;
          const isLast = idx === prefs.sectionOrder.length - 1;
          return (
            <div
              key={sec.id}
              className="flex items-center rounded-lg px-3 py-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                opacity: sec.visible ? 1 : 0.55,
              }}
            >
              <span
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[16px] mr-2.5"
                style={{ background: 'rgba(245, 158, 11, 0.15)' }}
              >
                {meta.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-white/95">
                  {meta.label}
                </div>
                <div className="text-[11px] text-white/45 mt-0.5">{meta.desc}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconBtn
                  disabled={isFirst}
                  onClick={() => moveSection(sec.id, 'up')}
                  label="↑"
                />
                <IconBtn
                  disabled={isLast}
                  onClick={() => moveSection(sec.id, 'down')}
                  label="↓"
                />
                <IconBtn
                  active={!sec.visible}
                  onClick={() => toggleSectionVisible(sec.id)}
                  label={sec.visible ? '👁' : '🚫'}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={resetSectionOrder}
        className="w-full mt-4 py-2.5 rounded-lg text-[12.5px] font-semibold text-white/70"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        恢复默认顺序
      </button>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  disabled,
  active,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-md text-[12px] disabled:opacity-25"
      style={{
        background: active ? 'rgba(229, 77, 66, 0.20)' : 'rgba(255,255,255,0.06)',
        color: active ? '#FF6B5E' : 'rgba(255,255,255,0.85)',
      }}
    >
      {label}
    </button>
  );
}
