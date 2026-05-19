#!/usr/bin/env python3
"""
晨光股市早报 - 数据生成器（Step 1: 最小版）

当前阶段只做一件事：更新 public/briefing.json 中的 hero.subTitle 为今天的北京时间日期。
后续阶段会接入 Jin10/westockdata 真实行情 + DeepSeek 生成解读文本。

用法：
    python3 scripts/generate_briefing.py

环境：纯 Python 3.13 标准库，无外部依赖。
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# 项目根目录（脚本位于 scripts/ 子目录）
ROOT = Path(__file__).resolve().parent.parent
BRIEFING_PATH = ROOT / "public" / "briefing.json"

WEEKDAY_CN = ["一", "二", "三", "四", "五", "六", "日"]
TRADING_WEEKDAYS = {0, 1, 2, 3, 4}  # Mon-Fri；非交易日仍生成（用户可选择不部署）


def today_subtitle() -> tuple[str, datetime]:
    """生成形如 '2026/05/19 · 星期二 · 盘前必读' 的副标题。"""
    # 北京时间 UTC+8
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


def main() -> int:
    subtitle, now = today_subtitle()
    data = load_briefing()

    old_subtitle = data.get("hero", {}).get("subTitle", "")
    data.setdefault("hero", {})["subTitle"] = subtitle

    save_briefing(data)

    is_trading = now.weekday() in TRADING_WEEKDAYS
    tag = "TRADING" if is_trading else "NON-TRADING"
    print(f"[generate_briefing] {tag} day")
    print(f"  old subTitle: {old_subtitle!r}")
    print(f"  new subTitle: {subtitle!r}")
    print(f"  wrote: {BRIEFING_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
