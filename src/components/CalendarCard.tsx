import { useBriefing } from '../data/BriefingContext';

/**
 * 财经日历（极简 mock）
 * - 上限 2 条
 * - 每条：时间 + 事件 + 可选 chip（关注 / 我的自选）
 */
export default function CalendarCard() {
  const { calendarMock } = useBriefing();
  const items = (calendarMock || []).slice(0, 2);
  if (items.length === 0) return null;

  return (
    <div>
      <div className="font-bold mb-2 text-[11.5px]" style={{ color: 'var(--ink-2)' }}>
        今日日历
      </div>
      <ul className="space-y-1.5">
        {items.map((c, idx) => (
          <li key={idx} className="flex items-start text-[13px]" style={{ lineHeight: 1.7 }}>
            <span
              className="tabular-nums mr-2 mt-[1px] font-bold text-[11.5px]"
              style={{ color: 'var(--red)' }}
            >
              {c.time}
            </span>
            <span className="flex-1" style={{ color: 'var(--ink)' }}>
              {c.highlight ? (
                // 自选高亮：股票名加粗
                <span
                  dangerouslySetInnerHTML={{
                    __html: c.event.replace(
                      /([\u4e00-\u9fa5]+)(?=\s*披露|\s*发布|\s*公告)/,
                      '<b>$1</b>',
                    ),
                  }}
                />
              ) : (
                c.event
              )}
            </span>
            {c.tag && (
              <span className={`chip ${c.tag === '我的自选' ? 'chip-gold' : 'chip-info'} ml-1`}>
                {c.tag}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
