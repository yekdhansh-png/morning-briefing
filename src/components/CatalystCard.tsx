import type { CatalystItem, CatalystStock } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

const LEVEL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  S: { bg: '#FEE2E2', color: '#B91C1C', label: 'S级' },
  A: { bg: '#FEF3C7', color: '#92400E', label: 'A级' },
  B: { bg: '#DBEAFE', color: '#1E40AF', label: 'B级' },
  C: { bg: '#E0E7FF', color: '#3730A3', label: 'C级' },
  D: { bg: '#F3F4F6', color: '#374151', label: 'D级' },
};

function StockItem({ stock }: { stock: CatalystStock }) {
  const reason = stock.reason || (stock as unknown as { desc?: string }).desc || '';
  return (
    <div
      className="flex items-start gap-2.5 py-2 border-b last:border-b-0 last:pb-0"
      style={{ borderColor: '#F2F2F2' }}
    >
      {/* 左：name / code / role 竖排 */}
      <div className="shrink-0" style={{ minWidth: 76 }}>
        <div className="text-[13.5px] font-bold text-[#1f1f23] leading-tight">{stock.name}</div>
        {stock.code && (
          <div className="text-[10.5px] text-gray-400 mt-0.5 leading-none">{stock.code}</div>
        )}
        {stock.role && (
          <span
            className="inline-block text-[10px] mt-1 px-1.5 py-[1px] rounded font-semibold leading-none"
            style={{ color: '#E54D42', background: '#FFF5F4' }}
          >
            {stock.role}
          </span>
        )}
      </div>
      {/* 右：reason */}
      <p className="flex-1 text-[12px] leading-[1.7] text-[#555] pt-[1px]">{reason}</p>
    </div>
  );
}

function CatalystBlock({ item }: { item: CatalystItem }) {
  const concept = item.concept || item.sector || '';
  const tag = item.tag || item.title || '机构热评';
  const event = item.event || '';
  const catalyst = item.catalyst || item.content || '';
  const level = item.event_level;
  const levelStyle = level ? LEVEL_BADGE[level] : null;

  return (
    <div
      className="bg-white rounded-2xl mb-3 last:mb-0 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
    >
      {/* 顶部 meta：弱化的板块 + 标签 + 等级 */}
      <div className="flex items-center gap-1.5 px-3.5 pt-3">
        <span className="text-[10.5px] text-[#555] font-semibold">{concept}</span>
        <span className="w-[3px] h-[3px] rounded-full bg-gray-300" />
        <span className="text-[10.5px] text-gray-400">{tag}</span>
        {levelStyle && (
          <span
            className="ml-auto text-[10px] px-1.5 py-[2px] rounded font-bold leading-none"
            style={{ background: levelStyle.bg, color: levelStyle.color }}
          >
            {levelStyle.label}
          </span>
        )}
      </div>

      {/* 事件 + 催化摘要：一段连贯文字，统一字号字重，最多 2 行 */}
      {(event || catalyst) && (
        <p
          className="px-3.5 pt-1.5 pb-3.5 text-[13px] leading-[1.6] text-[#333] border-b border-dashed"
          style={{
            borderColor: '#EFEFEF',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {event}
          {event && catalyst ? '。' : ''}
          {catalyst}
        </p>
      )}

      {/* 受益股 */}
      <div className="px-3.5 py-2.5">
        {item.stocks.map((s) => (
          <StockItem key={s.code || s.name} stock={s} />
        ))}
      </div>
    </div>
  );
}

/**
 * 利好催化卡片（V2 极简版：事件优先 + 弱化标签 + 股票分块）
 */
export default function CatalystCard() {
  const { catalyst: catalystList } = useBriefing();
  if (!catalystList || catalystList.length === 0) return null;
  return (
    <div>
      {catalystList.map((item, idx) => (
        <CatalystBlock key={item.concept || item.sector || idx} item={item} />
      ))}
    </div>
  );
}
