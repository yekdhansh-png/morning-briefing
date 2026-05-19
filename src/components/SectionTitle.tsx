import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  extra?: ReactNode;
}

/**
 * 区块标题：红色竖条 + 黑色加粗
 */
export default function SectionTitle({ title, extra }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mt-5 mb-3 px-1">
      <div className="flex items-center">
        <span
          className="inline-block w-1 h-4 rounded-sm mr-2"
          style={{ background: '#E54D42' }}
        />
        <span className="text-[17px] font-bold text-[#1f1f23] tracking-wide">{title}</span>
      </div>
      {extra}
    </div>
  );
}
