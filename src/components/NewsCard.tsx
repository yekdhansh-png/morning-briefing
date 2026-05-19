import { useState } from 'react';
import type { NewsItem } from '../data/briefing';

interface NewsCardProps {
  data: NewsItem;
}

function StrengthBar({ level }: { level: '强' | '中' | '弱' }) {
  const map: Record<string, { dashes: string; text: string }> = {
    强: { dashes: '━━━━━━', text: '强' },
    中: { dashes: '━━━━ ⋯', text: '中' },
    弱: { dashes: '━━ ⋯ ⋯ ⋯', text: '弱' },
  };
  const { dashes, text } = map[level];
  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-[12px] tracking-tight" style={{ color: '#E54D42', letterSpacing: '-1px' }}>
        {dashes}
      </span>
      <span className="text-[13px] font-bold" style={{ color: '#E54D42' }}>
        {text}
      </span>
    </div>
  );
}

export default function NewsCard({ data }: NewsCardProps) {
  const { no, title, signal, signalDetails, affectedIcon, affectedName, affectedDirection, strength } =
    data;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      {/* 标题行：NO.XX 徽章 + 标题 */}
      <div className="flex items-start">
        <div
          className="shrink-0 mr-3 rounded-md text-center text-white pt-1 pb-1 px-1.5"
          style={{
            background: 'linear-gradient(180deg, #E54D42 0%, #B91C1C 100%)',
            minWidth: 36,
          }}
        >
          <div className="text-[8.5px] font-bold leading-none tracking-wider">NO.</div>
          <div className="text-[16px] font-extrabold leading-none mt-0.5">{no}</div>
        </div>
        <h3 className="text-[14.5px] font-bold leading-[1.6] text-[#1f1f23] flex-1">{title}</h3>
      </div>

      {/* 核心信号（可展开） */}
      <div
        className="mt-3 rounded-lg border-l-[3px]"
        style={{ background: '#FFF1F0', borderLeftColor: '#E54D42' }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-start p-2.5 text-left"
        >
          <span className="text-[12px] font-bold mr-1.5 mt-0.5" style={{ color: '#E54D42' }}>
            核心信号
          </span>
          <span className="text-[12px] mt-0.5 mr-1 text-[#E54D42]">·</span>
          <p className="flex-1 text-[12.5px] leading-[1.7] text-[#5a2a26]">{signal}</p>
          <span
            className="shrink-0 ml-2 mt-1 text-[12px] transition-transform"
            style={{ color: '#E54D42', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ⌄
          </span>
        </button>

        {expanded && signalDetails && (
          <div className="px-2.5 pb-2.5 pl-3 space-y-2">
            {signalDetails.map((d) => (
              <div key={d.tag} className="flex items-start">
                <span
                  className="shrink-0 text-[10.5px] px-1.5 py-0.5 rounded font-semibold mr-2 mt-[1px]"
                  style={{ background: '#FFD7D3', color: '#B91C1C' }}
                >
                  {d.tag}
                </span>
                <p className="flex-1 text-[12.5px] leading-[1.7] text-[#5a2a26]">{d.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 影响资产 / 影响强度 双栏 */}
      <div
        className="mt-3 rounded-lg flex items-center justify-between px-3 py-2.5"
        style={{ background: '#FAFAFC' }}
      >
        {/* 左：图标 + 板块 + 方向 */}
        <div className="flex items-center">
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-md mr-2"
            style={{ background: '#FFF1F0', width: 28, height: 28 }}
          >
            <span className="text-[14px]">{affectedIcon}</span>
          </span>
          <div>
            <div className="text-[11px] text-gray-500 leading-none">影响资产</div>
            <div className="text-[13.5px] font-bold mt-1 text-[#1f1f23]">{affectedName}</div>
          </div>
          <span
            className="ml-2.5 text-[11px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: '#FFF1F0', color: '#E54D42' }}
          >
            ↑ {affectedDirection}
          </span>
        </div>
        {/* 右：强度 */}
        <div className="text-right">
          <div className="text-[11px] text-gray-500 leading-none">影响强度</div>
          <div className="mt-1">
            <StrengthBar level={strength} />
          </div>
        </div>
      </div>
    </div>
  );
}
