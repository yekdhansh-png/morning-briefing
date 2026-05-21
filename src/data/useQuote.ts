import { useEffect, useState } from 'react';

/**
 * 用 JSONP 模式拉新浪 hq.sinajs.cn 的实时行情
 *
 * 接口示例：
 *   GET https://hq.sinajs.cn/list=sz300308,sh600519
 *   返回（GBK 编码、纯 JS）:
 *     var hq_str_sz300308="中际旭创,148.0,...";
 *     var hq_str_sh600519="贵州茅台,1582.0,...";
 *
 * 字段顺序（共 32 个，逗号分隔）：
 *   0: 名字
 *   1: 今日开盘价
 *   2: 昨日收盘价
 *   3: 当前价
 *   4: 今日最高
 *   5: 今日最低
 *   8: 成交量（股）
 *   9: 成交额（元）
 *   30: 日期 YYYY-MM-DD
 *   31: 时间 HH:MM:SS
 *
 * GBK 编码问题：动态 script 标签注入后，浏览器按当前页面 charset 解读
 *   导致中文名乱码——但我们已有用户输入的 name，**不读名字字段**，只读数字字段（ASCII）
 *
 * 涨跌幅 = (当前价 - 昨收) / 昨收 * 100
 */

export interface Quote {
  code: string;
  last: number;       // 当前价
  prevClose: number;  // 昨收
  open: number;       // 今开
  high: number;       // 今高
  low: number;        // 今低
  pct: number;        // 涨跌幅%
  amount: number;     // 成交额（元）
  time: string;       // HH:MM:SS
  isUp: boolean;
  source: 'sina' | 'fallback';
}

type Listener = (q: Quote) => void;
const listeners = new Map<string, Set<Listener>>();
const cache = new Map<string, Quote>();
let scriptCounter = 0;

function jsonpFetch(codes: string[]): Promise<void> {
  if (codes.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const cbName = `__sina_cb_${++scriptCounter}`;
    // 全局回调（虽然 sina 返回的是 var 定义，但我们用一个 hack）
    // 方案：把 hq.sinajs.cn 返回内容作为 script 注入，里面的 var hq_str_xxx 会变成全局变量
    // 然后我们读那些全局变量
    const script = document.createElement('script');
    script.src = `https://hq.sinajs.cn/list=${codes.join(',')}`;
    // sina 没有 callback 机制，靠 onload 后扫描 window
    script.onload = () => {
      try {
        for (const code of codes) {
          const key = `hq_str_${code}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = (window as any)[key] as string | undefined;
          if (typeof raw !== 'string' || raw.length < 10) continue;
          const parts = raw.split(',');
          if (parts.length < 32) continue;
          const open = parseFloat(parts[1]);
          const prevClose = parseFloat(parts[2]);
          const last = parseFloat(parts[3]);
          const high = parseFloat(parts[4]);
          const low = parseFloat(parts[5]);
          const amount = parseFloat(parts[9]);
          const time = parts[31] || '';
          if (!isFinite(last) || !isFinite(prevClose) || prevClose === 0) continue;
          const pct = ((last - prevClose) / prevClose) * 100;
          const q: Quote = {
            code,
            last,
            prevClose,
            open,
            high,
            low,
            pct,
            amount,
            time,
            isUp: pct >= 0,
            source: 'sina',
          };
          cache.set(code, q);
          const set = listeners.get(code);
          if (set) set.forEach((cb) => cb(q));
        }
      } catch {
        // ignore
      }
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
      resolve();
    };
    script.onerror = () => {
      script.remove();
      resolve();
    };
    document.head.appendChild(script);
  });
}

/**
 * 拉多只股票行情，更新 cache 和触发 listeners
 * 5 分钟内重复请求复用 cache
 */
const lastFetchAt = new Map<string, number>();
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchQuotes(codes: string[]): Promise<void> {
  const now = Date.now();
  const need = codes.filter((c) => {
    const t = lastFetchAt.get(c) || 0;
    return now - t > CACHE_TTL;
  });
  if (need.length === 0) return;
  // 一次最多 10 只
  for (let i = 0; i < need.length; i += 10) {
    const chunk = need.slice(i, i + 10);
    chunk.forEach((c) => lastFetchAt.set(c, now));
    // eslint-disable-next-line no-await-in-loop
    await jsonpFetch(chunk);
  }
}

/**
 * 订阅单只股票的行情更新
 */
export function useQuote(code: string | null): Quote | null {
  const [q, setQ] = useState<Quote | null>(() => (code ? cache.get(code) || null : null));

  useEffect(() => {
    if (!code) {
      setQ(null);
      return;
    }
    // 已有缓存先用
    const cur = cache.get(code);
    if (cur) setQ(cur);

    const cb: Listener = (next) => setQ(next);
    let set = listeners.get(code);
    if (!set) {
      set = new Set();
      listeners.set(code, set);
    }
    set.add(cb);

    // 触发拉取
    fetchQuotes([code]);

    return () => {
      set?.delete(cb);
    };
  }, [code]);

  return q;
}
