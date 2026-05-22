/**
 * 投资日历卡片（写死版本）
 * 未来接 jin10 财经日历 / 国内宏观日历
 */

interface CalendarEvent {
  time: string;       // "今日 09:30" / "今日 22:00"
  region: '中' | '美' | '欧' | '日';
  title: string;
  importance: 'high' | 'mid' | 'low';
}

const MOCK_EVENTS: CalendarEvent[] = [
  { time: '09:30', region: '中', title: '央行公开市场操作', importance: 'mid' },
  { time: '10:00', region: '中', title: '1 年期 LPR 公布', importance: 'high' },
  { time: '20:30', region: '美', title: '初请失业金人数', importance: 'mid' },
  { time: '22:00', region: '美', title: '美联储官员讲话（鲍威尔）', importance: 'high' },
];

const REGION_STYLE: Record<CalendarEvent['region'], { bg: string; color: string }> = {
  中: { bg: '#FEF2F2', color: '#E54D42' },
  美: { bg: '#EFF6FF', color: '#3B82F6' },
  欧: { bg: '#FEF3C7', color: '#92400E' },
  日: { bg: '#F3F4F6', color: '#4B5563' },
};

const IMPORTANCE_DOTS: Record<CalendarEvent['importance'], number> = {
  high: 3,
  mid: 2,
  low: 1,
};

function ImportanceDots({ level }: { level: CalendarEvent['importance'] }) {
  const n = IMPORTANCE_DOTS[level];
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 5,
            height: 5,
            background: i < n ? '#E54D42' : '#E5E7EB',
          }}
        />
      ))}
    </span>
  );
}

export default function CalendarCard() {
  if (!MOCK_EVENTS.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-[16px] mr-1.5">📅</span>
          <span className="text-[15px] font-bold text-[#1f1f23]">投资日历</span>
        </div>
        <span className="text-[11px] text-gray-400">今日 · 4 个事件</span>
      </div>

      <div className="space-y-2.5">
        {MOCK_EVENTS.map((ev, i) => {
          const rs = REGION_STYLE[ev.region];
          return (
            <div key={i} className="flex items-center">
              {/* 时间 */}
              <div className="shrink-0 w-[52px] text-[12.5px] font-semibold text-[#1f1f23] tabular-nums">
                {ev.time}
              </div>
              {/* 国家标 */}
              <span
                className="shrink-0 text-[10.5px] px-1.5 py-[2px] rounded font-bold leading-none mr-2.5"
                style={{ background: rs.bg, color: rs.color }}
              >
                {ev.region}
              </span>
              {/* 事件 */}
              <div className="flex-1 min-w-0 text-[12.5px] text-[#333] truncate">{ev.title}</div>
              {/* 重要性 */}
              <div className="shrink-0 ml-2">
                <ImportanceDots level={ev.importance} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
        数据待接入 · 即将支持真实日历
      </div>
    </div>
  );
}
