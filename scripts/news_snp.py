#!/usr/bin/env python3
"""
SNP 后台资讯抓取（封装 westock-snp-news skill）

主要能力：
1. 通用 search：抠 CLI 末尾的 JSON 段，避开 banner 文本解析
2. 通用 detail：抓单条资讯完整正文（HTML 内容）
3. fetch_szzd_today()：拉今日上证早知道并把正文拆成结构化章节

环境：
- 依赖 ~/.workbuddy/skills/westock-snp-news/scripts/index.js
- 通过 --env-file 加载 ~/.workbuddy/skills/westock-snp-news/.env（SNP_MCP_TOKEN）

正文章节切分逻辑（按上证早知道 5/21 实测）：
- 今日提示 / 上证精选 / 上证聚焦 / 产业情报 / 公司新闻 / 资金观潮
- 每条事件以 "·" 或 "○" 开头，可能含 <strong> 加粗标题
- "上证聚焦/产业情报" 含机构观点（银河/华泰/中金/大摩 等），是催化重点
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path

# Skill 路径
SKILL_DIR = Path.home() / ".workbuddy" / "skills" / "westock-snp-news"
SKILL_SCRIPT = SKILL_DIR / "scripts" / "index.js"
SKILL_ENV = SKILL_DIR / ".env"
SNP_TIMEOUT = 60

JSON_START_MARKER = "---JSON_OUTPUT_START---"
JSON_END_MARKER = "---JSON_OUTPUT_END---"


# ---------- 底层 CLI 封装 ----------

def _call_snp(args: list[str], timeout: int = SNP_TIMEOUT) -> dict:
    """
    调用 SNP CLI，从 stdout 末尾抠出 JSON 数据。
    返回 dict（CLI 的 JSON_OUTPUT_START 块内容）；失败抛 RuntimeError。
    """
    if not SKILL_SCRIPT.exists():
        raise RuntimeError(f"SNP skill 脚本不存在: {SKILL_SCRIPT}")
    if not SKILL_ENV.exists():
        raise RuntimeError(f"SNP token 未配置: {SKILL_ENV}")

    cmd = ["node", f"--env-file={SKILL_ENV}", str(SKILL_SCRIPT), *args]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"SNP CLI 失败 (code={r.returncode}): {r.stderr[:300] or r.stdout[:300]}")

    out = r.stdout
    start = out.rfind(JSON_START_MARKER)
    end = out.rfind(JSON_END_MARKER)
    if start < 0 or end < 0 or end <= start:
        raise RuntimeError(f"SNP CLI 输出未找到 JSON 块: {out[-200:]}")
    raw = out[start + len(JSON_START_MARKER): end].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"SNP JSON 解析失败: {e}; raw[:200]={raw[:200]}") from e


def snp_search(query: str, page_size: int = 20, no_paging: bool = True) -> list[dict]:
    """
    搜索 SNP 资讯列表。
    query 示例：'标题：上证早知道/发布时间：2026-05-21'
    返回原始 list（每项 = {id, title, publish_time, source_media, ...}）
    """
    args = ["search", "--page-size", str(page_size)]
    if no_paging:
        args.append("--no-paging")
    args.append(query)

    res = _call_snp(args)
    if not res.get("success"):
        raise RuntimeError(f"SNP search 返回 success=false: {res}")
    return res.get("data", {}).get("list", []) or []


def snp_detail(news_id: str) -> dict | None:
    """
    拉单条资讯详情（含正文 content HTML）。失败返回 None。
    """
    try:
        res = _call_snp(["detail", news_id])
    except Exception as e:
        print(f"[snp_detail] 失败: {e}", file=sys.stderr)
        return None
    if not res.get("success"):
        return None
    items = res.get("data", {}).get("list", []) or []
    return items[0] if items else None


# ---------- 上证早知道：今日抓取 + 章节切分 ----------

def _today_bj_str() -> str:
    now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8)))
    return now.strftime("%Y-%m-%d")


def _strip_html(s: str) -> str:
    """简单去标签 + unescape，保留段落感"""
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.IGNORECASE)
    s = re.sub(r"</?(?:p|div|li|h[1-6])\s*[^>]*>", "\n", s, flags=re.IGNORECASE)
    s = re.sub(r"<[^>]+>", "", s)
    s = unescape(s)
    s = re.sub(r"[\xa0\u3000]+", " ", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


# 上证早知道的章节关键词（顺序敏感）
SZZD_SECTIONS = [
    "今日提示",
    "上证精选",
    "上证聚焦",   # ★ 政策催化（重点）
    "产业情报",   # ★ 产业事件（重点）
    "公司新闻",
    "资金观潮",
]

# 章节里"重点催化候选"的优先级权重（用于选 TOP）
SECTION_WEIGHT = {
    "上证聚焦": 1.0,
    "产业情报": 1.0,
    "公司新闻": 0.6,
    "上证精选": 0.4,
    "资金观潮": 0.3,
    "今日提示": 0.1,
}


def _parse_szzd_content(html_content: str) -> list[dict]:
    """
    把上证早知道正文 HTML 切成事件候选列表。
    返回 [{section, title, body, weight}, ...]

    解析策略（按 5/21 实测样本）：
    1. 整段扫描，每遇到章节关键词（独占段落）就切换 section
    2. 在每个 section 内：
       - 以 <strong> 加粗段开头 → 开启新事件，标题取 strong 文本
       - 以 · 或 ○ 开头 → 开启新事件，标题取该段首句
       - 其他段落 → 累加到当前事件 body（这样能保留'政策解读+机构观点'多段正文）
    """
    # 用标记符把 strong 保留下来便于识别
    text = html_content
    text = re.sub(r"<strong[^>]*>", "【STRONG】", text, flags=re.IGNORECASE)
    text = re.sub(r"</strong>", "【/STRONG】", text, flags=re.IGNORECASE)
    text = _strip_html(text)

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    events: list[dict] = []
    current_section = "未分类"
    current_event: dict | None = None

    def _flush():
        nonlocal current_event
        if current_event and current_event.get("body"):
            events.append(current_event)
        current_event = None

    for ln in lines:
        # 章节标题（独占行，且严格等于关键词）
        is_section_header = False
        for sec in SZZD_SECTIONS:
            if ln == sec:
                _flush()
                current_section = sec
                is_section_header = True
                break
        if is_section_header:
            continue

        # 提取并清理 strong 标题
        strong_m = re.search(r"【STRONG】(.+?)【/STRONG】", ln)
        cleaned = re.sub(r"【/?STRONG】", "", ln).strip()
        # 剥掉前缀 · / ○ / •
        cleaned_no_prefix = cleaned.lstrip("·○•").strip()

        # 判断是否是"新事件起点"
        is_new_event = False
        if strong_m:
            is_new_event = True
            title = strong_m.group(1).lstrip("·○•").strip()
        elif ln.startswith("·") or ln.startswith("○") or ln.startswith("•"):
            is_new_event = True
            # 取首句作为 title
            first = re.split(r"[。，：]", cleaned_no_prefix, maxsplit=1)[0]
            title = (first or cleaned_no_prefix)[:40]
        else:
            title = ""

        if is_new_event:
            _flush()
            current_event = {
                "section": current_section,
                "title": title,
                "body": cleaned_no_prefix,
                "weight": SECTION_WEIGHT.get(current_section, 0.5),
            }
        else:
            # 续段：累加到当前事件 body
            if current_event:
                current_event["body"] += " " + cleaned_no_prefix

    _flush()
    return events


def fetch_szzd_today(date_str: str | None = None) -> dict | None:
    """
    拉今日上证早知道。
    返回 {
        title: "...",
        publish_time: int (unix),
        url: "...",
        events: [
            {section, title, body, weight},
            ...
        ],
        raw_content: "<html>..." (原始正文)
    }
    """
    date_str = date_str or _today_bj_str()
    # 用 "标题：上证早知道 + 来源：上海证券报" 双重限定，避免转载噪声
    try:
        items = snp_search(
            f"标题：上证早知道/来源：上海证券报/发布时间：{date_str}",
            page_size=20,
        )
    except Exception as e:
        print(f"[szzd] search 失败: {e}", file=sys.stderr)
        return None

    # SNP 标题用模糊匹配，再做一层严格过滤
    items = [it for it in items if "上证早知道" in (it.get("title") or "")]
    if not items:
        # fallback：去掉来源限制再试一次
        print(f"[szzd] {date_str} 严格过滤无结果，fallback 去掉来源限制", file=sys.stderr)
        try:
            items = snp_search(f"标题：上证早知道/发布时间：{date_str}", page_size=30)
            items = [it for it in items if "上证早知道" in (it.get("title") or "")]
        except Exception as e:
            print(f"[szzd] fallback search 失败: {e}", file=sys.stderr)
            return None

    if not items:
        print(f"[szzd] {date_str} 未找到上证早知道", file=sys.stderr)
        return None

    # 再做一次"当天"严格过滤：只保留 publish_time 在 date_str 这一天的
    try:
        day_start = datetime.strptime(date_str, "%Y-%m-%d").replace(
            tzinfo=timezone(timedelta(hours=8))
        )
    except ValueError:
        day_start = datetime.now(timezone(timedelta(hours=8)))
    day_start_ts = int(day_start.timestamp())
    day_end_ts = day_start_ts + 86400

    today_items = [
        it for it in items
        if day_start_ts <= int(it.get("publish_time", 0)) < day_end_ts
    ]
    if today_items:
        items = today_items
    else:
        print(f"[szzd] {date_str} 当天无上证早知道，使用最近一篇", file=sys.stderr)

    # 同一篇文章会被多个渠道转载（publish_time 几乎一样）
    # 挑发布时间最早的（一般是上海证券报最先发布的）
    items.sort(key=lambda x: x.get("publish_time", 0))
    primary = items[0]
    news_id = primary.get("id")
    if not news_id:
        return None

    detail = snp_detail(news_id)
    if not detail:
        print(f"[szzd] detail 抓取失败 id={news_id}", file=sys.stderr)
        return None

    raw_content = detail.get("content") or ""
    events = _parse_szzd_content(raw_content)
    print(
        f"[szzd] 抓到 {primary.get('title','')[:40]} "
        f"({primary.get('source_media','?')}), {len(events)} 条事件",
        file=sys.stderr,
    )

    return {
        "title": primary.get("title", ""),
        "publish_time": primary.get("publish_time", 0),
        "source_media": primary.get("source_media", ""),
        "url": primary.get("url", ""),
        "events": events,
        "raw_content": raw_content,
    }


if __name__ == "__main__":
    res = fetch_szzd_today()
    if res is None:
        print("FAIL", file=sys.stderr)
        sys.exit(1)

    # 把结果落档好看
    out_path = Path("/tmp/szzd_today.json")
    out_path.write_text(
        json.dumps(res, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSaved /tmp/szzd_today.json")
    print(f"\nTitle: {res['title']}")
    print(f"Events: {len(res['events'])}")
    by_section: dict[str, int] = {}
    for ev in res["events"]:
        by_section[ev["section"]] = by_section.get(ev["section"], 0) + 1
    print("By section:")
    for sec, cnt in by_section.items():
        print(f"  {sec}: {cnt} 条")

    print(f"\n--- 重点章节（上证聚焦 + 产业情报）---")
    for ev in res["events"]:
        if ev["section"] in ("上证聚焦", "产业情报"):
            print(f"\n[{ev['section']}] {ev['title']}")
            print(f"   {ev['body'][:150]}...")
