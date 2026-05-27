// 早报数据：类型 + 默认 fallback + 运行时加载

export interface StatItem {
  label: string;
  value: string;
}

export interface AIDetail {
  tag: string;        // chip 标签，如 "驱动因素"
  content: string;
}

export interface StockItem {
  name: string;
  code: string;
  price: string;
  changePct: string;   // 形如 "-3.83%" 不含箭头，由前端判断方向
  isUp: boolean;       // true 涨（红/▲）/ false 跌（绿/▼）
  status: '涨停异动' | '重要新闻' | '新增风险';
  desc: string;
  stats: StatItem[];
  ai: string;
  aiDetails?: AIDetail[]; // 展开后的详细解读
}

export interface GlobalIndex {
  name: string;
  value: string;
  change: string;
  up: boolean;
}

export interface SignalDetail {
  tag: string;
  content: string;
}

export interface NewsItem {
  no: '01' | '02' | '03';
  title: string;
  signal: string;
  signalDetails?: SignalDetail[];
  affectedIcon: string;    // emoji 或文本
  affectedName: string;    // 板块名，如 "出口链"
  affectedDirection: '正面' | '负面';
  strength: '强' | '中' | '弱';
}

export interface IPOItem {
  name: string;
  code: string;
  board: '创业板' | '科创板';
  boardColor: 'green' | 'blue';
  price: string;
  industry: string;
  estProfit: string;       // 预估收益 ¥18,500
  estPct: string;          // (+48%) — 已不显示，仅保留兼容
  highlight: string;
}

// 自选股动态（mock）
export interface WatchStockMock {
  name: string;
  code: string;            // 不带前缀，如 "600519"
  newsTag: string;         // chip 文字，如 "重要提醒"
  news: string;            // 隔夜新闻摘要
  question: string;        // 问元宝的预生成问题
  answer: string;          // 元宝的预生成答案
}

// 日历事件（mock）
export interface CalendarItem {
  time: string;            // "14:30" / "盘后" / "21:00"
  event: string;           // 事件描述
  tag?: '关注' | '我的自选'; // 可选 chip
  highlight?: boolean;     // 是否高亮（自选股相关）
}

export interface CatalystStock {
  name: string;
  code?: string;
  role?: string;        // 龙头 / 弹性 / 次新
  reason: string;       // 30-40 字入选理由
  industry?: string;
  ret_5d?: number;      // 近 5 日涨幅(%)
  ret_20d?: number;
  ret_60d?: number;
  main_5d_yi?: number;  // 主力 5 日资金(亿)
}

export interface CatalystItem {
  // 旧字段（保留向下兼容，渲染时可用作 fallback）
  sector?: string;
  title?: string;
  content?: string;
  // 新字段（LLM 输出）
  concept?: string;          // 概念名 ≤6 字
  tag?: string;              // 4 字标签
  event?: string;            // 1 句话事件 ≤25 字
  catalystPath?: string;     // 1 句话催化路径 ≤25 字
  event_level?: 'S' | 'A' | 'B' | 'C' | 'D';
  fundamental_signal?: string;
  catalyst?: string;
  reason?: string;
  source_section?: string;
  source_title?: string;
  stocks: CatalystStock[];
}

export interface HeroData {
  brand: string;
  bigTitle: string;
  subTitle: string;
  tempValue: number;
  tempLabel: string;
  tempStatus: string;
  paragraph: string;
}

export interface CustomPlan {
  watchlist: string;
  sectors: string;
  riskPref: string;
  pushTime: string;
}

export interface BriefingData {
  hero: HeroData;
  stocks: StockItem[];
  globalIndices: GlobalIndex[];
  globalSummary: string;
  news: NewsItem[];
  ipo: {
    list: IPOItem[];
    footerNote: string;
    btnText: string;
  };
  catalyst: CatalystItem[];
  disclaimer: string;
  generatedBy: string;
  customPlan: CustomPlan;
  watchMock?: WatchStockMock[];      // 自选动态 mock
  calendarMock?: CalendarItem[];     // 日历 mock
}

