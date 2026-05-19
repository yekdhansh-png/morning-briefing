import { useBriefing, useSheet } from '../data/BriefingContext';

/**
 * 早报小助手 - 半屏交互弹层
 * - 顶部头像 + 标题 + 关闭
 * - AI 欢迎消息（含富文本高亮关键词）
 * - 我的早报方案 卡片
 * - 快捷定制 4 个按钮
 * - 底部输入框 + ↑ 发送
 * - 最底部小字 AI 生成内容仅供参考
 */
export default function CustomSheet() {
  const { customPlan } = useBriefing();
  const { open, setOpen } = useSheet();
  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/45" onClick={close} />

      {/* sheet 主体 */}
      <div
        className="relative mx-auto rounded-t-2xl w-full overflow-hidden"
        style={{
          maxWidth: 480,
          maxHeight: '85vh',
          background: 'linear-gradient(180deg, #1f1d2c 0%, #2a2535 100%)',
          animation: 'sheet-slide-up 240ms ease-out',
        }}
      >
        {/* 拖动条 */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex flex-col text-white" style={{ maxHeight: 'calc(85vh - 16px)' }}>
          {/* 头部 */}
          <div className="flex items-center px-4 pt-2 pb-3">
            <div
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[16px] mr-3"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #E54D42 100%)' }}
            >
              ✦
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold">早报小助手</div>
              <div className="flex items-center text-[11px] text-white/55 mt-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: '#1FAE6F' }}
                />
                在线 · 为你定制专属早报
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/70 text-[14px]"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              ✕
            </button>
          </div>

          {/* 滚动区 */}
          <div className="flex-1 overflow-y-auto px-4 pb-3">
            {/* AI 欢迎消息 */}
            <div className="flex items-start mb-4">
              <div
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] mr-2"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #E54D42 100%)' }}
              >
                ✦
              </div>
              <div
                className="flex-1 rounded-2xl rounded-tl-md px-3.5 py-3 text-[13.5px] leading-[1.78]"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <p className="text-white/95">
                  你好 <span>👋</span> 我是早报小助手。
                </p>
                <p className="text-white/85 mt-1.5">
                  我可以帮你{' '}
                  <span className="font-semibold" style={{ color: '#F59E0B' }}>
                    管理自选股、订阅板块、调整风险偏好、设置推送时间
                  </span>
                  ，让每天的早报更懂你。
                </p>
                <p className="text-white/85 mt-1.5">
                  试试下面的快捷指令，或直接告诉我你的需求 <span>✨</span>
                </p>
              </div>
            </div>

            {/* 我的早报方案 */}
            <div
              className="rounded-xl p-3.5 mb-4"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px dashed rgba(245, 158, 11, 0.35)',
              }}
            >
              <div className="flex items-center mb-3">
                <span className="text-[13px] mr-1.5" style={{ color: '#F59E0B' }}>
                  ✦
                </span>
                <span className="text-[13px] font-bold" style={{ color: '#F59E0B' }}>
                  我的早报方案
                </span>
              </div>
              <PlanRow icon="⭐" label="自选股" value={customPlan.watchlist} />
              <PlanRow icon="🧩" label="关注板块" value={customPlan.sectors} />
              <PlanRow icon="🛡" label="风险偏好" value={customPlan.riskPref} />
              <PlanRow icon="⏰" label="推送时间" value={customPlan.pushTime} />
            </div>

            {/* 快捷定制 */}
            <div className="mb-3">
              <div className="flex items-center mb-2">
                <span className="text-[12px] mr-1" style={{ color: '#F59E0B' }}>
                  ⚡
                </span>
                <span className="text-[12.5px] font-semibold text-white/80">快捷定制</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <QuickBtn icon="⭐" label="管理我的自选股" />
                <QuickBtn icon="🧩" label="关注板块设置" />
                <QuickBtn icon="🛡" label="调整风险偏好" />
                <QuickBtn icon="⏰" label="推送时间设置" />
              </div>
            </div>
          </div>

          {/* 输入框 */}
          <div className="px-4 pb-3">
            <div
              className="flex items-center rounded-full pl-3.5 pr-1.5 py-1.5"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <input
                type="text"
                placeholder="告诉我你想看什么，比如：加自选股 茅台"
                className="flex-1 bg-transparent outline-none text-[13px] text-white/90 placeholder:text-white/35"
                onFocus={(e) => e.currentTarget.blur()}
              />
              <button
                type="button"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{
                  background: 'linear-gradient(180deg, #E54D42 0%, #B91C1C 100%)',
                }}
              >
                <span className="text-[14px] font-bold">↑</span>
              </button>
            </div>
            <div className="text-center text-[11px] text-white/40 mt-2">
              AI 生成内容仅供参考 · 不构成投资建议
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center mb-2 last:mb-0">
      <span
        className="shrink-0 w-5 h-5 flex items-center justify-center text-[11px] mr-2 rounded"
        style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
      >
        {icon}
      </span>
      <span className="text-[12px] text-white/55 w-[68px]">{label}</span>
      <span className="text-[12.5px] font-semibold text-white/95">{value}</span>
    </div>
  );
}

function QuickBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center rounded-lg py-2.5 text-[12.5px] text-white/90"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="mr-1.5 text-[12px]" style={{ color: '#F59E0B' }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
