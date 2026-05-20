import { useBriefing } from '../data/BriefingContext';

/**
 * 隔夜外盘黑色卡片
 * - 6 宫格：前 3 = 美股指数，后 3 = COMEX 金/银 + WTI 原油
 * - 全球资产 · 综合解读
 */
export default function GlobalMarketCard() {
  const { globalIndices, globalSummary } = useBriefing();

  return (
    <div
      className="rounded-2xl p-4 mb-3 text-white relative overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, #1a1a1f 0%, #25232a 60%, #1a1a1f 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      }}
    >
      {/* 装饰：右上角金色光晕 */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(212,175,55,0.18), transparent)',
        }}
      />

      {/* 标题 */}
      <div className="flex items-center mb-3.5 relative">
        <span className="text-[16px] mr-2">🌐</span>
        <span className="gold-text text-[15px] font-bold tracking-wide">
          隔夜外盘 · 全球资产表现
        </span>
      </div>

      {/* 6 宫格 */}
      <div className="grid grid-cols-3 gap-2">
        {globalIndices.map((g) => {
          const isUp = g.up;
          const color = isUp ? '#FF6B5E' : '#3DD598';
          const bg = isUp ? 'rgba(255, 107, 94, 0.10)' : 'rgba(61, 213, 152, 0.10)';
          return (
            <div
              key={g.name}
              className="rounded-xl px-2.5 py-2.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* 标的名 */}
              <div className="text-[11px] text-white/60 font-medium mb-1.5 truncate">
                {g.name}
              </div>
              {/* 数值 */}
              <div className="text-[15px] font-bold leading-none tracking-tight tabular-nums">
                {g.value}
              </div>
              {/* 涨跌幅胶囊 */}
              <div className="mt-1.5">
                <span
                  className="inline-flex items-center text-[11px] font-bold px-1.5 py-[2px] rounded leading-none tabular-nums"
                  style={{ background: bg, color }}
                >
                  {isUp ? '▲' : '▼'}&nbsp;{g.change.replace(/^[+\-]/, '')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 综合解读 */}
      <div
        className="mt-3.5 rounded-xl p-3 border-l-[3px]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderLeftColor: '#D4AF37',
        }}
      >
        <div className="flex items-center mb-1.5">
          <span className="text-[13px] mr-1.5">📌</span>
          <span className="gold-text text-[12.5px] font-bold tracking-wide">
            全球资产 · 综合解读
          </span>
        </div>
        <p className="text-[12.5px] leading-[1.8] text-white/82">{globalSummary}</p>
      </div>
    </div>
  );
}
