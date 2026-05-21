#!/usr/bin/env python3
"""
Step 3 of catalyst pipeline: pick 2 stocks per catalyst event.

Input: list of catalysts (each with a `concept` field, from catalyst_pick)
Output: same list with `stocks` field appended, each containing 2 stocks.

Pipeline per catalyst:
  1. Build candidate pool (westock search + concept_leaders fallback dict)
  2. Enrich with kline (5/20/60d return) + asfund (MainNetFlow5D) + profile (industry)
  3. LLM picks 2 with reasons
  4. Validate codes against pool; retry once if mismatch
  5. Final fallback: take first 2 from concept_leaders dict
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from llm_client import chat_json, LLMError
from concept_leaders import lookup_leaders_by_concept

WESTOCK_PKG = "westock-data-clawhub@1.0.4"
WESTOCK_TIMEOUT = 50
MAX_POOL = 12


def _call(args: list[str]) -> str:
    cmd = ["npx", "-y", WESTOCK_PKG, *args]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=WESTOCK_TIMEOUT)
    if r.returncode != 0:
        raise RuntimeError(f"westock failed: {r.stderr or r.stdout}")
    return r.stdout


def _parse_table(text: str) -> list[dict]:
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


def search_concept_stocks(concept: str, limit: int = 30) -> list[dict]:
    """westock search for concept-related stocks"""
    try:
        out = _call(["search", concept])
    except Exception as e:
        print(f"[stocks] search failed for {concept}: {e}", file=sys.stderr)
        return []
    rows = _parse_table(out)
    stocks: list[dict] = []
    for r in rows:
        code = r.get("code", "").strip()
        name = r.get("name", "").strip()
        type_ = r.get("type", "").strip()
        # 只要 A 股 / ETF（GP-A / ETF / QDII-LOF）
        if not code or not name:
            continue
        if not (code.startswith("sh") or code.startswith("sz") or code.startswith("bj")):
            continue
        # 过滤 ST
        if "ST" in name:
            continue
        stocks.append({"code": code, "name": name, "type": type_})
        if len(stocks) >= limit:
            break
    return stocks


def merge_pools(searched: list[dict], leaders: list[dict]) -> list[dict]:
    """合并 westock search 结果 + 兜底字典，去重，截 MAX_POOL"""
    seen = set()
    out: list[dict] = []
    # 优先放 leaders（确定的龙头）
    for s in leaders:
        if s["code"] in seen:
            continue
        seen.add(s["code"])
        out.append({"code": s["code"], "name": s["name"], "type": ""})
    # 再补 searched
    for s in searched:
        if s["code"] in seen:
            continue
        if not (s["code"].startswith("sh") or s["code"].startswith("sz")):
            continue
        if s.get("type") and ("GP-A" not in s["type"] and "ETF" not in s["type"]):
            continue
        seen.add(s["code"])
        out.append(s)
        if len(out) >= MAX_POOL:
            break
    return out[:MAX_POOL]


def fetch_kline_returns(code: str) -> dict:
    """返回 5/20/60 日涨幅 (%) 和最新价"""
    try:
        out = _call(["kline", code, "--period", "day", "--limit", "70"])
    except Exception as e:
        print(f"[stocks] kline {code} failed: {e}", file=sys.stderr)
        return {}
    rows = _parse_table(out)
    if len(rows) < 2:
        return {}
    # 去重占位行
    seen = set()
    deduped = []
    for r in rows:
        key = (r.get("open"), r.get("last"), r.get("high"), r.get("low"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)
    if len(deduped) < 2:
        return {}

    def safe_close(idx: int) -> float | None:
        if idx >= len(deduped):
            return None
        try:
            return float(deduped[idx].get("last", "0"))
        except (ValueError, TypeError):
            return None

    latest = safe_close(0)
    if not latest:
        return {}

    def pct(target_idx: int) -> float | None:
        prev = safe_close(target_idx)
        if not prev or prev == 0:
            return None
        return (latest - prev) / prev * 100

    return {
        "latest": round(latest, 2),
        "ret_5d": pct(5),
        "ret_20d": pct(20),
        "ret_60d": pct(60),
    }


def fetch_asfund(code: str) -> dict:
    """主力资金 5/10/20 日净流入（亿元）"""
    try:
        out = _call(["asfund", code])
    except Exception as e:
        print(f"[stocks] asfund {code} failed: {e}", file=sys.stderr)
        return {}
    rows = _parse_table(out)
    if not rows:
        return {}
    r = rows[0]
    def to_yi(v: str) -> float | None:
        try:
            return round(float(v) / 1e8, 2)
        except (ValueError, TypeError):
            return None
    return {
        "main_5d_yi": to_yi(r.get("MainNetFlow5D", "")),
        "main_10d_yi": to_yi(r.get("MainNetFlow10D", "")),
        "main_today_yi": to_yi(r.get("MainNetFlow", "")),
    }


def fetch_profile(code: str) -> dict:
    """行业 + 业务简介"""
    try:
        out = _call(["profile", code])
    except Exception as e:
        return {}
    rows = _parse_table(out)
    if not rows:
        return {}
    r = rows[0]
    return {
        "industry": (r.get("industry") or "").strip() or "-",
        "business": (r.get("business") or "").strip()[:120] or "",
    }


def enrich_stock(stock: dict) -> dict:
    """并行拉 kline + asfund + profile，合并到 stock"""
    code = stock["code"]
    enriched = {**stock}
    enriched.update(fetch_kline_returns(code))
    enriched.update(fetch_asfund(code))
    enriched.update(fetch_profile(code))
    return enriched


def enrich_pool(pool: list[dict]) -> list[dict]:
    """并发 enrich"""
    enriched: list[dict] = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(enrich_stock, s): s for s in pool}
        for fut in as_completed(futures):
            try:
                enriched.append(fut.result())
            except Exception as e:
                print(f"[stocks] enrich failed: {e}", file=sys.stderr)
    # 保持原顺序
    code_to_data = {e["code"]: e for e in enriched}
    return [code_to_data[s["code"]] for s in pool if s["code"] in code_to_data]


SYSTEM_PROMPT = """# 角色
你是 A 股短线题材交易员。基于一个利好事件 + 一组候选股票（含实时涨幅与主力资金），
选出 2 只最适合在今日盘前关注的标的。

