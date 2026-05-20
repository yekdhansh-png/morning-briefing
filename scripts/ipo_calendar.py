#!/usr/bin/env python3
"""
新股申购日历抓取（westock ipo + profile）

目标：未来 7 天（含今天）即将申购的新股
- 调 westock ipo 拿 IPO 流程列表
- 按 sgrq（申购日期）过滤，只保留 [今日, 今日+6] 区间
- 用 profile 命令补行业（不一定有，拿不到就 "待披露"）
- 推断板块（沪 600/603 主板 / 688 科创板 / 深 002/000 主板 / 300 创业板）

返回 list[dict]：
  {
    "code": "sh688635",         # 完整 westock 代码
    "shortCode": "688635",      # 6 位股票代码（前端展示）
    "name": "长进光子",
    "price": "40.98",
    "industry": "光通信",        # 拉不到时 "待披露"
    "applyDate": "2026-05-22",  # YYYY-MM-DD
    "board": "科创板",           # 创业板/科创板/主板
    "boardColor": "blue",        # green=创业板 / blue=科创板/主板
  }
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone

WESTOCK_PKG = "westock-data-clawhub@1.0.4"
WESTOCK_TIMEOUT = 60
WINDOW_DAYS = 7  # 含今天的未来 7 天


def _call_westock(args: list[str]) -> str:
    cmd = ["npx", "-y", WESTOCK_PKG, *args]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=WESTOCK_TIMEOUT)
    if r.returncode != 0:
        raise RuntimeError(f"westock failed: {r.stderr or r.stdout}")
    return r.stdout


def _parse_table(text: str) -> list[dict]:
    """解析 markdown 表格 → list[dict]"""
    rows: list[dict] = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip().startswith("|")]
    if len(lines) < 3:
        return rows
    header = [c.strip() for c in lines[0].strip("|").split("|")]
    for ln in lines[2:]:
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if len(cells) == len(header):
            rows.append(dict(zip(header, cells)))
    return rows


def _today_bj() -> datetime:
    return datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8)))


def _classify_board(code: str) -> tuple[str, str]:
    """
    根据 westock code 推断板块和颜色
    sh688xxx → 科创板（blue）
    sh600xxx / sh603xxx / sh605xxx → 主板（blue）
    sz300xxx → 创业板（green）
    sz002xxx / sz000xxx / sz001xxx → 深市主板（green）
    sz301xxx → 创业板二代（green）
    bj430/833/87/88/9xxxxx → 北交所（blue）
    """
    short = code.replace("sh", "").replace("sz", "").replace("bj", "").strip()
    if short.startswith("688"):
        return "科创板", "blue"
    if short.startswith("300") or short.startswith("301"):
        return "创业板", "green"
    if short.startswith("8") or short.startswith("4") or short.startswith("9"):
        return "北交所", "blue"
    # 600/601/603/605/000/001/002 都视为主板
    return "主板", "blue"


def _short_code(code: str) -> str:
    return code.replace("sh", "").replace("sz", "").replace("bj", "")


def _fetch_industry(code: str) -> str:
    """用 profile 命令补行业，拿不到返回 '待披露'"""
    try:
        out = _call_westock(["profile", code])
    except Exception:
        return "待披露"
    rows = _parse_table(out)
    if not rows:
        return "待披露"
    industry = (rows[0].get("industry") or "").strip()
    if industry and industry != "-":
        return industry
    return "待披露"


def fetch_ipo_calendar() -> list[dict]:
    """
    返回未来 7 天（含今天）即将申购的新股列表
    无即将申购的返回 []
    """
    try:
        out = _call_westock(["ipo"])
    except Exception as e:
        print(f"[ipo] westock 调用失败: {e}", file=sys.stderr)
        return []

    rows = _parse_table(out)
    if not rows:
        print("[ipo] westock ipo 返回空表", file=sys.stderr)
        return []

    today = _today_bj().date()
    horizon = today + timedelta(days=WINDOW_DAYS - 1)

    result: list[dict] = []
    for row in rows:
        sgrq = (row.get("sgrq") or "").strip()
        if not sgrq or sgrq == "--":
            continue
        try:
            apply_date = datetime.strptime(sgrq, "%Y-%m-%d").date()
        except ValueError:
            continue

        # 只保留 [today, today+6]
        if apply_date < today or apply_date > horizon:
            continue

        code = (row.get("code") or "").strip()
        name = (row.get("name") or "").strip()
        price = (row.get("price") or "").strip()
        if not code or not name:
            continue

        board, board_color = _classify_board(code)
        industry = _fetch_industry(code)

        result.append({
            "code": code,
            "shortCode": _short_code(code),
            "name": name,
            "price": price,
            "industry": industry,
            "applyDate": sgrq,
            "board": board,
            "boardColor": board_color,
        })
        print(f"  [IPO] {name} ({code}) 申购日 {sgrq} 板块 {board} 行业 {industry}")

    return result


if __name__ == "__main__":
    items = fetch_ipo_calendar()
    print()
    print(f"未来 {WINDOW_DAYS} 天可申购新股 {len(items)} 只")
    print()
    print(json.dumps(items, ensure_ascii=False, indent=2))
