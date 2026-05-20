import { useState } from 'react';
import type { NewsItem } from '../data/briefing';

interface NewsCardProps {
  data: NewsItem;
}

function StrengthBar({ level }: { level: '强' | '中' | '弱' }) {
  // 用真·虚线 border 替代 unicode 字符画
  // 强 = 整条实+虚混合粗虚线；中 = 中等虚线；弱 = 稀疏虚线
  const map: Record<string, { width: number; opacity: number }> = {
    强: { width: 56, opacity: 1 },
    中: { width: 44, opacity: 0.7 },
    弱: { width: 32, opacity: 0.45 },
  };
  const { width, opacity } = map[level];
  return (
    <div className="flex items-center justify-end gap-1.5">
      <div
        style={{
          width,
          height: 0,
          borderTop: '2px dashed #E54D42',
          opacity,
        }}
      />
      <span className="text-[13px] font-bold leading-none" style={{ color: '#E54D42' }}>
        {level}
      </span>
    </div>
  );
}

function ChevronDown({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#E54D42"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.2s ease',
        transform: rotated ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function NewsCard({ data }: NewsCardProps) {
  const { no, title, signal, signalDetails, affectedIcon, affectedName, affectedDirection, strength } =
    data;
  const [expanded, setExpanded] = useState(false);

  const directionPositive = affectedDirection === '正面';

  return (
    <div
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ boxShadow: '0 2px 10px rgba(20, 24, 40, 0.04), 0 1px 2px rgba(20, 24, 40, 0.04)' }}
    >
      {/* 标题行：NO.XX 徽章 + 标题 */}
      <div className="flex items-start">
        <div
          className="shrink-0 mr-3 rounded-lg text-center text-white py-1.5 px-1"
          style={{
            background: 'linear-gradient(180deg, #F05548 0%, #E54D42 100%)',
            minWidth: 42,
            boxShadow: '0 2px 6px rgba(229, 77, 66, 0.25)',
          }}
        >
          <div className="text-[9px] font-bold leading-none tracking-[0.08em]">NO.</div>
          <div className="text-[20px] font-extrabold leading-none mt-1">{no}</div>
        </div>
        <h3 className="text-[15.5px] font-bold leading-[1.55] text-[#1f1f23] flex-1 pt-0.5">
          {title}
        </h3>
      </div>

      {/* 核心信号（可展开） */}
      <div
        className="mt-3 rounded-xl border-l-[3px] overflow-hidden"
        style={{ background: '#FFF1F0', borderLeftColor: '#E54D42' }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-start p-3 text-left"
        >
          <span className="text-[12.5px] font-bold mr-1.5 mt-[1px]" style={{ color: '#E54D42' }}>
            核心信号
          </span>
          <span className="text-[12px] mt-[2px] mr-1.5" style={{ color: '#E54D42' }}>
            ·
          </span>
          <p className="flex-1 text-[12.5px] leading-[1.7] text-[#5a2a26]">{signal}</p>
          <span className="shrink-0 ml-2 mt-[2px]">
            <ChevronDown rotated={expanded} />
          </span>
        </button>

        {expanded && signalDetails && (
          <div className="px-3 pb-3 pt-0.5">
            <div className="grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-2">
              {signalDetails.map((d) => (
                <div key={d.tag} className="contents">
                  <div className="flex justify-start">
                    <span
                      className="text-[11px] px-1.5 py-1 rounded-md font-semibold leading-none"
                      style={{
                        background: '#FFD7D3',
                        color: '#B91C1C',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.tag}
                    </span>
                  </div>
                  <p className="text-[12.5px] leading-[1.7] text-[#5a2a26]">{d.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 影响资产 / 影响强度 双栏 */}
      <div
        className="mt-3 rounded-xl flex items-center justify-between px-3 py-2.5"
        style={{ background: '#F4F5F7' }}
      >
        {/* 左：图标 + 板块 + 方向 */}
        <div className="flex items-center">
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-lg mr-2.5"
            style={{ background: '#FFFFFF', width: 32, height: 32 }}
          >
            <span className="text-[16px]">{affectedIcon}</span>
          </span>
          <div>
            <div className="text-[10.5px] text-gray-500 leading-none">影响资产</div>
            <div className="text-[14px] font-bold mt-1.5 text-[#1f1f23] leading-none">
              {affectedName}
            </div>
          </div>
          <span
            className="ml-2.5 text-[11px] px-2 py-1 rounded-full font-bold leading-none"
            style={{
              background: directionPositive ? '#E54D42' : '#1FAE6F',
              color: '#fff',
            }}
          >
            {directionPositive ? '↑' : '↓'} {affectedDirection}
          </span>
        </div>
        {/* 右：强度 */}
        <div className="text-right">
          <div className="text-[10.5px] text-gray-500 leading-none">影响强度</div>
          <div className="mt-2">
            <StrengthBar level={strength} />
          </div>
        </div>
      </div>
    </div>
  );
}
