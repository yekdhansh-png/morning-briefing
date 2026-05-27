import type { NewsItem } from '../data/briefing';

interface NewsCardProps {
  data: NewsItem;
}

/**
 * 重磅要闻卡片（减法版）
 * - 序号 01 + 标题同行
 * - 标签独立成行（板块·方向）
 * - 信号区灰底 + 右侧下拉三角（点击展开 signalDetails）
 * - signalDetails 已由 LLM 输出（{tag, content}[]），前端直接 map
 */
export default function NewsCard({ data }: NewsCardProps) {
  const { no, title, signal, signalDetails, affectedName, affectedDirection } = data;
  const directionLabel = affectedDirection === '正面' ? '利多' : '利空';
  const details = signalDetails && signalDetails.length > 0 ? signalDetails : [];

  return (
    <div className="px-3.5 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      {/* 行 1：序号 + 标题 */}
      <div className="flex items-start mb-1.5">
        <span
          className="font-bold tabular-nums mr-2 text-[13px]"
          style={{ lineHeight: 1.65, color: 'var(--red)' }}
        >
          {no}
        </span>
        <p
          className="font-medium m-0 flex-1 text-[13px]"
          style={{ lineHeight: 1.65 }}
        >
          {title}
        </p>
      </div>

      {/* 行 2：标签独立 */}
      <div className="mb-1.5" style={{ paddingLeft: 22 }}>
        <span className="chip chip-info">
          {affectedName} · {directionLabel}
        </span>
      </div>

      {/* 行 3：信号灰底 + 折叠（左缩进 22px，与标题正文对齐） */}
      <div style={{ paddingLeft: 22 }}>
        {details.length > 0 ? (
          <details className="fold">
            <summary
              className="cursor-pointer select-none rounded px-2.5 py-2 flex items-start text-[13px]"
              style={{ background: 'var(--surface)', lineHeight: 1.65, color: 'var(--ink-2)' }}
            >
              <div className="flex-1 min-w-0">
                <span className="font-semibold" style={{ color: 'var(--red)' }}>
                  信号·
                </span>
                {signal}
              </div>
              <span
                className="arrow shrink-0 ml-2 mt-[3px] text-[11px]"
                style={{ color: 'var(--ink-3)' }}
              >
                ▾
              </span>
            </summary>
            <div
              className="px-3 py-2.5 mt-1 rounded space-y-1 text-[12.5px]"
              style={{ background: 'var(--surface)', lineHeight: 1.75, color: 'var(--ink-2)' }}
            >
              {details.map((d, i) => (
                <div key={i}>
                  <b style={{ color: 'var(--ink)' }}>{d.tag}·</b>
                  {d.content}
                </div>
              ))}
            </div>
          </details>
        ) : (
          <div
            className="rounded px-2.5 py-2 text-[13px]"
            style={{ background: 'var(--surface)', lineHeight: 1.65, color: 'var(--ink-2)' }}
          >
            <span className="font-semibold" style={{ color: 'var(--red)' }}>
              信号·
            </span>
            {signal}
          </div>
        )}
      </div>
    </div>
  );
}
