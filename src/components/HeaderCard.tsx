import { useBriefing, useSheet } from '../data/BriefingContext';

/**
 * 顶部深色头图卡片（v2）
 * - 右上角"✦ 定制"按钮
 * - 市场温度：左上 ▴ 市场温度 / 右上 火热 / 左下 78°
 * - 段落，去掉关键词 chip 与进度条
 */
export default function HeaderCard() {
  const { hero } = useBriefing();
  const { setOpen } = useSheet();
  const { brand, bigTitle, subTitle, tempValue, tempLabel, tempStatus, paragraph } = hero;

  return (
    <div className="hero-gradient relative overflow-hidden rounded-2xl px-5 pt-5 pb-5 text-white shadow-card">
      {/* 顶部品牌 + 定制按钮 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          <span className="gold-line-short" />
          <span className="gold-text text-[10.5px] tracking-[0.32em] font-semibold ml-2">{brand}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full"
          style={{
            color: '#E8C547',
            border: '1px solid rgba(232, 197, 71, 0.55)',
            background: 'rgba(232, 197, 71, 0.08)',
          }}
        >
          <span className="text-[11px]">✦</span>
          <span className="font-semibold">定制</span>
        </button>
      </div>

      {/* 大标题 */}
      <h1 className="gold-text text-[30px] leading-tight font-extrabold tracking-wide mt-1">
        {bigTitle}
      </h1>
      <div className="text-[11px] text-white/65 mt-1 mb-4 tracking-wide">{subTitle}</div>

      {/* 市场温度 */}
      <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3.5 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center text-white/75 text-[12px]">
            <span className="mr-1 text-[12px]" style={{ color: '#E8C547' }}>
              ▴
            </span>
            <span>{tempLabel}</span>
          </div>
          <div className="flex items-center text-[12px]" style={{ color: '#E8C547' }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
              style={{ background: '#E8C547' }}
            />
            <span className="font-semibold">{tempStatus}</span>
          </div>
        </div>
        <div className="flex items-end mt-1">
          <span className="gold-text text-[42px] font-extrabold leading-none">{tempValue}</span>
          <span className="gold-text text-[18px] font-semibold leading-none ml-0.5 mb-1.5">°</span>
        </div>
        {/* 渐变细线 */}
        <div
          className="mt-3 h-[3px] w-full rounded-full"
          style={{
            background:
              'linear-gradient(90deg, #E54D42 0%, #F59E0B 35%, #E8C547 65%, #1FAE6F 100%)',
            opacity: 0.85,
          }}
        />
      </div>

      {/* 段落 */}
      <p className="text-[13px] leading-[1.78] text-white/85">{paragraph}</p>
    </div>
  );
}
