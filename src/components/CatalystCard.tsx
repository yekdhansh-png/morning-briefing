import type { CatalystItem } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

function CatalystBlock({ item }: { item: CatalystItem }) {
  const concept = item.concept || item.sector || '';
  const tag = item.tag || item.title || '机构热评';
  const path = item.catalystPath || '';
  const catalyst = item.catalyst || item.content || '';

  return (
    <div className="mb-4 last:mb-0">
      {/* 顶部行：左概念 chip + 右标签 */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="inline-flex items-center text-[12.5px] px-2.5 h-[24px] rounded-md font-bold text-white"
          style={{ background: '#E54D42' }}
        >
          {concept}
        </span>
        <span
          className="inline-flex items-center text-[12px] font-bold"
          style={{ color: '#E54D42' }}
        >
          <span className="mr-1">⚡</span>
          {tag}
        </span>
      </div>

      {/* 浅粉卡：catalyst 主文 + 可选催化路径 */}
      <div
        className="rounded-lg px-3 py-2.5"
        style={{ background: '#FFF5F4' }}
      >
        {catalyst && (
          <p className="text-[12.5px] leading-[1.75] text-[#3a3a3a]">{catalyst}</p>
        )}
        {path && (
          <p
            className="text-[11.5px] leading-[1.6] mt-1.5"
            style={{ color: '#9A5A56' }}
          >
            <span className="font-semibold">催化路径 · </span>
            {path}
          </p>
        )}
      </div>

      {/* 受益股 */}
      <div className="mt-2.5 space-y-2">
        {item.stocks.map((s) => {
          const reason = s.reason || (s as unknown as { desc?: string }).desc || '';
          return (
            <div key={s.name} className="flex items-start">
              <span
                className="shrink-0 inline-flex items-center text-[11.5px] px-2 h-[22px] rounded border mr-2 font-semibold"
                style={{ color: '#E54D42', borderColor: '#F5C9C5', background: '#FFFFFF' }}
              >
                {s.name}
              </span>
              <p className="flex-1 text-[12.5px] leading-[1.7] text-[#333] pt-[2px]">{reason}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 利好催化卡片
 */
export default function CatalystCard() {
  const { catalyst: catalystList } = useBriefing();
  if (!catalystList || catalystList.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      <div className="flex items-center mb-3">
        <span className="text-[16px] mr-1.5">🔥</span>
        <span className="text-[15px] font-bold text-[#1f1f23]">利好催化</span>
      </div>

      {catalystList.map((item, idx) => (
        <CatalystBlock key={item.concept || item.sector || idx} item={item} />
      ))}
    </div>
  );
}
