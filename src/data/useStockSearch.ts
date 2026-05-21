import { useEffect, useState } from 'react';

/**
 * 懒加载 A 股股票列表（stock-list.json，5500+ 条 / 223KB）
 * 仅在 CustomSheet 打开时加载，不增加首屏体积
 */

export interface StockMeta {
  code: string; // 带 sh/sz/bj 前缀
  name: string;
}

let cache: StockMeta[] | null = null;
let loadingPromise: Promise<StockMeta[]> | null = null;

async function fetchList(): Promise<StockMeta[]> {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(`${base}stock-list.json`);
    if (!res.ok) throw new Error(`load stock-list.json failed: ${res.status}`);
    const data = (await res.json()) as StockMeta[];
    cache = data;
    return data;
  })();
  return loadingPromise;
}

/**
 * 搜索 hook：输入关键词，返回匹配的股票列表（前 20 条）
 * 支持按名字模糊 / 按代码前缀匹配
 */
export function useStockSearch(query: string): {
  results: StockMeta[];
  loading: boolean;
} {
  const [results, setResults] = useState<StockMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    let cancelled = false;
    fetchList()
      .then((list) => {
        if (cancelled) return;
        const q = query.trim().toLowerCase();
        // 优先级：代码精确 > 代码前缀 > 名字开头 > 名字包含
        const exactCode: StockMeta[] = [];
        const prefixCode: StockMeta[] = [];
        const prefixName: StockMeta[] = [];
        const includeName: StockMeta[] = [];
        for (const s of list) {
          const codeShort = s.code.slice(2); // 去 sh/sz/bj 前缀
          if (codeShort === q || s.code.toLowerCase() === q) {
            exactCode.push(s);
            continue;
          }
          if (codeShort.startsWith(q)) {
            prefixCode.push(s);
            continue;
          }
          if (s.name.startsWith(q) || s.name.toLowerCase().startsWith(q)) {
            prefixName.push(s);
            continue;
          }
          if (s.name.includes(q)) {
            includeName.push(s);
          }
        }
        const merged = [...exactCode, ...prefixCode, ...prefixName, ...includeName];
        setResults(merged.slice(0, 20));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return { results, loading };
}
