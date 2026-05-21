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
      <div className="flex items-center px-3 py-2.5 border-t" style={{ borderColor: '#EEE' }}>
        {/* 定制输入框（含内嵌发送按钮），占底 bar 左半宽度 */}
        <div
          className="flex items-center rounded-full pl-3.5 pr-1 h-[36px]"
          style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', width: '50%' }}
        >
          <button
            type="button"
            onClick={handleOpen}
            className="flex-1 flex items-center text-left h-full min-w-0"
          >
            <SparkleIcon />
            <span className="text-[12.5px] text-gray-400 ml-2 truncate">定制我的专属早报</span>
          </button>
          {/* 内嵌红色 ↑ 发送按钮 */}
          <button
            type="button"
            onClick={handleOpen}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: '#E54D42',
              boxShadow: '0 2px 5px rgba(229, 77, 66, 0.30)',
            }}
            aria-label="发送"
          >
            <ArrowUpIcon />
          </button>
        </div>

        {/* 去自选 / 评论 / 分享（占右半区，平均分布） */}
        <div className="flex-1 flex items-center justify-around pl-3">
          <ActionBtn icon={<BookmarkIcon />} label="去自选" />
          <ActionBtn icon={<CommentIcon />} label="评论" />
          <ActionBtn icon={<ShareIcon />} label="分享" />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className="flex flex-col items-center justify-center">
      <span className="leading-none text-[#444]">{icon}</span>
      <span className="text-[10px] text-[#666] mt-1 leading-none">{label}</span>
    </button>
  );
}

/* ---------- SVG icons ---------- */

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E54D42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.7 5.5L19 9.5l-5.3 2L12 17l-1.7-5.5L5 9.5l5.3-2z" />
      <path d="M19 14l.8 2 2 .8-2 .8L19 20l-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
