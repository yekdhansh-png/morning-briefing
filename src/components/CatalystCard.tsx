import type { CatalystItem } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

const LEVEL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  S: { bg: '#FEE2E2', color: '#B91C1C', label: 'S 级' },
  A: { bg: '#FEF3C7', color: '#92400E', label: 'A 级' },
  B: { bg: '#DBEAFE', color: '#1E40AF', label: 'B 级' },
  C: { bg: '#E0E7FF', color: '#3730A3', label: 'C 级' },
  D: { bg: '#F3F4F6', color: '#374151', label: 'D 级' },
};

function CatalystBlock({ item }: { item: CatalystItem }) {
  const concept = item.concept || item.sector || '';
  const tag = item.tag || item.title || '机构热评';
  const event = item.event || '';
  const path = item.catalystPath || '';
  const catalyst = item.catalyst || item.content || '';
  const level = item.event_level;
  const levelStyle = level ? LEVEL_BADGE[level] : null;

  return (
    <div className="mb-4 last:mb-0">
      {/* 顶部：概念 chip + 等级 chip */}
      <div className="flex items-center mb-2">
        <span
          className="text-[12px] px-2.5 py-1 rounded font-bold text-white"
          style={{ background: '#E54D42' }}
        >
          {concept}
        </span>
        {levelStyle && (
          <span
            className="ml-1.5 text-[10.5px] px-1.5 py-1 rounded font-bold leading-none"
            style={{ background: levelStyle.bg, color: levelStyle.color }}
          >
            {levelStyle.label}
          </span>
        )}
      </div>

      {/* 黄色卡：标签 + 事件 + 催化路径 */}
      <div
        className="rounded-lg p-2.5 border-l-[3px]"
        style={{ background: '#FFFBEB', borderLeftColor: '#FBBF24' }}
      >
        <div className="flex items-start mb-1">
          <span
            className="shrink-0 text-[10.5px] px-1.5 py-0.5 rounded font-bold mr-1.5 leading-none mt-[2px]"
            style={{ background: '#FBBF24', color: '#fff' }}
          >
            {tag}
          </span>
          {event && (
            <span className="text-[12.5px] font-bold leading-[1.5]" style={{ color: '#5a4413' }}>
              {event}
            </span>
          )}
        </div>
        {path && (
          <div className="text-[11.5px] leading-[1.6] mb-1" style={{ color: '#92400E' }}>
            <span className="font-bold mr-1">催化路径</span>·
            <span className="ml-1">{path}</span>
          </div>
        )}
        {catalyst && (
          <p className="text-[12px] leading-[1.7] text-[#5a4413]">{catalyst}</p>
        )}
      </div>

      {/* 受益股 */}
      <div className="mt-2.5 space-y-2">
        {item.stocks.map((s) => {
          const subtitle = [
            s.role,
            s.industry,
            s.ret_20d != null ? `20日 ${s.ret_20d >= 0 ? '+' : ''}${s.ret_20d.toFixed(1)}%` : null,
            s.main_5d_yi != null ? `主力5日 ${s.main_5d_yi >= 0 ? '+' : ''}${s.main_5d_yi.toFixed(1)}亿` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          const reason = s.reason || (s as unknown as { desc?: string }).desc || '';
          return (
            <div key={s.name} className="flex items-start">
              <span
                className="shrink-0 text-[11px] px-2 py-0.5 rounded border mr-2 mt-[2px]"
                style={{ color: '#E54D42', borderColor: '#F5C9C5', background: '#FFF5F4' }}
              >
                {s.name}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] leading-[1.65] text-[#333]">{reason}</p>
                {subtitle && (
                  <p className="text-[10.5px] leading-[1.4] text-gray-500 mt-0.5">{subtitle}</p>
                )}
              </div>
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
