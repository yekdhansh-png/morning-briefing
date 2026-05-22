#!/usr/bin/env python3
"""
全球资产 · 综合解读（顶部 GlobalMarketCard 那段总览文字）

输入：
  1) 6 资产涨跌幅（前 3 美股指数 + COMEX 金/银 + WTI 油）
  2) 财联社最新一篇美股收评全文（含板块/个股/驱动逻辑）

输出：80-100 字综合解读文本（plain string）

Prompt 三步式：
  ① 整体格局抽象（"股弱、贵金属强、原油弱"）
  ② 驱动逻辑（说清"为什么"）
  ③ A 股映射（说清"对哪些板块利好/承压"）
"""
from __future__ import annotations

import json
import sys

from llm_client import chat, LLMError


SYSTEM_PROMPT = """# 角色
你是一位被卖方研究所训练了 10 年的"二级市场翻译官"。
你的工作不是复述外盘行情，而是把隔夜外盘动向翻译成 A 股投资者关心的
"风险偏好/驱动逻辑/受益板块"语言。

# 任务
我会给你两路输入：
  (A) 6 大全球资产涨跌幅（美股三大指数 + COMEX 金/银 + WTI 原油）
  (B) 财联社最新一篇美股收评全文（含驱动逻辑、机构观点、板块/个股表现、公司消息）

请输出一段 80-100 字的"全球资产 · 综合解读"，少于 70 / 多于 110 不合格。

# 内容三步骤（必须按顺序）
1. **整体格局抽象**（约 15-25 字）：把 6 个资产的涨跌压缩成一句"格局"判断。
   常用模板：股强/股弱、贵金属强/弱、原油强/弱、风险偏好回升/回落。
2. **驱动逻辑**（约 30-45 字）：用美股收评里的关键事实解释"为什么"。
   要从收评原文里提取最关键的一两个驱动因子（美债收益率/通胀/加息预期/
   地缘冲突/财报季/AI 主题/某板块异动）。严禁瞎编原文没有的数字。
3. **A 股映射**（约 25-35 字）：必须给出**具体板块名**（AI 算力/光通信/出口链/有色等），
   不能泛泛说"利好市场"。

# 写作风格
- ✅ 卖方术语：风险偏好抬升/回落、估值压制解除、共振走强、比价映射、正向/负向映射
- ✅ 节奏副词：或、有望、大概率、短期、边际
- ❌ 绝对化措辞、投资建议、罗列个股、复述行情数字、凭空数字

# 输出
只输出一段纯文本（不要任何前后缀、JSON、引号包裹）。

# 风格范例

输入示例：纳指 -0.84% 标普 -0.67% 道指 -0.65% COMEX 金 +0.14% 银 +2.33% 油 -1.82%；
收评提到"美债收益率飙升打压风险偏好"+"光通信 Astera Labs 涨 13.3% 领涨费半"

输出示例：
全球呈现'股弱、贵金属偏强、原油走弱'的分化格局。美债 30 年收益率创 19 年新高压制美股风险偏好，但费城半导体逆势走平、光通信链领涨，AI 主题韧性仍在。对 A 股 AI 算力与光模块板块构成正向比价映射，石化与出口链短期承压，有色金属或受益于贵金属共振。"""


USER_PROMPT_TPL = """=== (A) 6 大全球资产涨跌幅 ===
{quotes_text}

=== (B) 美股收评全文 ===
标题：{us_close_title}

正文：
{us_close_content}

请按 system 说明，输出 80-100 字的全球资产综合解读（纯文本）。"""


def _format_quotes(quotes: list[dict]) -> str:
    """把 globalIndices 数组格式化成 prompt 友好的多行文本"""
    lines = []
    for q in quotes:
        lines.append(f"- {q['name']}: {q['value']} ({q['change']})")
    return "\n".join(lines)


def generate_global_summary(quotes: list[dict], us_close: dict) -> str | None:
    """
    返回 80-100 字的综合解读文本；失败返回 None
    """
    if not quotes or not us_close:
        return None

    user_prompt = USER_PROMPT_TPL.format(
        quotes_text=_format_quotes(quotes),
        us_close_title=us_close.get("title", ""),
        us_close_content=us_close.get("content", "")[:3000],
    )

    try:
        summary = chat(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=400,
        )
    except LLMError as e:
        print(f"[global_summary] LLM 失败: {e}", file=sys.stderr)
        return None

    summary = (summary or "").strip().strip('"').strip("'")
    if not summary:
        return None

    if len(summary) < 60:
        print(f"[global_summary] summary 过短 {len(summary)} 字", file=sys.stderr)
    if len(summary) > 130:
        print(f"[global_summary] summary 过长 {len(summary)} 字（仅警告）", file=sys.stderr)
    return summary


if __name__ == "__main__":
    from pathlib import Path
    ROOT = Path(__file__).resolve().parent.parent
    briefing = json.loads((ROOT / "public" / "briefing.json").read_text(encoding="utf-8"))
    quotes = briefing.get("globalIndices") or briefing.get("globalMarket") or []

    uc_path = Path("/tmp/us_close_latest.json")
    if not uc_path.exists():
        print("先跑 scripts/news_us_close.py 生成 /tmp/us_close_latest.json", file=sys.stderr)
        sys.exit(1)
    us_close = json.loads(uc_path.read_text(encoding="utf-8"))

    out = generate_global_summary(quotes, us_close)
    print()
    print("=" * 60)
    if out:
        print(f"summary ({len(out)} 字)：")
        print(out)
    else:
        print("失败")
