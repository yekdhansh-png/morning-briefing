#!/usr/bin/env python3
"""
外盘期货收盘行情抓取（新浪外盘期货日线接口）

接口：https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var_dat=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=<SYMBOL>
返回 JSON 数组（jsonp 包裹），每行 {date, open, high, low, close, ...}

支持代码：
  GC = COMEX 黄金主连
  SI = COMEX 白银主连
  CL = NYMEX WTI 原油主连
  HG = COMEX 铜  / PL = 铂 / PA = 钯  …（暂未用到）

收盘涨跌幅 = (最新一根 close - 倒数第二根 close) / 倒数第二根 close × 100%
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
TIMEOUT = 15


def _fetch(symbol: str) -> list[dict]:
    """拉单个期货日线，返回 [{date, open, high, low, close, ...}, ...]（按时间升序）"""
    url = (
        "https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var_dat=/"
        f"GlobalFuturesService.getGlobalFuturesDailyKLine?symbol={symbol}"
    )
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Referer": "https://finance.sina.com.cn",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        text = resp.read().decode("utf-8", errors="ignore")

    # 形如：var_dat=([{...},{...},...]);
    m = re.search(r"=\s*\((\[.*?\])\)\s*;", text, re.S)
    if not m:
        # 也兼容不带括号的：var_dat=[...];
        m = re.search(r"=\s*(\[.*?\])\s*;", text, re.S)
    if not m:
        raise RuntimeError(f"{symbol} 解析失败：未匹配到 JSON 数组")

    data = json.loads(m.group(1))
    if not isinstance(data, list) or not data:
        raise RuntimeError(f"{symbol} 数据为空")
    return data


def _format_value(close: float) -> str:
    if close >= 1000:
        return f"{close:,.2f}"
    if close >= 100:
        return f"{close:,.2f}"
    return f"{close:.2f}"


def fetch_one_future(symbol: str) -> dict | None:
    """
    返回 {value, change, up}，用最新两根日线计算收盘涨跌幅
    失败返回 None
    """
    try:
        rows = _fetch(symbol)
    except Exception as e:
        print(f"  [WARN] 期货 {symbol} 抓取失败: {e}", file=sys.stderr)
        return None

    if len(rows) < 2:
        print(f"  [WARN] 期货 {symbol} 日线不足 2 根", file=sys.stderr)
        return None

    try:
        latest_close = float(rows[-1]["close"])
        prev_close = float(rows[-2]["close"])
    except (ValueError, KeyError, TypeError):
        return None

    if prev_close == 0:
        return None

    pct = (latest_close - prev_close) / prev_close * 100
    up = pct >= 0
    sign = "+" if up else ""

    return {
        "value": _format_value(latest_close),
        "change": f"{sign}{pct:.2f}%",
        "up": up,
        "_latest_date": rows[-1].get("date"),
        "_prev_date": rows[-2].get("date"),
    }


# 早报固定使用的 3 个期货
FUTURES_SYMBOLS = [
    ("GC", "COMEX 黄金"),
    ("SI", "COMEX 白银"),
    ("CL", "WTI 原油"),
]


def fetch_futures_quotes() -> list[dict]:
    """
    返回 [{name, value, change, up}, ...]
    单条失败时该条不返回（由调用方决定是否复用旧值）
    """
    out: list[dict] = []
    for sym, name in FUTURES_SYMBOLS:
        q = fetch_one_future(sym)
        if not q:
            continue
        out.append({
            "name": name,
            "value": q["value"],
            "change": q["change"],
            "up": q["up"],
        })
        print(
            f"  [OK]    {name:10s} {q['value']:>10s} ({q['change']})  "
            f"[{q['_prev_date']}→{q['_latest_date']}]"
        )
    return out


if __name__ == "__main__":
    quotes = fetch_futures_quotes()
    print()
    print(json.dumps(quotes, ensure_ascii=False, indent=2))
