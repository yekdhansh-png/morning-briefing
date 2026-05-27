import { useState, useEffect } from 'react';
import { useBriefing } from '../data/BriefingContext';

/**
 * 自选动态板块（mock）
 * - 默认 3 只股票（贵州茅台/宁德时代/中际旭创）
 * - 每只展示：股票名 + 代码 + 重要提醒 chip + 隔夜新闻 + 问元宝 chip
 * - 点击问元宝弹出半屏 Q&A（打字机效果）
 */
export default function WatchSection() {
  const { watchMock } = useBriefing();
  const [active, setActive] = useState<{ name: string; q: string; a: string } | null>(null);

  if (!watchMock || watchMock.length === 0) return null;

  return (
    <>
      <div className="bg-white rounded-2xl p-3 mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="space-y-3">
          {watchMock.map((s) => (
            <div
              key={s.code}
              className="rounded-xl p-3"
              style={{ background: 'var(--surface)' }}
            >
              {/* 名称 + 代码 */}
              <div className="flex items-center mb-2">
                <span className="font-bold text-[14px]" style={{ color: 'var(--ink)' }}>
                  {s.name}
                </span>
                <span className="ml-1.5 text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                  {s.code}
                </span>
              </div>

              {/* 隔夜新闻 */}
              <div
                className="pb-2 text-[13px]"
                style={{ lineHeight: 1.7, color: 'var(--ink-2)' }}
              >
                <span className="chip chip-info mr-1.5 align-middle">{s.newsTag}</span>
                {s.news}
              </div>

              {/* 问元宝 chip */}
              <button
                type="button"
                onClick={() => setActive({ name: s.name, q: s.question, a: s.answer })}
                className="w-full flex items-center text-left rounded-lg px-3 py-2 mt-1"
                style={{
                  background: '#fff',
                  border: '1px solid var(--line)',
                }}
              >
                <span
                  className="font-semibold mr-2 text-[11px]"
                  style={{ color: 'var(--red)' }}
                >
                  问元宝
                </span>
                <span
                  className="flex-1 truncate text-[13px]"
                  style={{ color: 'var(--ink)' }}
                >
                  {s.question}
                </span>
                <span className="text-[13px]" style={{ color: 'var(--red)' }}>
                  ›
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <ElkSheet
          name={active.name}
          question={active.q}
          answer={active.a}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}

/**
 * 问元宝半屏对话
 */
function ElkSheet({
  name,
  question,
  answer,
  onClose,
}: {
  name: string;
  question: string;
  answer: string;
  onClose: () => void;
}) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setShown('');
    setDone(false);
    const t = setInterval(() => {
      i += 4;
      if (i >= answer.length) {
        setShown(answer);
        setDone(true);
        clearInterval(t);
      } else {
        setShown(answer.slice(0, i));
      }
    }, 30);
    return () => clearInterval(t);
  }, [answer]);

  return (
    <>
      <div className="elk-mask" onClick={onClose} />
      <div className="elk-sheet">
        <div className="flex items-center mb-3">
          <span className="font-bold flex-1 text-[14px]">{name} · 问元宝</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[18px]"
            style={{ color: 'var(--ink-3)' }}
          >
            ×
          </button>
        </div>
        {/* 用户问题 */}
        <div className="flex justify-end mb-3">
          <div
            className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] text-[13px]"
            style={{ background: 'var(--red-soft)', color: 'var(--red)', lineHeight: 1.6 }}
          >
            {question}
          </div>
        </div>
        {/* 元宝回答 */}
        <div className="flex justify-start">
          <div className="flex items-start gap-2 max-w-[90%]">
            <div
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px]"
              style={{ background: 'var(--gold)', color: '#fff' }}
            >
              宝
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-3 py-2 text-[13px]"
              style={{ background: 'var(--surface)', lineHeight: 1.7 }}
            >
              {shown}
              {!done && <span className="typing-cursor">▋</span>}
            </div>
          </div>
        </div>
        <div className="text-center mt-4 text-[10px]" style={{ color: 'var(--ink-3)' }}>
          AI 解读，不构成投资建议
        </div>
      </div>
    </>
  );
}
