import type { CatalystItem, CatalystStock } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

function StockItem({ stock }: { stock: CatalystStock }) {
  const reason = stock.reason || (stock as unknown as { desc?: string }).desc || '';
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span
        className="chip chip-outline shrink-0 justify-center"
        style={{ minWidth: 56, height: 22 }}
      >
        {stock.name}
      </span>
      <p
        className="flex-1 m-0 text-[12.5px]"
        style={{ lineHeight: '22px', color: 'var(--ink-2)' }}
      >
        {reason}
      </p>
    </div>
  );
}

function CatalystBlock({ item }: { item: CatalystItem }) {
  const concept = item.concept || item.sector || '';
  const tag = item.tag || item.title || '机构热评';
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
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* 顶部：板块 chip + ⚡ 标签 */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
        <span className="chip chip-solid">{concept}</span>
        <span
          className="font-medium text-[11.5px]"
          style={{ color: 'var(--red)' }}
        >
          {tag}
        </span>
      </div>

      {/* 利好事件：左红竖线 + 卡片底色（去米色框，少一层） */}
      {eventText && (
        <div
          className="px-3.5 mb-3"
          style={{
            marginLeft: 14,
            paddingLeft: 12,
            borderLeft: `2px solid var(--red)`,
          }}
        >
          <p
            className="m-0 font-medium text-[13px]"
            style={{ lineHeight: 1.7, color: 'var(--ink)' }}
          >
            {eventText}
          </p>
        </div>
      )}

      {/* 受益股 */}
      <div
        className="px-3.5 pb-3"
        style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}
      >
        {item.stocks.map((s) => (
          <StockItem key={s.code || s.name} stock={s} />
        ))}
      </div>
    </div>
  );
}

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