// 默认 mock 数据（fallback）
export const defaultBriefing: BriefingData = {
  hero: {
    brand: 'MORNING BRIEFING',
    bigTitle: '每日有料',
    subTitle: '2026/05/19 · 星期二 · 盘前必读',
    tempValue: 78,
    tempLabel: '市场温度',
    tempStatus: '火热',
    paragraph:
      '今日大概率高开高走，外盘 AI 链 + 黄金双双新高强势映射，叠加国内 Token 算力商业化加速，权重搭台、题材唱戏；警惕高位品种盘中冲高回落。',
  },
  stocks: [
    {
      name: '中际旭创',
      code: '300308',
      price: '1005.00',
      changePct: '-3.83%',
      isUp: false,
      status: '涨停异动',
      desc: '中际旭创昨日强势涨停，封单金额超 12 亿元，成交额达 96 亿元，创近 2 个月新高，市场情绪高涨。',
      stats: [
        { label: '成交额', value: '96亿' },
        { label: '换手率', value: '5.21%' },
      ],
      ai: '英伟达 GTC 利好兑现叠加 1.6T 光模块需求确认，北向资金大幅加仓，上涨逻辑扎实。',
      aiDetails: [
        { tag: '驱动因素', content: '英伟达 GTC 大会确认 GB300 平台 1.6T 光模块用量翻倍至 144 个/机柜，作为全球光模块龙头直接受益于行业 α。' },
        { tag: '资金面', content: '北向资金近 5 日累计净买入 8.2 亿，机构席位昨日上榜净买入 4.8 亿，主力筹码集中度持续提升。' },
        { tag: '关注点', content: '后续需跟踪海外大客户三季报指引、1.6T 实际出货节奏；当前估值已隐含较高预期，警惕高位放量后的短期波动。' },
      ],
    },
    {
      name: '紫金矿业',
      code: '601899',
      price: '30.90',
      changePct: '-1.28%',
      isUp: false,
      status: '重要新闻',
      desc: '紫金矿业披露业绩预告：前三季度归母净利润预增 50%-55%，量价齐升兑现，叠加 LME 铜价创 5 个月新高。',
      stats: [
        { label: '行业', value: '有色' },
        { label: 'PE', value: '15.2' },
      ],
      ai: '铜金双主业全球矿企，业绩超市场预期，估值处历史中位偏下，安全边际充足。',
      aiDetails: [
        { tag: '驱动因素', content: '铜价突破 9,485 美元/吨叠加金价创历史新高，公司单吨毛利同步抬升，业绩弹性最强。' },
        { tag: '资金面', content: '北向连续 3 日加仓，机构调研密度回升，主力资金净流入维持高位。' },
        { tag: '关注点', content: '关注美元指数与全球矿端供给扰动；当前估值仍处中位偏下，建议中长期持有。' },
      ],
    },
    {
      name: '比亚迪',
      code: '002594',
      price: '95.00',
      changePct: '+0.52%',
      isUp: true,
      status: '新增风险',
      desc: '该股短期价格线下行于中长期均线，形成空头排列，技术面显示下行压力持续加大。',
      stats: [
        { label: '行业', value: '汽车' },
        { label: 'PE', value: '21.6' },
      ],
      ai: '均线空头排列是趋势走弱的经典信号，短期内建议谨慎持仓，等待趋势明朗。',
      aiDetails: [
        { tag: '驱动因素', content: '欧洲销量同环比下滑叠加国内 10 月排产略低于预期，市场对销量目标修复路径出现分歧。' },
        { tag: '资金面', content: '北向连续 4 日净卖出，融资余额回落，短线资金避险情绪上行。' },
        { tag: '关注点', content: '等待 11 月销量数据 + 智驾平权放量节奏；若放量则趋势有望反转，否则维持谨慎。' },
      ],
    },
  ],
  globalIndices: [
    { name: '纳斯达克', value: '26,090.73', change: '-0.51%', up: false },
    { name: '标普500', value: '7,403.05', change: '-0.07%', up: false },
    { name: '道琼斯', value: '49,686.12', change: '+0.32%', up: true },
    { name: 'COMEX金', value: '2,725', change: '+0.69%', up: true },
    { name: 'COMEX银', value: '32.85', change: '+1.45%', up: true },
    { name: 'WTI原油', value: '69.85', change: '-1.76%', up: false },
  ],
  globalSummary:
    '外盘呈现"美股小幅回调、金银走强、原油承压"组合，避险与降息预期升温，A 股有色金属、AI 算力或受正向映射，石化板块短期承压。',
  news: [
    {
      no: '01',
      title:
        '中美经贸磋商释放积极信号，双方原则同意对等降税并推进农产品市场准入，外贸链情绪迎修复窗口。',
      signal:
        '关税扰动转向缓和后，前期受压的出口敏感品种估值压制有望解除，资金面或重新流入低位顺周期方向。',
      signalDetails: [
        { tag: '关税路径', content: '"对等降税"释放磋商务实信号，年内进一步存存在空间。' },
        { tag: '受益方向', content: '机电出口、家电、汽车零部件、跨境电商等敏感品种弹性最大。' },
        { tag: '农产品端', content: '大豆、玉米、肉类等市场准入若打开，将利好港口、粮油加工。' },
      ],
      affectedIcon: '🚢',
      affectedName: '出口链',
      affectedDirection: '正面',
      strength: '强',
    },
    {
      no: '02',
      title:
        '三大运营商同步开卖"Token 算力套餐"，"算力网"概念全网刷屏，国产算力商业化路径加速明朗。',
      signal:
        '推理算力首次实现"按 Token 计费"标准化售卖，意味着 AI 算力进入持续稳定的 ToB 现金流阶段。',
      signalDetails: [
        { tag: '商业模式', content: 'Token 套餐对标公有云推理，单价透明 + 月度续费，构筑可预测的 ARR。' },
        { tag: '受益方向', content: '光模块、液冷、IDC、运营商算力子公司均有边际改善空间。' },
        { tag: '风险提示', content: '需关注实际 Token 消耗量爬坡进度，避免高估短期商业化节奏。' },
      ],
      affectedIcon: '💡',
      affectedName: '光通信',
      affectedDirection: '正面',
      strength: '强',
    },
    {
      no: '03',
      title:
        'SpaceX 拟 6/12 登陆纳斯达克，估值约 1.75 万亿美元，史诗级 IPO 重塑全球商业航天估值锚。',
      signal:
        '海外稀缺标的的上市将带动 A/H 商业航天板块比价效应，主题资金或提前进行映射性配置。',
      signalDetails: [
        { tag: '估值锚效应', content: '1.75 万亿美元估值将抬升 A/H 商业航天 PS 中枢。' },
        { tag: '受益方向', content: '卫星制造、火箭发射、卫星互联网应用三大方向比价空间最大。' },
        { tag: '节奏判断', content: '主题资金通常在路演与首日定价前 2-4 周提前布局，关注 5 月底-6 月初窗口。' },
      ],
      affectedIcon: '🚀',
      affectedName: '商业航天',
      affectedDirection: '正面',
      strength: '中',
    },
  ],
  ipo: {
    list: [
      {
        name: '智算光电',
        code: '301888',
        board: '创业板',
        boardColor: 'green',
        price: '¥38.88',
        industry: '光通信',
        estProfit: '¥18,500',
        estPct: '(+48%)',
        highlight: '光模块行业景气延续，发行 PE 显著低于行业可比公司。',
      },
      {
        name: '海芯半导',
        code: '688999',
        board: '科创板',
        boardColor: 'blue',
        price: '¥65.2',
        industry: '半导体设备',
        estProfit: '¥13,200',
        estPct: '(+20%)',
        highlight: '国产替代核心标的，绑定中芯国际，技术壁垒较高。',
      },
    ],
    footerNote: '近 6 个月无新股破发 · 首日平均涨幅 248.90%',
    btnText: '🔔 一键申购全部新股（2 只）  →',
  },
  catalyst: [
    {
      concept: 'AI 算力',
      tag: '巨头确认',
      event: '黄仁勋 GTC 发布 Rubin 路线图',
      catalystPath: '海外巨头确认→1.6T 用量翻倍→产业链共振',
      event_level: 'B',
      fundamental_signal: '需求拉动',
      catalyst: '黄仁勋 GTC 发布 GB300 及 Rubin 路线图，1.6T 光模块用量翻倍至 144 个，液冷成标配。',
      reason: '海外算力链确认升级路径，A 股光模块/液冷板块或迎价值重估。',
      stocks: [
        {
          name: '中际旭创',
          code: 'sz300308',
          role: '龙头',
          reason: '全球光模块龙头，1.6T 产品已批量出货，AI 算力链核心受益标的，业绩兑现度高。',
        },
        {
          name: '英维克',
          code: 'sz002837',
          role: '弹性',
          reason: '液冷温控核心供应商，深度绑定头部互联网客户，订单可见度高、弹性突出。',
        },
      ],
    },
    {
      concept: '有色',
      tag: '涨价信号',
      event: 'LME 铜与 COMEX 金双双创新高',
      catalystPath: '价格突破→量价齐升→矿企业绩弹性',
      event_level: 'B',
      fundamental_signal: '价格上涨',
      catalyst: 'LME 铜报 9,485 美元/吨创 5 月新高；COMEX 金 2,725 美元再创历史新高，美元指数跌破 106。',
      reason: '铜金双双突破驱动有色板块系统性重估，矿企量价齐升业绩弹性大。',
      stocks: [
        {
          name: '紫金矿业',
          code: 'sh601899',
          role: '龙头',
          reason: '铜金双主业全球矿企，量价齐升业绩弹性大，A 股有色龙头机构筹码集中。',
        },
        {
          name: '山东黄金',
          code: 'sh600547',
          role: '弹性',
          reason: 'A 股黄金龙头，金价新高直接受益弹性最强，纯金属股短线题材属性突出。',
        },
      ],
    },
  ],
  disclaimer: '市场有风险，投资需谨慎 · 本文不构成投资建议',
  generatedBy: '由 With 通过自然语言生成',
  customPlan: {
    watchlist: '中际旭创 · 紫金矿业 · 比亚迪',
    sectors: 'AI 算力 · 有色金属',
    riskPref: '稳健型',
    pushTime: '07:30 每日推送',
  },
  watchMock: [
    {
      name: '贵州茅台',
      code: '600519',
      newsTag: '重要提醒',
      news: '公司公告控股股东拟年内增持不低于 3 亿元，叠加中秋动销超预期，机构上调全年盈利预测。',
      question: '增持公告对短期股价支撑有多强？',
      answer:
        '控股股东 3 亿元增持金额相当于公司近 5 日成交额的 4%，属于"信号意义大于实际承接力"的范畴。从历史规律看，茅台过去 3 次增持后 20 日平均跑赢沪深 300 约 4 个百分点；叠加本次时点正好对应中秋动销超预期，预计短期股价有 3-5% 的修复空间，但持续性还要看 Q4 真实出货数据。',
    },
    {
      name: '宁德时代',
      code: '300750',
      newsTag: '重要提醒',
      news: '欧洲电池新规落地，CATL 海外产能配套加速，与 Stellantis 西班牙工厂 Q4 投产时间提前。',
      question: '海外产能加速对 2026 年业绩贡献多大？',
      answer:
        '西班牙工厂规划产能 50 GWh，按 Q4 投产 + 爬坡节奏，2026 全年贡献约 25-30 GWh 出货增量，对应营收增量约 200 亿元。考虑海外毛利率（约 22%）显著高于国内（约 17%），有望带动 2026 年归母净利润额外增厚 5-7%。但需注意欧洲新规对本地化采购比例的要求可能压缩部分议价空间。',
    },
    {
      name: '中际旭创',
      code: '300308',
      newsTag: '重要提醒',
      news: '英伟达 GTC 确认 GB300 平台 1.6T 光模块用量翻倍至 144 个，机柜 BOM 价值量大幅提升。',
      question: '1.6T 用量翻倍能让单季利润提升多少？',
      answer:
        '按 GB300 单机柜 144 个 1.6T 光模块、单价约 1,500 美元测算，单机柜光模块价值量约 21.6 万美元，较 GB200 平台翻倍。中际旭创全球份额约 30%，若 2026 H1 GB300 出货 5,000 机柜，对应公司光模块新增收入约 23 亿元，按 25% 净利率估算可贡献单季利润增量约 5.7 亿元，相当于现有单季利润的 25% 左右。',
    },
  ],
  calendarMock: [
    { time: '14:30', event: '中国 5 月 LPR 报价', tag: '关注' },
    { time: '盘后', event: '宁德时代 披露 2025 年报', tag: '我的自选', highlight: true },
  ],
};

