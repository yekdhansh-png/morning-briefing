import { useEffect, useRef, useState } from 'react';
import { useSheet } from '../data/BriefingContext';
import { usePreferences } from '../data/usePreferences';
import { useStockSearch } from '../data/useStockSearch';
import type { SectionOrderItem } from '../data/usePreferences';

/**
 * 早报小助手 - 半屏交互弹层
 *
 * 三个视图：
 *   - home (默认)：欢迎语 + 早报方案卡 + 快捷定制按钮
 *   - watch     ：自选股管理
 *   - order     ：板块顺序调整
 *
 * 底部输入框：常驻显示，输入自然语言 → 简单规则意图识别 → 执行
 */

type View = 'home' | 'watch' | 'order';

export default function CustomSheet() {
  const { open, setOpen } = useSheet();
  const [view, setView] = useState<View>('home');
  const [hint, setHint] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  if (!open) return null;
  const close = () => {
    setOpen(false);
    setView('home');
    setHint(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/45" onClick={close} />

      <div
        className="relative mx-auto rounded-t-2xl w-full overflow-hidden"
        style={{
          maxWidth: 480,
          maxHeight: '88vh',
          background: 'linear-gradient(180deg, #1f1d2c 0%, #2a2535 100%)',
          animation: 'sheet-slide-up 240ms ease-out',
        }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex flex-col text-white" style={{ maxHeight: 'calc(88vh - 16px)' }}>
          {/* 头部 */}
          <div className="flex items-center px-4 pt-2 pb-3">
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[16px] mr-3"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #E54D42 100%)' }}
            >
              ✦
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold">早报小助手</div>
              <div className="flex items-center text-[11px] text-white/55 mt-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: '#1FAE6F' }}
                />
                在线 · 为你定制专属早报
              </div>
            </div>
            {view !== 'home' && (
              <button
                type="button"
                onClick={() => setView('home')}
                className="mr-2 px-2.5 py-1 text-[11.5px] text-white/70 rounded"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                ← 返回
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 text-[14px]"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              ✕
            </button>
          </div>

          {/* 提示信息 */}
          {hint && (
            <div className="mx-4 mb-2 rounded-lg px-3 py-2 text-[12px]" style={{
              background: hint.type === 'ok' ? 'rgba(31,174,111,0.15)' : 'rgba(229,77,66,0.15)',
              color: hint.type === 'ok' ? '#5EE0A8' : '#FF8A80',
            }}>
              {hint.text}
            </div>
          )}

          {/* 主内容（滚动区） */}
          <div className="flex-1 overflow-y-auto px-4">
            {view === 'home' && <HomeView setView={setView} />}
            {view === 'watch' && <WatchPanel />}
            {view === 'order' && <OrderPanel />}
          </div>

          {/* 底部输入框（始终显示） */}
          <ChatInputBar setView={setView} setHint={setHint} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Home 视图：欢迎语 + 早报方案卡 + 快捷定制按钮
   ============================================================ */

function HomeView({ setView }: { setView: (v: View) => void }) {
  const { prefs } = usePreferences();

  const watchSummary = prefs.watchlist.length === 0
    ? '尚未添加'
    : prefs.watchlist.slice(0, 3).map((w) => w.name).join(' · ') +
      (prefs.watchlist.length > 3 ? ` 等 ${prefs.watchlist.length} 只` : '');

  const orderSummary = prefs.sectionOrder
    .filter((s) => s.visible)
    .map((s) => ({ stock: '自选股', news: '重磅要闻', opportunity: '今日机会' }[s.id]))
    .join(' → ');

  return (
    <div className="pb-3">
      {/* AI 欢迎消息 */}
      <div className="flex items-start mb-4">
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] mr-2"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #E54D42 100%)' }}
        >
          ✦
        </div>
        <div
          className="flex-1 rounded-2xl rounded-tl-md px-3.5 py-3 text-[13.5px] leading-[1.78]"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <p className="text-white/95">
            你好 <span>👋</span> 我是早报小助手。
          </p>
          <p className="text-white/85 mt-1.5">
            我可以帮你{' '}
            <span className="font-semibold" style={{ color: '#F59E0B' }}>
              管理自选股、调整板块顺序
            </span>
            ，让每天的早报更懂你。
          </p>
          <p className="text-white/85 mt-1.5">
            试试下面的快捷指令，或在底部输入你的需求 <span>✨</span>
          </p>
        </div>
      </div>

      {/* 我的早报方案 */}
      <div
        className="rounded-xl p-3.5 mb-4"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px dashed rgba(245, 158, 11, 0.35)',
        }}
      >
        <div className="flex items-center mb-3">
          <span className="text-[13px] mr-1.5" style={{ color: '#F59E0B' }}>✦</span>
          <span className="text-[13px] font-bold" style={{ color: '#F59E0B' }}>我的早报方案</span>
        </div>
        <PlanRow icon="⭐" label="自选股" value={watchSummary} />
        <PlanRow icon="🧩" label="板块顺序" value={orderSummary || '已隐藏全部'} />
      </div>

      {/* 快捷定制 */}
      <div className="mb-3">
        <div className="flex items-center mb-2">
          <span className="text-[12px] mr-1" style={{ color: '#F59E0B' }}>⚡</span>
          <span className="text-[12.5px] font-semibold text-white/80">快捷定制</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <QuickBtn icon="⭐" label="管理自选股" onClick={() => setView('watch')} />
          <QuickBtn icon="🧩" label="调整板块顺序" onClick={() => setView('order')} />
        </div>
      </div>
    </div>
  );
}

function PlanRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start mb-2 last:mb-0">
      <span
        className="shrink-0 w-5 h-5 flex items-center justify-center text-[11px] mr-2 rounded mt-0.5"
        style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
      >
        {icon}
      </span>
      <span className="text-[12px] text-white/55 w-[68px] shrink-0 mt-0.5">{label}</span>
      <span className="text-[12.5px] font-semibold text-white/95 flex-1 leading-[1.5]">{value}</span>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center rounded-lg py-2.5 text-[12.5px] text-white/90"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="mr-1.5 text-[12px]" style={{ color: '#F59E0B' }}>{icon}</span>
      {label}
    </button>
  );
}

/* ============================================================
   Watch 视图：自选股管理
   ============================================================ */

function WatchPanel() {
  const { prefs, addWatch, removeWatch } = usePreferences();
  const [query, setQuery] = useState('');
  const { results, loading } = useStockSearch(query);

  return (
    <div className="pb-3">
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

      {query.trim() && (
        <div className="mb-4">
          {loading ? (
            <div className="text-center text-white/40 text-[12px] py-4">搜索中…</div>
          ) : results.length === 0 ? (
            <div className="text-center text-white/40 text-[12px] py-4">没找到匹配的股票</div>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {results.map((s) => {
                const exists = prefs.watchlist.some((w) => w.code === s.code);
                return (
                  <button
                    key={s.code}
                    type="button"
                    disabled={exists}
                    onClick={() => { addWatch({ code: s.code, name: s.name }); setQuery(''); }}
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

      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-white/55">
          已选 <span className="text-white/95 font-semibold">{prefs.watchlist.length}</span> 只
        </span>
        {prefs.watchlist.length > 0 && (
          <span className="text-[10.5px] text-white/35">点 ✕ 移除</span>
        )}
      </div>

      {prefs.watchlist.length === 0 ? (
        <div className="rounded-lg p-4 text-center text-[12px] text-white/40" style={{ background: 'rgba(255,255,255,0.04)' }}>
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

/* ============================================================
   Order 视图：板块顺序
   ============================================================ */

const SECTION_LABELS: Record<SectionOrderItem['id'], { label: string; icon: string; desc: string }> = {
  stock: { label: '自选股', icon: '⭐', desc: '我的关注股票实时行情' },
  news: { label: '重磅要闻', icon: '📰', desc: '隔夜外盘 + TOP 3 要闻' },
  opportunity: { label: '今日机会', icon: '🔥', desc: '利好催化 + 打新日历' },
};

function OrderPanel() {
  const { prefs, moveSection, toggleSectionVisible, resetSectionOrder } = usePreferences();
  return (
    <div className="pb-3">
      <p className="text-[12px] text-white/55 mb-3 leading-[1.7]">
        通过 ↑ ↓ 调整板块顺序，点击 👁 可以隐藏整个板块。
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
              style={{ background: 'rgba(255,255,255,0.04)', opacity: sec.visible ? 1 : 0.55 }}
            >
              <span
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[16px] mr-2.5"
                style={{ background: 'rgba(245, 158, 11, 0.15)' }}
              >{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-white/95">{meta.label}</div>
                <div className="text-[11px] text-white/45 mt-0.5">{meta.desc}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconBtn disabled={isFirst} onClick={() => moveSection(sec.id, 'up')} label="↑" />
                <IconBtn disabled={isLast} onClick={() => moveSection(sec.id, 'down')} label="↓" />
                <IconBtn active={!sec.visible} onClick={() => toggleSectionVisible(sec.id)} label={sec.visible ? '👁' : '🚫'} />
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
      >恢复默认顺序</button>
    </div>
  );
}

function IconBtn({ onClick, label, disabled, active }: {
  onClick: () => void; label: string; disabled?: boolean; active?: boolean;
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
    >{label}</button>
  );
}

/* ============================================================
   底部输入框：常驻 + 简单意图识别
   ============================================================ */

function ChatInputBar({
  setView,
  setHint,
}: {
  setView: (v: View) => void;
  setHint: (h: { text: string; type: 'ok' | 'err' } | null) => void;
}) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { prefs, addWatch, removeWatch, moveSection, toggleSectionVisible } = usePreferences();

  // 静态导入 stock list 用于意图识别中的名字匹配（已被 useStockSearch 缓存）
  const handleSubmit = async () => {
    const q = text.trim();
    if (!q) return;
    setText('');
    const result = await routeIntent(q, {
      watchlist: prefs.watchlist,
      addWatch,
      removeWatch,
      moveSection,
      toggleSectionVisible,
    });
    if (result.viewTo) setView(result.viewTo);
    setHint({ text: result.message, type: result.ok ? 'ok' : 'err' });
    // 3 秒后清掉提示
    setTimeout(() => setHint(null), 3000);
    inputRef.current?.blur();
  };

  return (
    <div className="px-4 pt-2 pb-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div
        className="flex items-center rounded-full pl-3.5 pr-1.5 py-1.5"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="告诉我你想看什么，比如：加自选股 茅台"
          className="flex-1 bg-transparent outline-none text-[13px] text-white/95 placeholder:text-white/35"
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{ background: 'linear-gradient(180deg, #E54D42 0%, #B91C1C 100%)' }}
        >
          <span className="text-[14px] font-bold">↑</span>
        </button>
      </div>
      <div className="text-center text-[11px] text-white/40 mt-2">
        AI 生成内容仅供参考 · 不构成投资建议
      </div>
    </div>
  );
}

/* ============================================================
   简单意图识别（前端规则）
   ============================================================ */

interface IntentCtx {
  watchlist: { name: string; code: string }[];
  addWatch: (w: { name: string; code: string }) => void;
  removeWatch: (code: string) => void;
  moveSection: (id: SectionOrderItem['id'], dir: 'up' | 'down') => void;
  toggleSectionVisible: (id: SectionOrderItem['id']) => void;
}

interface IntentResult {
  ok: boolean;
  message: string;
  viewTo?: View;
}

async function routeIntent(input: string, ctx: IntentCtx): Promise<IntentResult> {
  const q = input.trim();

  // 意图 1：删除自选股 — "删 茅台" / "移除 寒武纪" / "去掉 茅台"
  const removeMatch = q.match(/^(?:删[除掉]?|移除|去掉|不看|删自选)\s*(.+)$/);
  if (removeMatch) {
    const target = removeMatch[1].trim();
    const hit = ctx.watchlist.find(
      (w) => w.name === target || w.name.includes(target) || w.code === target || w.code.endsWith(target),
    );
    if (hit) {
      ctx.removeWatch(hit.code);
      return { ok: true, message: `已移除自选股：${hit.name}`, viewTo: 'watch' };
    }
    return { ok: false, message: `自选股里没找到「${target}」` };
  }

  // 意图 2：添加自选股 — "加 X" / "加自选 X" / "加自选股 X" / "添加 X" / "关注 X"
  const addMatch = q.match(/^(?:加|添加|新增|关注|订阅)(?:自选股?|股票)?\s*(.+)$/);
  if (addMatch) {
    const target = addMatch[1].trim();
    const list = await loadStockList();
    const hit = findStock(list, target);
    if (hit) {
      const dup = ctx.watchlist.some((w) => w.code === hit.code);
      if (dup) return { ok: false, message: `「${hit.name}」已经在自选股里了` };
      ctx.addWatch({ code: hit.code, name: hit.name });
      return { ok: true, message: `已添加自选股：${hit.name} (${hit.code.toUpperCase()})`, viewTo: 'watch' };
    }
    return { ok: false, message: `没找到股票「${target}」，可在「自选股」面板搜索` };
  }

  // 意图 3：板块顺序 — "把要闻放最上" / "把自选股放第一" / "重磅要闻置顶" 等
  if (q.match(/(置顶|放最上|放第一|提到最上|提到第一)/)) {
    const target = matchSection(q);
    if (target) {
      // 一直 up 到顶（最多 2 次）
      ctx.moveSection(target, 'up');
      ctx.moveSection(target, 'up');
      return { ok: true, message: `已将「${labelOf(target)}」置顶`, viewTo: 'order' };
    }
    return { ok: false, message: '不知道你想置顶哪个板块（自选股 / 重磅要闻 / 今日机会）' };
  }

  if (q.match(/(隐藏|不显示|不看)/) && q.match(/(自选股|要闻|机会|外盘|打新|催化)/)) {
    const target = matchSection(q);
    if (target) {
      ctx.toggleSectionVisible(target);
      return { ok: true, message: `已切换「${labelOf(target)}」显示状态`, viewTo: 'order' };
    }
  }

  // 兜底
  return {
    ok: false,
    message: '暂时只能理解：加 XX / 删 XX / 把 XX 置顶 / 隐藏 XX。点上方按钮也可以手动操作 ✨',
  };
}

/* helper */

let stockListCache: { code: string; name: string }[] | null = null;
async function loadStockList(): Promise<{ code: string; name: string }[]> {
  if (stockListCache) return stockListCache;
  const base = import.meta.env.BASE_URL || '/';
  const res = await fetch(`${base}stock-list.json`);
  stockListCache = (await res.json()) as { code: string; name: string }[];
  return stockListCache;
}

function findStock(list: { code: string; name: string }[], query: string) {
  const q = query.toLowerCase();
  // 1. 代码精确
  const exact = list.find((s) => s.code.toLowerCase() === q || s.code.slice(2) === q);
  if (exact) return exact;
  // 2. 名字精确
  const exactName = list.find((s) => s.name === query);
  if (exactName) return exactName;
  // 3. 名字开头
  const prefix = list.find((s) => s.name.startsWith(query));
  if (prefix) return prefix;
  // 4. 名字包含
  return list.find((s) => s.name.includes(query));
}

function matchSection(text: string): SectionOrderItem['id'] | null {
  if (text.match(/(自选股|自选|关注)/)) return 'stock';
  if (text.match(/(要闻|新闻|外盘)/)) return 'news';
  if (text.match(/(机会|利好|催化|打新)/)) return 'opportunity';
  return null;
}

function labelOf(id: SectionOrderItem['id']): string {
  return { stock: '自选股', news: '重磅要闻', opportunity: '今日机会' }[id];
}
