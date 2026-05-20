#!/usr/bin/env python3
"""
晨光股市早报 - 数据生成器（Step 2.1: 接入隔夜外盘真实行情 - westock 版）

数据源：腾讯自选股（westock-data-clawhub）
- 美股三大指数：纳斯达克 usIXIC / 标普500 usINX / 道琼斯 usDJI
- 大宗商品 ETF：黄金 ETF usGLD.AM / 白银 ETF usSLV.AM / 原油 ETF usUSO.AM

涨跌幅 = (最新收盘 - 上一交易日收盘) / 上一交易日收盘 × 100%

环境：Python 3.13 标准库 + 调用 westock CLI（npx）
拉失败时保留旧值。
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRIEFING_PATH = ROOT / "public" / "briefing.json"
NEWS_ARCHIVE_DIR = ROOT / "data" / "news-archive"

# 让本目录下的 news_cls / news_wscn 模块可被 import
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from news_cls import fetch_cls_briefing
    from news_wscn import fetch_wscn_breakfast
    from news_stcn import fetch_stcn_briefing
except ImportError as _e:
    print(f"[ERROR] 加载新闻抓取模块失败: {_e}", file=sys.stderr)

    def fetch_cls_briefing():  # type: ignore
        return [], None

    def fetch_wscn_breakfast():  # type: ignore
        return [], None

    def fetch_stcn_briefing():  # type: ignore
        return [], None

WEEKDAY_CN = ["一", "二", "三", "四", "五", "六", "日"]
TRADING_WEEKDAYS = {0, 1, 2, 3, 4}

# 外盘 6 标的：(westock symbol, 展示名)
GLOBAL_SYMBOLS = [
    ("usIXIC", "纳斯达克"),
    ("usINX", "标普500"),
    ("usDJI", "道琼斯"),
    ("usGLD.AM", "黄金 ETF"),
    ("usSLV.AM", "白银 ETF"),
    ("usUSO.AM", "原油 ETF"),
]
WESTOCK_PKG = "westock-data-clawhub@1.0.4"
WESTOCK_TIMEOUT = 60  # 秒


# ---------- 工具函数 ----------

def today_subtitle() -> tuple[str, datetime]:
    now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8)))
    weekday = WEEKDAY_CN[now.weekday()]
    subtitle = f"{now.strftime('%Y/%m/%d')} · 星期{weekday} · 盘前必读"
    return subtitle, now


def load_briefing() -> dict:
    if not BRIEFING_PATH.exists():
        print(f"[ERROR] briefing.json 不存在: {BRIEFING_PATH}", file=sys.stderr)
        sys.exit(1)
    with BRIEFING_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_briefing(data: dict) -> None:
    BRIEFING_PATH.parent.mkdir(parents=True, exist_ok=True)
    with BRIEFING_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------- westock 调用 ----------

def call_westock(args: list[str]) -> str:
    """调用 westock CLI，返回 stdout"""
    cmd = ["npx", "-y", WESTOCK_PKG, *args]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=WESTOCK_TIMEOUT,
    )
    if result.returncode != 0:
        raise RuntimeError(f"westock failed: {result.stderr or result.stdout}")
    return result.stdout


def parse_kline_table(text: str) -> list[dict]:
    """
    解析 westock kline 输出的 markdown 表格
    返回 [{date, open, last, high, low, ...}, ...]
    """
    rows: list[dict] = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip().startswith("|")]
    if len(lines) < 3:
        return rows
    # 第 1 行是表头，第 2 行是 ---
    header = [c.strip() for c in lines[0].strip("|").split("|")]
    for ln in lines[2:]:
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if len(cells) != len(header):
            continue
        row = dict(zip(header, cells))
        rows.append(row)
    return rows


def fetch_one_index(westock_sym: str) -> dict | None:
    """
    返回 {value, change, up} 或 None
    用最近 5 天 K 线，去掉占位行（westock 当天未开盘时会用昨日数据填占位行），
    然后拿最新行 vs 上一交易日行算涨跌幅
    """
    try:
        out = call_westock(["kline", westock_sym, "--period", "day", "--limit", "5"])
    except (RuntimeError, subprocess.TimeoutExpired) as e:
        print(f"  [WARN] {westock_sym} 调用失败: {e}", file=sys.stderr)
        return None

    if "未找到" in out or "未找到该股票" in out:
        return None

    rows = parse_kline_table(out)
    if len(rows) < 2:
        return None

    # 按 (open, last) 去重，相邻两行完全相同视为占位重复
    deduped: list[dict] = []
    seen = set()
    for r in rows:
        key = (r.get("open"), r.get("last"), r.get("high"), r.get("low"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)
    if len(deduped) < 2:
        return None

    try:
        latest_close = float(deduped[0]["last"])
        prev_close = float(deduped[1]["last"])
    except (ValueError, KeyError):
        return None

    if prev_close == 0:
        return None

    pct = (latest_close - prev_close) / prev_close * 100
    up = pct >= 0

    if latest_close >= 1000:
        value_str = f"{latest_close:,.2f}"
    elif latest_close >= 100:
        value_str = f"{latest_close:,.2f}"
    else:
        value_str = f"{latest_close:.2f}"

    sign = "+" if up else ""
    change_str = f"{sign}{pct:.2f}%"

    return {"value": value_str, "change": change_str, "up": up}


def fetch_global_indices(prev: list[dict]) -> tuple[list[dict], int]:
    new_list: list[dict] = []
    ok_count = 0
    prev_by_name = {p["name"]: p for p in prev}

    for sym, name in GLOBAL_SYMBOLS:
        fetched = fetch_one_index(sym)
        if fetched:
            ok_count += 1
            new_list.append({"name": name, **fetched})
            print(f"  [OK]    {name:10s} {fetched['value']:>10s} ({fetched['change']})")
        else:
            old = prev_by_name.get(name) or prev_by_name.get(_legacy_name(name)) or {
                "name": name, "value": "—", "change": "—", "up": False
            }
            new_list.append({
                "name": name,
                "value": old.get("value", "—"),
                "change": old.get("change", "—"),
                "up": old.get("up", False),
            })
            print(f"  [STALE] {name:10s} 使用上次值")

    return new_list, ok_count


def _legacy_name(name: str) -> str:
    """兼容上版的展示名"""
    return {
        "黄金 ETF": "COMEX金",
        "白银 ETF": "COMEX银",
        "原油 ETF": "WTI原油",
    }.get(name, name)


# ---------- 新闻抓取（双源：财联社 + 华尔街见闻） ----------

def fetch_news_candidates() -> list[dict]:
    """
    抓取三路新闻源：财联社早报 + 证券时报早知道 + 华尔街见闻早餐
    华尔街见闻经常被反爬，失败时只用其他两路。
    去重策略：相同 title 前 30 字保留先出现的。
    """
    all_items: list[dict] = []

    # 财联社（必跑，最稳定）
    try:
        cls_items, cls_url = fetch_cls_briefing()
        print(f"  [新闻] 财联社早报 {len(cls_items)} 条 ({cls_url})")
        all_items.extend(cls_items)
    except Exception as e:
        print(f"  [新闻] 财联社抓取异常: {e}", file=sys.stderr)

    # 证券时报（必跑）
    try:
        stcn_items, stcn_url = fetch_stcn_briefing()
        print(f"  [新闻] 证券时报早知道 {len(stcn_items)} 条 ({stcn_url})")
        all_items.extend(stcn_items)
    except Exception as e:
        print(f"  [新闻] 证券时报抓取异常: {e}", file=sys.stderr)

    # 华尔街见闻（可选，反爬时跳过）
    try:
        wscn_items, wscn_url = fetch_wscn_breakfast()
        print(f"  [新闻] 华尔街见闻早餐 {len(wscn_items)} 条 ({wscn_url})")
        all_items.extend(wscn_items)
    except Exception as e:
        print(f"  [新闻] 华尔街见闻抓取异常: {e}", file=sys.stderr)

    # 去重
    seen = set()
    deduped: list[dict] = []
    for it in all_items:
        key = (it.get("title") or "")[:30]
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(it)

    return deduped


def archive_news_candidates(items: list[dict], now: datetime) -> None:
    """每日存档，便于复盘"""
    if not items:
        return
    NEWS_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    fname = NEWS_ARCHIVE_DIR / f"{now.strftime('%Y-%m-%d')}.json"
    with fname.open("w", encoding="utf-8") as f:
        json.dump({
            "fetched_at": now.isoformat(),
            "count": len(items),
            "items": items,
        }, f, ensure_ascii=False, indent=2)
    print(f"  [新闻] 已存档 {fname.relative_to(ROOT)}")


# ---------- 主流程 ----------

def main() -> int:
    subtitle, now = today_subtitle()
    is_trading = now.weekday() in TRADING_WEEKDAYS
    tag = "TRADING" if is_trading else "NON-TRADING"
    print(f"[generate_briefing] {tag} day · {subtitle}")

    data = load_briefing()

    # 1. 更新副标题
    old_subtitle = data.get("hero", {}).get("subTitle", "")
    data.setdefault("hero", {})["subTitle"] = subtitle
    print(f"  hero.subTitle: {old_subtitle!r} -> {subtitle!r}")

    # 2. 拉外盘
    print("[Step 2.1] 拉取外盘 6 宫格 (westock)...")
    prev_indices = data.get("globalIndices", [])
    new_indices, ok = fetch_global_indices(prev_indices)
    data["globalIndices"] = new_indices
    print(f"  外盘 {ok}/{len(GLOBAL_SYMBOLS)} 拉取成功")

    # 3. 拉新闻备选池（双源：财联社早报 + 华尔街见闻早餐）
    print("[Step 2.2] 拉取新闻备选池...")
    candidates = fetch_news_candidates()
    archive_news_candidates(candidates, now)
    print(f"  备选新闻共 {len(candidates)} 条 (已存档，前端不读)")
    # 备选池仅落到 data/news-archive/，不写入 briefing.json，
    # 等下一步 LLM 选 TOP 3 + 解读后再写入 briefing.json["news"]

    # 4. 写回
    save_briefing(data)
    print(f"[done] 已写入 {BRIEFING_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
