#!/usr/bin/env python3
"""
全球资产 · 综合解读（顶部 GlobalMarketCard 那段总览文字）

输入：
  1) 6 资产涨跌幅（前 3 美股指数 + COMEX 金/银 + WTI 油）
  2) 财联社最新一篇美股收评全文（含板块/个股/驱动逻辑）

输出：80-100 字的综合解读文本（plain string，不是 JSON）

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

请基于这两路信息，写一段 **80-100 字** 的"全球资产 · 综合解读"。
**字数严格 80-100 字**，少于 70 或多于 110 视为不合格。

# 内容三步骤（必须按顺序，缺一不可）
1. **整体格局抽象**（约 15-25 字）：把 6 个资产的涨跌压缩成一句"格局"判断。
   句式如"全球呈现'X 强、Y 弱、Z 分化'的组合"。
   常用模板：股强/股弱、贵金属强/弱、原油强/弱、风险偏好回升/回落。

2. **驱动逻辑**（约 30-45 字）：用美股收评里的关键事实解释"为什么"。
   要从收评原文里提取最关键的一两个驱动因子（如美债收益率/通胀/加息预期/
   地缘冲突/财报季/AI 主题/某板块异动）。
   严禁瞎编原文没有的数字或事件。

3. **A 股映射**（约 25-35 字）：翻译为对 A 股板块的影响判断。
   必须给出**具体板块名**（如 AI 算力/光通信/出口链/有色/石化/创新药），
   不能泛泛说"利好市场"。
   用"对 X、Y 板块构成正向/负向映射"或"X 板块或受益、Y 板块短期承压"句式。

# 写作风格
## ✅ 必须做
- 使用卖方术语：风险偏好抬升/回落、估值压制解除、共振走强、比价映射、正向/负向映射
- 节奏副词留余地：或、有望、大概率、短期、边际
- 量化优先但**只用收评原文已有的数字**（如某个具体涨幅、收益率水平）
- 必要时可以点 1-2 个**板块**名（如"AI 算力""光通信""有色""石化"），但不点个股

## ❌ 严格禁止
1. 绝对化措辞：必涨/必跌/抄底/牛市来了
2. 投资建议：建议买入/推荐持有/赶紧上车
3. 罗列个股：不要写"英伟达跌 0.77%、Astera Labs 涨 13.3%"——这是收评细节，应抽象成"光通信板块逆势走强"
4. 复述行情：不要把 6 资产涨跌幅原样念一遍
5. 凭空数字：收评没有的数字一律不写

# 输出格式
- 只输出一段中文文本，不要分点、不要换行、不要 markdown
- 不要 JSON、不要前后缀解释、不要"以下是解读："
- 直接给最终的 80-100 字总览

# 风格范例（密度和句式严格模仿）

**示例 1**：
输入：纳指 -0.84%、标普 -0.67%、道指 -0.65%、COMEX 金 +0.14%、COMEX 银 +2.33%、WTI 油 -1.82%；收评提到"美债收益率飙升打压风险偏好""光通信概念股 Astera Labs 涨 13.3% 领涨费城半导体"
输出：
全球呈现"股弱、贵金属偏强、原油走弱"的分化格局。美债 30 年收益率创 19 年新高压制美股风险偏好，但费城半导体逆势走平、光通信链领涨，AI 主题韧性仍在。对 A 股 AI 算力与光模块板块构成正向比价映射，石化与出口链短期承压，有色金属或受益于贵金属共振。

**示例 2**：
输入：纳指 +1.20%、标普 +0.88%、道指 +0.45%、COMEX 金 -0.50%、COMEX 银 -0.80%、WTI 油 +2.30%；收评提到"美联储官员鸽派表态降息预期升温""英伟达财报超预期带动半导体链"
输出：
全球呈现"股强、贵金属偏弱、原油走强"的风险偏好回升组合。美联储官员鸽派表态叠加英伟达财报超预期，估值压制有望边际解除，半导体与 AI 算力链共振走强。对 A 股 AI 算力、半导体设备板块构成正向映射，原油上行利好油气产业链，但黄金板块短期或承压。"""


USER_PROMPT_TPL = """=== (A) 6 大全球资产涨跌幅 ===
{quotes_text}

=== (B) 美股收评全文 ===
标题：{us_close_title}

正文：
{us_close_content}

请按 system 说明，输出 80-100 字的"全球资产 · 综合解读"。
直接输出文本，不要任何前后缀。"""


def _format_quotes(quotes: list[dict]) -> str:
    """把 globalIndices 数组格式化成 prompt 友好的多行文本"""
    lines = []
    for q in quotes:
        lines.append(f"- {q['name']}: {q['value']} ({q['change']})")
    return "\n".join(lines)


def generate_global_summary(quotes: list[dict], us_close: dict) -> str | None:
    """
    返回 80-100 字的解读文本；失败返回 None

    quotes: [{name, value, change, up}, ...] 来自 generate_briefing 的 globalIndices
    us_close: {title, content, url, length} 来自 news_us_close.fetch_us_close()
    """
    if not quotes or not us_close:
        return None

    user_prompt = USER_PROMPT_TPL.format(
        quotes_text=_format_quotes(quotes),
        us_close_title=us_close.get("title", ""),
        us_close_content=us_close.get("content", "")[:3000],  # 安全截断
    )

    try:
        text = chat(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=300,
        )
    except LLMError as e:
        print(f"[global_summary] LLM 失败: {e}", file=sys.stderr)
        return None

    text = (text or "").strip()
    # 简单字数校验
    if not text:
        return None
    if len(text) < 60:
        print(f"[global_summary] 输出过短 {len(text)} 字: {text}", file=sys.stderr)
    if len(text) > 130:
        print(f"[global_summary] 输出过长 {len(text)} 字（仅警告）", file=sys.stderr)
    return text


if __name__ == "__main__":
    # 调试：从 briefing.json + /tmp/us_close_latest.json 读，跑一次
    from pathlib import Path
    ROOT = Path(__file__).resolve().parent.parent
    briefing = json.loads((ROOT / "public" / "briefing.json").read_text(encoding="utf-8"))
    quotes = briefing.get("globalIndices") or briefing.get("globalMarket") or []

    uc_path = Path("/tmp/us_close_latest.json")
    if not uc_path.exists():
        print("先跑 scripts/news_us_close.py 生成 /tmp/us_close_latest.json", file=sys.stderr)
        sys.exit(1)
    us_close = json.loads(uc_path.read_text(encoding="utf-8"))

    summary = generate_global_summary(quotes, us_close)
    print()
    print("=" * 60)
    print(f"输出（{len(summary or '') } 字）：")
    print("=" * 60)
    print(summary)