/**
 * 运行时加载 briefing.json
 * - 默认走纯 mock（USE_MOCK=true），不 fetch 远端，保证视觉稳定
 * - 想接真实数据：在 .env / 构建参数里设 VITE_USE_MOCK=false
 * - 远端模式下，缺失字段（watchMock / calendarMock / ipo.list / globalSummary 空）
 *   会用 defaultBriefing 兜底
 */
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK ?? 'true').toString().toLowerCase() !== 'false';

export async function loadBriefing(): Promise<BriefingData> {
  // 纯 mock 模式：直接返回 defaultBriefing，不发请求
  if (USE_MOCK) {
    // eslint-disable-next-line no-console
    console.info('[briefing] USE_MOCK=true，使用本地 mock 数据');
    return defaultBriefing;
  }

  const url = `${import.meta.env.BASE_URL}briefing.json`;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = (await res.json()) as BriefingData;

    // 合并 mock 字段兜底
    return {
      ...remote,
      watchMock: remote.watchMock && remote.watchMock.length > 0
        ? remote.watchMock
        : defaultBriefing.watchMock,
      calendarMock: remote.calendarMock && remote.calendarMock.length > 0
        ? remote.calendarMock
        : defaultBriefing.calendarMock,
      ipo:
        remote.ipo && remote.ipo.list && remote.ipo.list.length > 0
          ? remote.ipo
          : defaultBriefing.ipo,
      // globalSummary 为空时用 mock 兜底，先保证前端解读区有内容
      globalSummary:
        remote.globalSummary && remote.globalSummary.trim().length > 0
          ? remote.globalSummary
          : defaultBriefing.globalSummary,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[briefing] 加载失败，使用 fallback:', err);
    return defaultBriefing;
  }
}
