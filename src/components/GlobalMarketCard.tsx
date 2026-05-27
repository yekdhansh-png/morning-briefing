import { useBriefing } from '../data/BriefingContext';

/**
 * 全球资产 6 宫格 + 解读
 * - 白底卡片 + 浅灰 6 宫格
 * - 涨跌色 A 股惯例（涨红 / 跌绿）
 * - 6 宫格下方保留 globalSummary 解读（去掉"对 A 股映射"小标题，保留正文）
 */
export default function GlobalMarketCard() {
  const { globalIndices, globalSummary } = useBriefing();

  return (
    <div
      className="bg-white rounded-2xl p-3 mb-3"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <div className="grid grid-cols-3 gap-2">
        {globalIndices.map((g) => {
          const color = g.up ? 'var(--red)' : 'var(--green)';
          const sign = g.change.startsWith('-') || g.change.startsWith('+') ? '' : g.up ? '+' : '';
          return (
            <div
              key={g.name}
              className="rounded-lg px-2.5 py-2 text-center"
              style={{ background: 'var(--surface)' }}
            >
              <div className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                {g.name}
              </div>
              <div className="font-bold tabular-nums text-[14px] mt-0.5">
                {g.value}
              </div>
              <div
                className="font-semibold text-[11.5px] tabular-nums mt-0.5"
                style={{ color }}
              >
                {sign}
                {g.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* 解读：纯灰底正文，无小标题 */}
      {globalSummary && (
        <div
          className="rounded-lg px-3 py-2.5 mt-3 text-[12.5px]"
          style={{ background: 'var(--surface)', lineHeight: 1.65, color: 'var(--ink)' }}
        >
          {globalSummary}
        </div>
      )}
    </div>
  );
}
