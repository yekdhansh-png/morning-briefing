import { useSheet } from '../data/BriefingContext';

/**
 * 底部吸顶导航条
 * - 左侧：定制输入框（点击或聚焦弹出 sheet）
 * - 中：红色圆形 ↑ 按钮
 * - 右侧：去自选 / 评论 / 分享 三个图标按钮
 */
export default function BottomBar() {
  const { setOpen } = useSheet();
  const handleOpen = () => setOpen(true);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 mx-auto"
      style={{ maxWidth: 480, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-t" style={{ borderColor: '#EEE' }}>
        {/* 定制输入框 */}
        <button
          type="button"
          onClick={handleOpen}
          className="flex-1 flex items-center rounded-full px-3.5 py-2 text-left"
          style={{ background: '#F5F5F7' }}
        >
          <span className="text-[12px] mr-1.5" style={{ color: '#E54D42' }}>
            ✦
          </span>
          <span className="text-[12.5px] text-gray-400">定制我的专属早报</span>
        </button>

        {/* 红色 ↑ 按钮 */}
        <button
          type="button"
          onClick={handleOpen}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(180deg, #E54D42 0%, #B91C1C 100%)',
            boxShadow: '0 3px 8px rgba(229, 77, 66, 0.35)',
          }}
        >
          <span className="text-[15px] font-bold">↑</span>
        </button>

        {/* 去自选 / 评论 / 分享 */}
        <div className="flex items-center gap-3 pl-1">
          <ActionBtn icon="🔖" label="去自选" />
          <ActionBtn icon="💬" label="评论" />
          <ActionBtn icon="↗" label="分享" />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label }: { icon: string; label: string }) {
  return (
    <button type="button" className="flex flex-col items-center justify-center">
      <span className="text-[14px] leading-none text-[#666]">{icon}</span>
      <span className="text-[10px] text-gray-500 mt-0.5 leading-none">{label}</span>
    </button>
  );
}
