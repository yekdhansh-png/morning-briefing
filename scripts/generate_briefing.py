#!/usr/bin/env python3
"""
晨光股市早报 - 数据生成器（Step 2.1: 接入隔夜外盘真实行情）

- 更新 hero.subTitle 为今天的北京时间日期
- 拉取 6 个外盘标的的最新行情（Stooq 免费 CSV 接口，无需 API Key）
  - 纳斯达克 ^NDQ / 标普500 ^SPX / 道琼斯 ^DJI
  - COMEX金 GC.F / COMEX银 SI.F / WTI原油 CL.F
- 拉失败时保留旧值 + 标记 stale，不阻塞构建

后续阶段会接入更多模块（自选股、新闻、AI 解读）。

环境：纯 Python 3 标准库，无外部依赖。
"""
from __future__ import annotations

import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRIEFING_PATH = ROOT / "public" / "briefing.json"

WEEKDAY_CN = ["一", "二", "三", "四", "五", "六", "日"]
TRADING_WEEKDAYS = {0, 1, 2, 3, 4}

# 外盘 6 标的 - Stooq symbol 与展示名映射
GLOBAL_SYMBOLS = [
    ("^NDQ", "纳斯达克"),
    ("^SPX", "标普500"),
    ("^DJI", "道琼斯"),
    ("GC.F", "COMEX金"),
    ("SI.F", "COMEX银"),
    ("CL.F", "WTI原油"),
]
STOOQ_TIMEOUT = 8  # 秒


# ---------- 工具函数 ----------

def today_subtitle() -> tuple[str, datetime]:
    """生成形如 '2026/05/19 · 星期二 · 盘前必读' 的副标题"""
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


def http_get(url: str, timeout: int = STOOQ_TIMEOUT) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace").strip()


# ---------- 外盘数据拉取 ----------

def fetch_one_index(stooq_sym: str) -> dict | None:
    """
    从 Stooq 拉单个标的；返回 {value, change, up} 或 None
    Stooq CSV 格式：Symbol,Date,Open,High,Low,Close,Volume
    涨跌按 (close - open) / open 计算（盘中相对开盘）
    """
    url = f"https://stooq.com/q/l/?s={stooq_sym}&f=sd2ohlcv&h&e=csv"
    try:
        text = http_get(url)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"  [WARN] {stooq_sym} 网络错误: {e}", file=sys.stderr)
        return None

    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        return None
    fields = lines[1].split(",")
    if len(fields) < 6 or fields[2] in ("N/D", ""):
        return None

    try:
        op = float(fields[2])
        close = float(fields[5])
    except (ValueError, IndexError):
        return None
    if op == 0:
        return None

    pct = (close - op) / op * 100
    up = pct >= 0

    # 大数字千分位 + 小数控制
    if close >= 1000:
        value_str = f"{close:,.2f}"
    elif close >= 100:
        value_str = f"{close:,.2f}"
    else:
        value_str = f"{close:.2f}"

    sign = "+" if up else ""
    change_str = f"{sign}{pct:.2f}%"

    return {"value": value_str, "change": change_str, "up": up}


def fetch_global_indices(prev: list[dict]) -> tuple[list[dict], int]:
    """
    返回 (新数据, 拉取成功数量)
    任何一个失败时使用 prev 里的旧值
    """
    new_list: list[dict] = []
    ok_count = 0
    prev_by_name = {p["name"]: p for p in prev}

    for sym, name in GLOBAL_SYMBOLS:
        fetched = fetch_one_index(sym)
        if fetched:
            ok_count += 1
            new_list.append({"name": name, **fetched})
            print(f"  [OK] {name:10s} {fetched['value']:>10s} ({fetched['change']})")
        else:
            old = prev_by_name.get(name, {"name": name, "value": "—", "change": "—", "up": False})
            new_list.append({"name": name, "value": old.get("value", "—"),
                              "change": old.get("change", "—"), "up": old.get("up", False)})
            print(f"  [STALE] {name:10s} 使用上次值")

    return new_list, ok_count


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
    print("[Step 2.1] 拉取外盘 6 宫格...")
    prev_indices = data.get("globalIndices", [])
    new_indices, ok = fetch_global_indices(prev_indices)
    data["globalIndices"] = new_indices
    print(f"  外盘 {ok}/{len(GLOBAL_SYMBOLS)} 拉取成功")

    # 3. 写回
    save_briefing(data)
    print(f"[done] 已写入 {BRIEFING_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