# 选股两层逻辑

## 第 1 层 直接受益（必须满足）
股票必须是该利好的核心受益方：龙头 / 业务占比高 / 产业链关键位置。
靠概念蹭边、业务占比 < 20% 的不选。

## 第 2 层 股性活跃（加分项）
- 5/20 日涨幅适中（不是过热也不是死气沉沉）：5 日 -3% ~ +20% 偏好
- 主力资金近 5 日净流入为正或转正
- 流通市值中盘偏好（100 亿 ~ 1500 亿之间最佳，超大盘弹性差，超小盘风险高）
- 优先选有"龙头属性"或"次新强势"标签的

## 搭配原则
两只股票最好形成"一龙头 + 一弹性"搭配：
- 龙头股：行业内市值前 3，业绩兑现度高，确定性强
- 弹性股：中小市值题材活跃股，弹性大，跟涨幅度大
避免选两只同等定位（都是龙头或都是弹性）。

# 输出 JSON Schema
{
  "stocks": [
    {
      "name": "中际旭创",
      "code": "sz300308",
      "role": "龙头",
      "reason": "30-40 字的入选理由。**核心：必写'受益逻辑'，慎写实时数据**（详见下方 reason 写作规则）"
    },
    {
      "name": "...",
      "code": "...",
      "role": "弹性 / 次新 / 龙头",
      "reason": "..."
    }
  ]
}

# reason 写作规则（CRITICAL — 避免负面数据自爆）

## 必写部分
- **受益逻辑**：该股票为什么是本利好的核心受益方（业务/产品/客户/份额/地位）
- **角色定位**：龙头 / 弹性 / 次新 等定语（1-2 个词即可）

## 选写部分（亮点才写，没亮点宁可不写）

**主力资金 / 涨跌幅这类实时数据是"加分项"，不是必填项。** 
只有数据正面、能支撑选股逻辑时才写；如果数据负面，必须**省略**或**改用其他亮点替代**，
绝不能把负面数据写进 reason，否则等于自爆。

### 涨跌幅写法
- ✅ 写：5/20/60 日涨幅为**正**且呈现"温和上涨/突破/启动"特征（如"20 日 +24.6% 突破均线"）
- ✅ 写：5 日横盘整理、20 日累计微涨（"近期横盘蓄势"）
- ❌ 不写：5 日大跌（"5 日 -8.4%"绝不能出现）
- ❌ 不写：60 日跌幅大（"60 日 -15%"也不写）
- ❌ 不写：单日异常波动

### 主力资金写法
- ✅ 写：主力 5 日净**流入**（"主力 5 日净流入 12.5 亿"）
- ✅ 写：主力净流入占流通比高、排名靠前
- ❌ 不写：主力净流出（"主力 5 日 -17.9 亿"绝不能出现）
- ❌ 不写：哪怕轻微流出也不写

