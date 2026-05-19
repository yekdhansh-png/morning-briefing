import { useBriefing } from '../data/BriefingContext';

/**
 * 隔夜外盘黑色卡片
 * - 6 宫格指数
 * - 全球资产 · 综合解读
 */
export default function GlobalMarketCard() {
  const { globalIndices, globalSummary } = useBriefing();
  return (
    <div
      className="rounded-2xl p-4 shadow-card text-white mb-3"
      style={{
        background:
          'linear-gradient(160deg, #1a1a1f 0%, #25232a 60%, #1a1a1f 100%)',
      }}
    >
      {/* 标题 */}
      <div className="flex items-center mb-3">
        <span className="text-[16px] mr-1.5">🌐</span>
        <span className="gold-text text-[15px] font-bold tracking-wide">
          隔夜外盘 · 全球资产表现
        </span>
      </div>

      {/* 6 宫格 */}
      <div className="grid grid-cols-3 gap-2">
        {globalIndices.map((g) => (
          <div
            key={g.name}
            className="rounded-lg px-2.5 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] text-white/55 mb-1">{g.name}</div>
            <div className="text-[14px] font-semibold leading-tight">{g.value}</div>
            <div
              className="text-[11.5px] mt-0.5 font-medium"
              style={{ color: g.up ? '#E54D42' : '#1FAE6F' }}
            >
              {g.change}
            </div>
          </div>
        ))}
      </div>

      {/* 综合解读 */}
      <div className="mt-4">
        <div className="flex items-center mb-1.5">
          <span className="text-[14px] mr-1">📌</span>
          <span className="gold-text text-[13px] font-bold">全球资产 · 综合解读</span>
        </div>
        <p className="text-[12.5px] leading-[1.75] text-white/80">{globalSummary}</p>
      </div>
    </div>
  );
}
