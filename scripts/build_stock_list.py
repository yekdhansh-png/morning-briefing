"""
拉取 A 股全市场上市公司"代码 → 名字"映射表，写到 public/stock-list.json

用途：前端定制自选股时按名字模糊搜索股票
来源：新浪财经 hs_a 全 A 股节点（无 token、稳定，约 5800+ 条）

输出格式（数组）：
[
  { "code": "sh600519", "name": "贵州茅台" },
  { "code": "sz000858", "name": "五粮液" },
  ...
]

新浪 symbol 已带 sh/sz/bj 前缀，无需自己拼。
"""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

URL = (
    "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php"
    "/Market_Center.getHQNodeData"
    "?page={page}&num={num}&sort=symbol&asc=1&node=hs_a&_s_r_a=init"
)


def _fetch_page(page: int, num: int) -> list[dict]:
    last_err = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                URL.format(page=page, num=num),
                headers={
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://finance.sina.com.cn/",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode("utf-8", errors="replace")
            return json.loads(raw)
        except Exception as e:
            last_err = e
            print(f"  [page {page}] attempt {attempt + 1}/3 failed: {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"page {page} 拉取失败: {last_err}")


def fetch_all() -> list[dict]:
    page = 1
    num = 80
    out: list[dict] = []
    seen_symbols: set[str] = set()

    while True:
        items = _fetch_page(page, num)
        if not items:
            print(f"  [stock-list] page {page} empty, stop", file=sys.stderr)
            break

        new_count = 0
        for it in items:
            symbol = (it.get("symbol") or "").strip()
            name = (it.get("name") or "").strip()
            if not symbol or not name or symbol in seen_symbols:
                continue
            seen_symbols.add(symbol)
            out.append({"code": symbol, "name": name})
            new_count += 1

        print(
            f"  [stock-list] page {page} fetched {len(items)} new={new_count} total={len(out)}",
            file=sys.stderr,
        )

        if new_count == 0:
            # 翻到底
            break
        page += 1
        time.sleep(0.4)
        if page > 100:  # 安全阈值，5800 / 80 = 73 页
            break

    return out


def main() -> int:
    items = fetch_all()
    print(f"[stock-list] total {len(items)} stocks", file=sys.stderr)
    if len(items) < 4000:
        print(f"[stock-list] WARN 数量 {len(items)} 偏少，预期 5000+", file=sys.stderr)

    # 按代码排序
    items.sort(key=lambda x: x["code"])

    out_path = Path(__file__).resolve().parent.parent / "public" / "stock-list.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = out_path.stat().st_size / 1024
    print(f"[stock-list] saved {out_path} ({size_kb:.1f} KB)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