### 没有正面数据怎么办？
不要硬凑数据，改用以下亮点替代：
- 业务地位：全球龙头 / 国内市占率第一 / 客户独家供应
- 业绩兑现：已批量出货 / 订单可见 Q3 / 业绩同比大增
- 产业地位：核心代工商 / 关键材料供应商 / 唯一国产替代
- 题材属性：板块龙一 / 历史强势股 / 资金抱团对象
- 估值与机构：北向重仓 / 公募加仓 / 机构集中调研

### 示例对比

❌ **错误（含负面数据）**：
"风电运营弹性标的，20 日 +13.9%，60 日 +47.3%，主力 5 日 -17.9 亿，股性活跃。"
（5 日 -8.4% 和主力净流出 -17.9 亿都是减分项，绝不该写进 reason）

✅ **正确（替换为正面属性）**：
"国内风电运营第二梯队龙头，绿电交易弹性突出，板块情绪修复期估值修复空间大。"

❌ **错误**：
"AR 光波导核心供应商，主力 5 日 -3.43 亿，弹性强。"
（主力流出 3.43 亿不该写）

✅ **正确**：
"AR 光波导核心供应商，深度绑定 Meta/谷歌客户，智能眼镜放量首选标的，弹性强。"

# 严格约束
- 必须 2 只
- code 必须从输入候选清单里 verbatim 复制（前缀 sh/sz/bj 不能改）
- reason 必须 30-40 字（少于 28 字或多于 45 字均不合格）
- reason **严禁出现负数**（如 -8.4% / -17.9 亿 / 净流出 / 跌幅 等表述）
- reason 实时数据为可选，亮点才写
- 严禁推荐买入 / 绝对化措辞（"必涨/抄底/建议买入"）
- 优先一龙一弹搭配"""


def llm_pick_stocks(
    concept: str,
    catalyst: str,
    pool: list[dict],
    exclude_codes: list[str] | None = None,
) -> list[dict]:
    if not pool:
        return []
    exclude_codes = exclude_codes or []

    lines = []
    for i, s in enumerate(pool):
        ret_5d = s.get("ret_5d")
        ret_20d = s.get("ret_20d")
        ret_60d = s.get("ret_60d")
        m5 = s.get("main_5d_yi")
        ind = s.get("industry", "-")
        biz = s.get("business", "")[:60]
        ret_str = (
            f"5日{ret_5d:+.1f}% / 20日{ret_20d:+.1f}% / 60日{ret_60d:+.1f}%"
            if ret_5d is not None and ret_20d is not None and ret_60d is not None
            else "(无数据)"
        )
        m5_str = f"主力5日{m5:+.2f}亿" if m5 is not None else "主力(无数据)"
        lines.append(
            f"[{i}] {s['name']} {s['code']} | 行业:{ind} | {ret_str} | {m5_str}\n"
            f"     业务: {biz}"
        )

    user_prompt = (
        f"# 利好概念: {concept}\n"
        f"# 利好催化: {catalyst}\n\n"
        f"# 候选股池 ({len(pool)} 只):\n"
        + "\n\n".join(lines)
        + (
            f"\n\n# 已被另一利好选过(本次禁选): {', '.join(exclude_codes)}\n"
            if exclude_codes else "\n"
        )
        + "\n按 schema 输出 2 只。code 必须从池里 verbatim 复制。"
    )

    try:
        result = chat_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=600,
        )
    except LLMError as e:
        print(f"[stocks] LLM failed: {e}", file=sys.stderr)
        return []

    stocks = result.get("stocks", []) or []
    # reason 兜底审查：扫描负面数据关键词，命中就打 warning（CI 可见）
    BAD_PATTERNS = [
        "净流出", "流出", "跌幅", "下跌", "回调",
    ]
    BAD_NUM_RE = re.compile(r"-\s*\d+(\.\d+)?\s*(%|亿|万)")
    for s in stocks:
        reason = s.get("reason", "")
        hits = [p for p in BAD_PATTERNS if p in reason]
        if BAD_NUM_RE.search(reason):
            hits.append("含负数")
        if hits:
            print(f"[stocks] WARN reason 含负面数据 {hits}: {reason}", file=sys.stderr)
    return stocks


def validate_picks(picks: list[dict], pool: list[dict]) -> tuple[list[dict], list[str]]:
    """验证 picks 里的 code 都在 pool 里。返回 (valid, invalid_codes)"""
    pool_codes = {s["code"] for s in pool}
    valid: list[dict] = []
    invalid: list[str] = []
    seen = set()
    for p in picks:
        code = (p.get("code") or "").strip()
        if not code:
            continue
        if code in seen:
            continue
        seen.add(code)
        if code not in pool_codes:
            invalid.append(code)
            continue
        valid.append(p)
    return valid, invalid


def fallback_from_dict(concept: str, exclude_codes: list[str] | None = None) -> list[dict]:
    """终极兜底：从 concept_leaders 字典挑 2 只"""
    exclude_codes = exclude_codes or []
    leaders = lookup_leaders_by_concept(concept)
    out: list[dict] = []
    for s in leaders:
        if s["code"] in exclude_codes:
            continue
        out.append({
            "name": s["name"],
            "code": s["code"],
            "role": "龙头",
            "reason": f"{concept}板块代表性活跃股，作为兜底候选纳入。",
        })
        if len(out) == 2:
            break
    return out


def pick_stocks_for_catalyst(
    catalyst_item: dict,
    exclude_codes: list[str] | None = None,
) -> list[dict]:
    """主入口：给一个利好选 2 只受益股"""
    concept = (catalyst_item.get("concept") or "").strip()
    catalyst_text = catalyst_item.get("catalyst", "")
    exclude_codes = exclude_codes or []

    if not concept:
        return fallback_from_dict("", exclude_codes)

    print(f"\n[stocks] === concept: {concept} ===", file=sys.stderr)

    # 1. 候选池
    leaders = lookup_leaders_by_concept(concept)
    searched = search_concept_stocks(concept, limit=20)
    pool = merge_pools(searched, leaders)
    if not pool:
        print(f"[stocks] empty pool for {concept}, use fallback", file=sys.stderr)
        return fallback_from_dict(concept, exclude_codes)

    # 排除已选
    pool = [s for s in pool if s["code"] not in exclude_codes]
    print(f"[stocks] pool size: {len(pool)}", file=sys.stderr)

    # 2. 实时数据 enrich
    enriched = enrich_pool(pool)
    if not enriched:
        return fallback_from_dict(concept, exclude_codes)

    # 3. LLM 选
    picks = llm_pick_stocks(concept, catalyst_text, enriched, exclude_codes)
    valid, invalid = validate_picks(picks, enriched)

    # 4. 重试
    if len(valid) < 2 and invalid:
        print(f"[stocks] retry, invalid codes: {invalid}", file=sys.stderr)
        retry = llm_pick_stocks(
            concept,
            catalyst_text + f"\n\n注意: 上一轮你选了无效代码 {invalid}, 请严格从池中选.",
            enriched,
            exclude_codes,
        )
        more_valid, _ = validate_picks(retry, enriched)
        # 合并：保留首轮 valid, 补充 retry 中不重复的
        seen = {p["code"] for p in valid}
        for p in more_valid:
            if p["code"] not in seen:
                valid.append(p)
                seen.add(p["code"])
            if len(valid) >= 2:
                break

    # 5. 最终兜底
    if len(valid) < 2:
        print(f"[stocks] still {len(valid)}/2, append fallback", file=sys.stderr)
        existing = {p["code"] for p in valid}
        for fb in fallback_from_dict(concept, list(exclude_codes) + list(existing)):
            if fb["code"] not in existing:
                valid.append(fb)
                existing.add(fb["code"])
            if len(valid) >= 2:
                break

    # 附加实时数据回输出（前端可选用）
    code_to_data = {e["code"]: e for e in enriched}
    for p in valid[:2]:
        ed = code_to_data.get(p["code"], {})
        if ed:
            p["industry"] = ed.get("industry", "")
            p["ret_5d"] = ed.get("ret_5d")
            p["ret_20d"] = ed.get("ret_20d")
            p["ret_60d"] = ed.get("ret_60d")
            p["main_5d_yi"] = ed.get("main_5d_yi")

    return valid[:2]


def attach_stocks_to_top2(top2: list[dict]) -> list[dict]:
    """对 catalyst_pick 输出的 top2 列表，逐个补上 stocks 字段"""
    used_codes: list[str] = []
    out: list[dict] = []
    for cat in top2:
        stocks = pick_stocks_for_catalyst(cat, exclude_codes=used_codes)
        used_codes.extend([s["code"] for s in stocks])
        out.append({**cat, "stocks": stocks})
    return out


if __name__ == "__main__":
    # 调试: 拿 5/21 实测利好测一下
    demo_top2 = [
        {
            "concept": "绿电",
            "catalyst": "国家发改委、能源局发文升级多用户绿电直连政策，绿电消纳价值有望系统重估。",
        },
        {
            "concept": "智能眼镜",
            "catalyst": "谷歌 I/O 大会确认 Gemini 智能眼镜将于 2026 秋上市，AI 智能穿戴出货预期上修。",
        },
    ]
    result = attach_stocks_to_top2(demo_top2)
    print(json.dumps(result, ensure_ascii=False, indent=2))
