import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  extra?: ReactNode;
}

/**
 * 模块标题：纯文字（去掉左侧红块），右侧灰字 extra 可选
 */
export default function SectionTitle({ title, extra }: SectionTitleProps) {
  return (
    <div className="flex items-baseline mt-4 mb-2 px-1">
      <span
        className="font-bold tracking-wide text-[15px]"
        style={{ color: 'var(--ink)' }}
      >
        {title}
      </span>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}
