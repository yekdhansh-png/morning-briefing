import { useBriefing } from '../data/BriefingContext';
import { usePreferences } from '../data/usePreferences';

/**
 * 打新极简版
 * - 每只：名 + 代码 + 加自选 chip / 发行价 · 预估收益（金额）/ 看点
 * - 末尾红色"一键申购全部新股"按钮
 * - 去板块色 chip（创业板/科创板），换成"+ 加自选"操作 chip
 */
export default function IPOCard() {
  const { ipo } = useBriefing();
  const { addWatch } = usePreferences();

  if (!ipo || !ipo.list || ipo.list.length === 0) return null;

  const handleAdd = (name: string, code: string) => {
    // code 是不带前缀的，按 sh/sz 推断
    const prefix = code.startsWith('6') || code.startsWith('9') ? 'sh' : 'sz';
    addWatch({ name, code: `${prefix}${code}` });
  };

  return (
    <div className="mb-3">
      <div className="font-bold mb-2 text-[11.5px]" style={{ color: 'var(--ink-2)' }}>
        今日打新（{ipo.list.length} 只）
      </div>
      <div className="space-y-2">
        {ipo.list.map((p) => (
          <div
            key={p.code}
            className="rounded-lg p-2.5"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex items-center mb-1">
              <span className="font-bold text-[14px]">{p.name}</span>
              <span
                className="ml-1.5 text-[11.5px]"
                style={{ color: 'var(--ink-3)' }}
              >
                {p.code}
              </span>
              <button
                type="button"
                onClick={() => handleAdd(p.name, p.code)}
                className="ml-auto chip chip-info"
              >
                + 加自选
              </button>
            </div>
            <div
              className="flex items-center mb-1.5 gap-3 tabular-nums text-[11.5px]"
              style={{ color: 'var(--ink-2)' }}
            >
              <span>
                发行价 <b style={{ color: 'var(--ink)' }}>{p.price}</b>
              </span>
              <span style={{ color: 'var(--ink-3)' }}>·</span>
              <span>
                预估收益 <b style={{ color: 'var(--red)' }}>{p.estProfit}</b>
              </span>
            </div>
            <div
              className="text-[13px]"
              style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--red)' }}>
                看点·
              </span>
              {p.highlight}
            </div>
          </div>
        ))}
        {/* 一键申购 */}
        <button
          type="button"
          className="w-full mt-1 py-2.5 rounded-lg font-semibold flex items-center justify-center text-[13px]"
          style={{
            background: 'var(--red)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(229,77,66,0.20)',
          }}
        >
          一键申购全部新股（{ipo.list.length} 只）<span className="ml-1">→</span>
        </button>
      </div>
    </div>
  );
}
