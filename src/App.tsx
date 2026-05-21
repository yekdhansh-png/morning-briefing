import { useEffect, useState } from 'react';
import HeaderCard from './components/HeaderCard';
import SectionTitle from './components/SectionTitle';
import StockSection from './components/StockSection';
import GlobalMarketCard from './components/GlobalMarketCard';
import NewsCard from './components/NewsCard';
import IPOCard from './components/IPOCard';
import CatalystCard from './components/CatalystCard';
import BottomBar from './components/BottomBar';
import CustomSheet from './components/CustomSheet';
import { loadBriefing, defaultBriefing } from './data/briefing';
import type { BriefingData } from './data/briefing';
import { BriefingContext, SheetContext } from './data/BriefingContext';
import { usePreferences } from './data/usePreferences';
import type { SectionOrderItem } from './data/usePreferences';

export default function App() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { prefs } = usePreferences();

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

  const renderSection = (sec: SectionOrderItem) => {
    if (!sec.visible) return null;
    switch (sec.id) {
      case 'stock':
        return (
          <div key="stock">
            <SectionTitle title="自选动态" />
            <StockSection />
          </div>
        );
      case 'news':
        return (
          <div key="news">
            <SectionTitle title="重磅要闻" />
            <GlobalMarketCard />
            {data.news.map((n) => (
              <NewsCard key={n.no} data={n} />
            ))}
          </div>
        );
      case 'opportunity':
        return (
          <div key="opportunity">
            <SectionTitle title="今日机会" />
            <CatalystCard />
            <IPOCard />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <BriefingContext.Provider value={data}>
      <SheetContext.Provider value={{ open: sheetOpen, setOpen: setSheetOpen }}>
        <div className="min-h-screen w-full" style={{ background: '#F5F5F7' }}>
          <div className="mx-auto max-w-[480px] px-3.5 pt-3 pb-24">
            <HeaderCard />

            {prefs.sectionOrder.map(renderSection)}

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
