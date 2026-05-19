import type { CatalystItem } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

function CatalystBlock({ item }: { item: CatalystItem }) {
  return (
    <div className="mb-4 last:mb-0">
      {/* 子板块标题 chip - 红色实心 */}
      <div className="mb-2">
        <span
          className="text-[12px] px-2.5 py-1 rounded font-bold text-white"
          style={{ background: '#E54D42' }}
        >
          {item.sector}
        </span>
      </div>

      {/* 机构热评 / 市场热议 */}
      <div
        className="rounded-lg p-2.5 border-l-[3px]"
        style={{ background: '#FFFBEB', borderLeftColor: '#FBBF24' }}
      >
        <div className="flex items-center mb-1">
          <span className="text-[12px] mr-1">⚡</span>
          <span className="text-[12px] font-bold" style={{ color: '#B45309' }}>
            ▪ {item.title}
          </span>
        </div>
        <p className="text-[12.5px] leading-[1.75] text-[#5a4413]">{item.content}</p>
      </div>

      {/* 受益股 */}
      <div className="mt-2.5 space-y-2">
        {item.stocks.map((s) => (
          <div key={s.name} className="flex items-start">
            <span
              className="shrink-0 text-[11px] px-2 py-0.5 rounded border mr-2 mt-[1px]"
              style={{ color: '#E54D42', borderColor: '#F5C9C5', background: '#FFF5F4' }}
            >
              {s.name}
            </span>
            <p className="text-[12.5px] leading-[1.7] text-[#333] flex-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 利好催化卡片
 */
export default function CatalystCard() {
  const { catalyst: catalystList } = useBriefing();
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      <div className="flex items-center mb-3">
        <span className="text-[16px] mr-1.5">🔥</span>
        <span className="text-[15px] font-bold text-[#1f1f23]">利好催化</span>
      </div>

      {catalystList.map((item) => (
        <CatalystBlock key={item.sector} item={item} />
      ))}
    </div>
  );
}
