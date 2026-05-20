#!/usr/bin/env python3
"""
Step ③：对单条新闻做深度解读

输入：单条新闻 dict（含 title / content）
输出：符合前端 NewsItem schema 的 JSON：
  - title          (清洗后的标题，60 字内)
  - signal         (核心信号 50 字内)
  - signalDetails  (3 段展开，每段 tag + content)
  - affectedIcon   (1 个 emoji)
  - affectedName   (受影响最直接板块，5 字内)
  - affectedDirection ("正面" / "负面")
  - strength       ("强" / "中" / "弱")
"""
from __future__ import annotations

import json
import sys

from llm_client import chat_json, LLMError

SYSTEM_PROMPT = """你是 A 股早盘策略分析师。
你拿到一条财经新闻，需要把它写成早报里的"重磅要闻"卡片，输出严格 JSON。

【输出 JSON schema（所有字段必填）】
{
  "title": "60 字内的精炼标题，去掉编号/前缀冗余词",
  "signal": "50 字内的核心信号，回答'对今日市场意味着什么'",
  "signalDetails": [
    {"tag": "8 字内分类（如 '驱动逻辑' / '受益方向' / '风险提示'）", "content": "30-60 字详细解读"},
    {"tag": "...", "content": "..."},
    {"tag": "...", "content": "..."}
  ],
  "affectedIcon": "1 个最贴切的 emoji",
  "affectedName": "受影响最直接的板块名（≤5 字，如 '光通信'/'有色'/'地产'）",
  "affectedDirection": "正面 或 负面",
  "strength": "强 或 中 或 弱"
}

【写作要求】
- signal 必须高浓度：先因后果（"X 利好 → Y 板块情绪修复"）
- signalDetails 必须三段，依次给出"驱动逻辑/受益方向/风险或节奏"
- affectedName 控制在 5 字内，不要写"AI 算力板块"，写"AI 算力"或"算力网"
- emoji 选 1 个最具代表性的（🚀⚡💡🚢📈🛢️⛽💰🏭🌐 等）
- strength 判定：影响整个板块且持续多日 = 强；阶段性波动 = 中；情绪短暂扰动 = 弱
- direction：利好 = 正面；利空 = 负面（基本不出现"中性"，需要强行判一边）
- 全部中文，简洁专业"""


def analyze_one(news: dict) -> dict:
    """
    返回 NewsItem dict（不含 no 字段，由调用方填）；失败返回 {}
    """
    user_prompt = (
        "新闻原文：\n"
        f"标题：{news.get('title','')}\n"
        f"正文：{news.get('content','')}\n\n"
        "请按 schema 输出 JSON。"
    )
    try:
        result = chat_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=800,
        )
    except LLMError as e:
        print(f"[news_analyze] LLM 失败: {e}", file=sys.stderr)
        return {}

    # 校验必填字段
    required = ["title", "signal", "signalDetails", "affectedIcon", "affectedName", "affectedDirection", "strength"]
    if not all(k in result for k in required):
        print(f"[news_analyze] 输出缺字段: {set(required) - set(result.keys())}", file=sys.stderr)
        return {}

    # 规范化
    if result.get("affectedDirection") not in ("正面", "负面"):
        result["affectedDirection"] = "正面"
    if result.get("strength") not in ("强", "中", "弱"):
        result["strength"] = "中"

    # signalDetails 严格三段
    details = result.get("signalDetails") or []
    if len(details) > 3:
        details = details[:3]
    while len(details) < 3:
        details.append({"tag": "补充", "content": ""})
    result["signalDetails"] = details

    return result


def analyze_top3(picked: list[dict]) -> list[dict]:
    """
    把 pick_top3() 的输出转换成前端 NewsItem 列表（含 no 字段）
    """
    result: list[dict] = []
    for i, item in enumerate(picked[:3], 1):
        analyzed = analyze_one(item)
        if not analyzed:
            continue
        # 拼装前端 schema
        result.append({
            "no": f"{i:02d}",   # "01" / "02" / "03"
            "title": analyzed["title"],
            "signal": analyzed["signal"],
            "signalDetails": analyzed["signalDetails"],
            "affectedIcon": analyzed["affectedIcon"],
            "affectedName": analyzed["affectedName"],
            "affectedDirection": analyzed["affectedDirection"],
            "strength": analyzed["strength"],
        })
    return result


if __name__ == "__main__":
    # 自检：用 /tmp/picked.json 跑一次完整流程
    from pathlib import Path
    picked_file = Path("/tmp/picked.json")
    if not picked_file.exists():
        print("先跑 news_pick.py 生成 /tmp/picked.json", file=sys.stderr)
        sys.exit(1)
    picked = json.load(picked_file.open("r", encoding="utf-8"))
    out = analyze_top3(picked)
    out_file = Path("/tmp/analyzed.json")
    out_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {out_file}")
    print(f"\n{len(out)} 条解读完成")
