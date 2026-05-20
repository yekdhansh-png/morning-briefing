import type { IPOItem } from '../data/briefing';
import { useBriefing } from '../data/BriefingContext';

function BoardChip({ board, color }: { board: string; color: 'green' | 'blue' }) {
  // 截图里两个 chip 都是橙黄色描边，不分颜色——但 boardColor 字段保留
  const palette =
    color === 'green'
      ? { c: '#B45309', bg: '#FEF6E7', bd: '#F0C067' }
      : { c: '#B45309', bg: '#FEF6E7', bd: '#F0C067' };
  return (
    <span
      className="text-[10.5px] px-1.5 py-0.5 rounded border ml-1.5 font-semibold"
      style={{ color: palette.c, background: palette.bg, borderColor: palette.bd }}
    >
      {board}
    </span>
  );
}

function StatCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="rounded-lg px-2.5 py-2.5" style={{ background: '#F5F5F7' }}>
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="text-[13.5px] font-bold mt-0.5" style={{ color: valueColor || '#1f1f23' }}>
        {value}
      </div>
    </div>
  );
}

function IPOItemView({ item }: { item: IPOItem }) {
  return (
    <div className="rounded-xl border border-[#F0F0F2] p-3 mb-3 last:mb-0" style={{ background: '#FBFBFC' }}>
      <div className="flex items-center mb-3">
        <span className="text-[15px] font-bold text-[#1f1f23]">{item.name}</span>
        <span className="text-[12px] text-gray-400 ml-1.5">{item.code}</span>
        <BoardChip board={item.board} color={item.boardColor} />
      </div>

      {/* 三栏：发行价 / 所属行业 / 预估收益 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCell label="发行价" value={item.price} />
        <StatCell label="所属行业" value={item.industry} />
        <div className="rounded-lg px-2.5 py-2.5" style={{ background: '#F5F5F7' }}>
          <div className="text-[11px] text-gray-500">预估收益</div>
          <div className="text-[13.5px] font-bold mt-0.5" style={{ color: '#E54D42' }}>
            {item.estProfit}{' '}
            <span className="text-[11.5px] font-semibold">{item.estPct}</span>
          </div>
        </div>
      </div>

      {/* 看点 */}
      <div className="mt-3 flex items-start">
        <span className="shrink-0 text-[12px] text-gray-500 mr-1">看点 ·</span>
        <p className="text-[12.5px] leading-[1.7] text-[#333]">{item.highlight}</p>
      </div>
    </div>
  );
}

export default function IPOCard() {
  const { ipo } = useBriefing();
  const { list: ipoList, footerNote: ipoFooterNote, btnText: ipoBtnText } = ipo;

  // 未来 7 天没有新股可申购时，整个模块隐藏
  if (!ipoList || ipoList.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
      <div className="flex items-center mb-3">
        <span className="text-[16px] mr-1.5">💰</span>
        <span className="text-[15px] font-bold text-[#1f1f23]">今日打新</span>
      </div>

      {ipoList.map((item) => (
        <IPOItemView key={item.code} item={item} />
      ))}

      <button
        type="button"
        className="w-full mt-1 rounded-xl text-white text-[14.5px] font-semibold py-3 flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #E54D42 0%, #B91C1C 100%)',
          boxShadow: '0 4px 12px rgba(229, 77, 66, 0.25)',
        }}
        // TODO: 一键申购弹窗
      >
        {ipoBtnText}
      </button>
      <div className="text-center text-[11.5px] text-gray-500 mt-2">{ipoFooterNote}</div>
    </div>
  );
}
