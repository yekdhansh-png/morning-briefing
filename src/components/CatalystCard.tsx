import type { CatalystItem, CatalystStock } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

function StockItem({ stock }: { stock: CatalystStock }) {
  const reason = stock.reason || (stock as unknown as { desc?: string }).desc || '';
  return (
    <div
      className="flex items-start gap-2.5 py-2 border-b last:border-b-0 last:pb-0"
      style={{ borderColor: '#F2F2F2' }}
    >
      {/* 左：name / code 竖排（去掉龙头/弹性 chip） */}
      <div className="shrink-0" style={{ minWidth: 76 }}>
        <div className="text-[13.5px] font-bold text-[#1f1f23] leading-tight">{stock.name}</div>
        {stock.code && (
          <div className="text-[10.5px] text-gray-400 mt-1 leading-none">{stock.code}</div>
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
  // event 字段就是一句话讲清楚的利好（prompt 控制 40-50 字 = 2 行）
  // 旧数据兼容：event 缺失时用 catalyst 兜底
  const eventText = item.event || item.catalyst || item.content || '';

  return (
    <div
      className="bg-white rounded-2xl mb-3 last:mb-0 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
    >
      {/* 顶部 meta：弱化的板块 + 标签（去掉等级 chip） */}
      <div className="flex items-center gap-1.5 px-3.5 pt-3">
        <span className="text-[10.5px] text-[#555] font-semibold">{concept}</span>
        <span className="w-[3px] h-[3px] rounded-full bg-gray-300" />
        <span className="text-[10.5px] text-gray-400">{tag}</span>
      </div>

      {/* 利好事件：一句话（prompt 已控制 40-50 字 ≈ 2 行），自然 wrap，无截断 */}
      {eventText && (
        <p
          className="px-3.5 pt-1.5 pb-3.5 m-0 text-[13px] leading-[1.6] text-[#333] border-b border-dashed"
          style={{ borderColor: '#EFEFEF' }}
        >
          {eventText}
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
 * 利好催化卡片（精简版：弱化标签 + 一句话利好 + 受益股）
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
