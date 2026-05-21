import { useEffect, useState } from 'react';
import HeaderCard from './components/HeaderCard';
import SectionTitle from './components/SectionTitle';
import StockCard from './components/StockCard';
import GlobalMarketCard from './components/GlobalMarketCard';
import NewsCard from './components/NewsCard';
import IPOCard from './components/IPOCard';
import CatalystCard from './components/CatalystCard';
import BottomBar from './components/BottomBar';
import CustomSheet from './components/CustomSheet';
import { loadBriefing, defaultBriefing } from './data/briefing';
import type { BriefingData } from './data/briefing';
import { BriefingContext, SheetContext } from './data/BriefingContext';

export default function App() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadBriefing().then(setData).catch(() => setData(defaultBriefing));
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: '#F5F5F7' }}>
        <div className="text-[14px] text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <BriefingContext.Provider value={data}>
      <SheetContext.Provider value={{ open: sheetOpen, setOpen: setSheetOpen }}>
        <div className="min-h-screen w-full" style={{ background: '#F5F5F7' }}>
          <div className="mx-auto max-w-[480px] px-3.5 pt-3 pb-24">
            <HeaderCard />

            <SectionTitle title="自选动态" />
            {data.stocks.map((s) => (
              <StockCard key={s.code} data={s} />
            ))}

            <SectionTitle title="重磅要闻" />
            <GlobalMarketCard />
            {data.news.map((n) => (
              <NewsCard key={n.no} data={n} />
            ))}

            <SectionTitle title="今日机会" />
            <IPOCard />
            <CatalystCard />

            {/* 免责声明 */}
            <div className="text-center mt-4 mb-2">
              <p className="text-[11.5px] text-gray-400">{data.disclaimer}</p>
            </div>
          </div>

          <BottomBar />
          <CustomSheet />
        </div>
      </SheetContext.Provider>
    </BriefingContext.Provider>
  );
}
