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
  // 拼接 event + catalyst 显示完整利好；新版 prompt 直接把 event 写满 40-50 字时，
  // catalyst 可与 event 同内容或留空，避免重复
  const event = (item.event || '').trim();
  const catalyst = (item.catalyst || item.content || '').trim();
  let eventText = '';
  if (event && catalyst && catalyst !== event) {
    eventText = event.endsWith('。') ? event + catalyst : event + '。' + catalyst;
  } else {
    eventText = event || catalyst;
  }

  return (
    <div
      className="bg-white rounded-2xl mb-3 last:mb-0 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
    >
      {/* 顶部 meta：左板块 + 右标签（标签靠右） */}
      <div className="flex items-center px-3.5 pt-3">
        <span className="text-[10.5px] text-[#555] font-semibold">{concept}</span>
        <span className="ml-auto text-[10.5px] text-gray-400">{tag}</span>
      </div>

      {/* 利好事件：一段连贯文字，自然 wrap，无截断 */}
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
