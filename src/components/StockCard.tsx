import { useState } from 'react';
import type { StockItem } from '../data/briefing';

interface StockCardProps {
  data: StockItem;
}

function getStatusStyle(status: StockItem['status']): { color: string; bg: string; icon: string } {
  switch (status) {
    case '涨停异动':
      return { color: '#E54D42', bg: '#FFF1F0', icon: '🚀' };
    case '重要新闻':
      return { color: '#F59E0B', bg: '#FEF6E7', icon: '📢' };
    case '新增风险':
      return { color: '#F59E0B', bg: '#FEF6E7', icon: '⚠️' };
    default:
      return { color: '#999', bg: '#F5F5F7', icon: '•' };
  }
}

export default function StockCard({ data }: StockCardProps) {
  const { name, code, price, changePct, isUp, status, desc, stats, ai, aiDetails } = data;
  const [expanded, setExpanded] = useState(false);
  const sty = getStatusStyle(status);
  const priceColor = isUp ? '#E54D42' : '#1FAE6F';
  const arrow = isUp ? '▲' : '▼';

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      {/* 头部：名称 + 价格 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <span className="text-[16px] font-bold text-[#1f1f23]">{name}</span>
          <span className="text-[12px] text-gray-400 ml-2">{code}</span>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-bold leading-none" style={{ color: priceColor }}>
            {price}
          </div>
          <div className="text-[12px] mt-1 font-medium" style={{ color: priceColor }}>
            {arrow} {changePct}
          </div>
        </div>
      </div>

      {/* 状态标签 */}
      <div className="mt-3">
        <span
          className="inline-flex items-center text-[11.5px] px-2 py-1 rounded font-semibold"
          style={{ color: sty.color, background: sty.bg }}
        >
          <span className="mr-1 text-[10.5px]">{sty.icon}</span>
          {status}
        </span>
      </div>

      {/* 描述 */}
      <p className="mt-2.5 text-[13px] leading-[1.7] text-[#333]">{desc}</p>

      {/* 数据栏 */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg px-3 py-2.5 text-center"
            style={{ background: '#F5F5F7' }}
          >
            <div className="text-[11.5px] text-gray-500">{s.label}</div>
            <div className="text-[15px] font-bold mt-0.5 text-[#1f1f23]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* AI 解读（可展开） */}
      <div
        className="mt-3 rounded-lg border-l-[3px]"
        style={{ background: '#F3EEFF', borderLeftColor: '#7C5BD9' }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-start p-2.5 text-left"
        >
          <span
            className="shrink-0 inline-flex items-center justify-center text-[10px] font-bold text-white rounded-md mr-2 mt-0.5"
            style={{ background: '#7C5BD9', width: 24, height: 18 }}
          >
            AI
          </span>
          <p className="flex-1 text-[12.5px] leading-[1.7] text-[#3a2e6e]">{ai}</p>
          <span
            className="shrink-0 ml-2 mt-1 text-[12px] text-[#7C5BD9] transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ⌄
          </span>
        </button>

        {expanded && aiDetails && (
          <div className="px-2.5 pb-2.5 pl-9 space-y-2">
            {aiDetails.map((d) => (
              <div key={d.tag} className="flex items-start">
                <span
                  className="shrink-0 text-[10.5px] px-1.5 py-0.5 rounded font-semibold mr-2 mt-[1px]"
                  style={{ background: '#E6DBFF', color: '#7C5BD9' }}
                >
                  {d.tag}
                </span>
                <p className="flex-1 text-[12.5px] leading-[1.7] text-[#3a2e6e]">{d.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
