#!/usr/bin/env python3
"""
Step ②：从备选新闻池中选出对今日 A 股开盘最有交易价值的 TOP 3

输入：list[dict] 备选新闻（已抓取的 47 条）
输出：list[int] TOP 3 在原列表中的下标
"""
from __future__ import annotations

import json
import sys
from llm_client import chat_json, LLMError

SYSTEM_PROMPT = """你是 A 股早报主编。
你的任务：从一组财经新闻里选出对**今日 A 股开盘**最有交易价值的 TOP 3 条。

【优先级评分（高→低）】
1. 政策/监管层级：国务院 / 部委 > 央行 > 行业协会 > 公司公告
2. 影响范围：影响整个板块 > 影响个股 > 影响特定主题
3. 隔夜美股大涨大跌、海外重大事件（如战争/选举/重大并购）
4. 已发酵 2 天以上的旧闻不选
5. 同一主题不同表述只选 1 条
6. 偏好"硬信号"（数据/政策/资金）胜于"软情绪"（评论/猜测）

【输出严格 JSON 格式】
{
  "top3": [
    {"index": 12, "reason": "为什么选它（10-30 字）"},
    {"index": 5,  "reason": "..."},
    {"index": 33, "reason": "..."}
  ]
}

注意：index 必须是输入列表里的真实下标，从 0 开始计数。"""


def pick_top3(candidates: list[dict]) -> list[dict]:
    """
    选 TOP 3 并返回完整新闻条目（带选择理由 reason）

    返回 [
      {"index": 12, "reason": "...", "section": ..., "title": ..., "content": ..., "source": ...},
      ...
    ]
    """
    if not candidates:
        return []

    # 拼装给 LLM 的清单
    lines = []
    for i, it in enumerate(candidates):
        title = (it.get("title") or "")[:80]
        content = (it.get("content") or "")[:200]
        lines.append(f"[{i}] [{it.get('section','?')}] {title}\n     {content}")
    listing = "\n\n".join(lines)

    user_prompt = (
        "下面是今天的备选新闻池，从中选出 TOP 3：\n\n"
        + listing
        + "\n\n请输出 JSON。"
    )

    try:
        result = chat_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=600,
        )
    except LLMError as e:
        print(f"[news_pick] LLM 失败: {e}", file=sys.stderr)
        return []

    top3 = result.get("top3") or []
    picked: list[dict] = []
    seen_idx = set()
    for item in top3:
        idx = item.get("index")
        if not isinstance(idx, int) or idx < 0 or idx >= len(candidates):
            continue
        if idx in seen_idx:
            continue
        seen_idx.add(idx)
        picked.append({
            "index": idx,
            "reason": item.get("reason", ""),
            **candidates[idx],
        })
        if len(picked) == 3:
            break

    return picked


if __name__ == "__main__":
    # 命令行自检：用 data/news-archive 里的当日备选池
    import datetime
    from pathlib import Path

    today = datetime.datetime.now().strftime("%Y-%m-%d")
    archive = Path(__file__).resolve().parent.parent / "data" / "news-archive" / f"{today}.json"
    if not archive.exists():
        print(f"找不到 {archive}，请先跑 generate_briefing.py 抓取新闻", file=sys.stderr)
        sys.exit(1)

    with archive.open("r", encoding="utf-8") as f:
        candidates = json.load(f)["items"]

    print(f"备选 {len(candidates)} 条，正在调 LLM...\n")
    picked = pick_top3(candidates)
    print(f"\nTOP 3:")
    for i, p in enumerate(picked, 1):
        print(f"\n  {i}. [index={p['index']}] {p['title']}")
        print(f"     来源: {p['source']} | 板块: {p['section']}")
        print(f"     选择理由: {p['reason']}")
        print(f"     正文: {p['content'][:200]}...")
