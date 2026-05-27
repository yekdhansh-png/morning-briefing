import { useBriefing, useSheet } from '../data/BriefingContext';

/**
 * Hero 头部 —— 浅蓝晨光紧凑版
 * - 删英文品牌 / 短金线
 * - 标题 + 日期同行 / 定制按钮金→红
 * - 温度卡 inline 横向布局
 * - 解读：红色 hook + 完整 paragraph
 */
export default function HeaderCard() {
  const { hero } = useBriefing();
  const { setOpen } = useSheet();
  const { bigTitle, subTitle, tempValue, tempStatus, paragraph } = hero;

  // 把"2026/05/26 · 星期二 · 盘前必读"压缩为"05/26 周二"
  const compactDate = (() => {
    const m = subTitle.match(/(\d{4})\/(\d{2})\/(\d{2}).*?星期([一二三四五六日])/);
    if (m) return `${m[2]}/${m[3]} 周${m[4]}`;
    return subTitle;
  })();

  // paragraph 里如果第一句包含"高开/低开/震荡/反弹"等预判词，加红 hook
  const renderParagraph = (text: string) => {
    const hookMatch = text.match(/^([^，。,.]{3,18})[，。,.]/);
    if (hookMatch) {
      const hook = hookMatch[1];
      const rest = text.slice(hook.length);
      return (
        <>
          <span className="font-bold" style={{ color: 'var(--red)' }}>
            {hook}
          </span>
          {rest}
        </>
      );
    }
    return text;
  };

  return (
    <div className="hero-light relative overflow-hidden rounded-2xl px-4 pt-4 pb-4 mt-1">
      {/* 顶行：标题 + 日期 + 定制 */}
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h1
            className="font-extrabold tracking-wide"
            style={{ fontSize: 24, lineHeight: 1, color: 'var(--ink)' }}
          >
            {bigTitle}
          </h1>
          <span className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
            {compactDate}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-2.5 py-1 rounded-full text-[11.5px]"
          style={{
            color: 'var(--red)',
            border: '1px solid rgba(229,77,66,0.35)',
            background: 'rgba(255,255,255,0.6)',
          }}
        >
          ✦ 定制
        </button>
      </div>

      {/* 温度卡 inline：数字 + 标签 + 渐变条 */}
      <div className="flex items-center gap-3 mb-2.5">
        <div className="shrink-0 flex items-end">
          <span
            className="font-extrabold leading-none"
            style={{ fontSize: 38, color: 'var(--red)' }}
          >
            {tempValue}
          </span>
          <span
            className="font-semibold leading-none ml-0.5 mb-1"
            style={{ fontSize: 14, color: 'var(--red)' }}
          >
            °
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1.5">
            <span className="text-[11.5px]" style={{ color: 'var(--ink-2)' }}>
              市场温度
            </span>
            <span className="chip chip-info ml-2" style={{ padding: '1px 6px' }}>
              {tempStatus}
            </span>
          </div>
          <div
            className="h-[3px] w-full rounded-full"
            style={{
              background:
                'linear-gradient(90deg, rgba(229,77,66,0.18) 0%, rgba(229,77,66,0.55) 50%, var(--red) 100%)',
            }}
          />
        </div>
      </div>

      {/* 解读 */}
      <p
        className="m-0 font-medium"
        style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}
      >
        {renderParagraph(paragraph)}
      </p>
    </div>
  );
}
