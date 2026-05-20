#!/usr/bin/env python3
"""
证券时报「早知道」抓取器

接口：https://egs.stcn.com/news/intelligence.html?page=1&perPage=20&_format=json
（关键：加 `&_format=json` 才返回 JSON，不加则返回 HTML 列表页）

返回结构：
{
  "state": 1,
  "msg": "...",
  "data": [
    {
      "id": "2291795",
      "title": "【早知道】...",
      "time": "05-20 07:43",   # MM-DD HH:MM 格式（注意：不含年份）
      "content": "短摘要",
      "content_full": "完整正文（无 HTML 标签，章节用关键词分隔）",
      "url": "/news/detail/2291795.html",
      ...
    }
  ]
}

策略：
1) 拉最新 20 条，本身就只列"早知道"
2) 若 data[0].time 以今天 MM-DD 开头，认定今天的早知道；否则跳过（节假日没新发）
3) 用 content_full（优先）或 content（降级）
4) 按章节关键词切分长文本，每个章节作为一个备选条目
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
LIST_URL = "https://egs.stcn.com/news/intelligence.html?page=1&perPage=20&_format=json"
TIMEOUT = 10

# 已知章节关键词，按出现顺序识别
SECTION_KEYS = ["隔夜外盘", "热点聚焦", "要闻精选", "宏观新闻", "公司新闻", "主题机会", "投资机会"]


def _http_get_json(url: str) -> dict | None:
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": UA,
                "Accept": "application/json",
                "Referer": "https://egs.stcn.com/",
                "X-Requested-With": "XMLHttpRequest",
            },
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8", errors="replace"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        print(f"[stcn] 接口失败: {e}", file=sys.stderr)
        return None


def split_by_sections(content: str) -> list[tuple[str, str]]:
    """
    把整段早知道按 SECTION_KEYS 切分。
    返回 [(section_name, section_text), ...]
    如果切不出，返回 [("正文", content)]
    """
    # 找出所有章节关键词的位置
    positions: list[tuple[int, str]] = []
    for kw in SECTION_KEYS:
        idx = 0
        while True:
            i = content.find(kw, idx)
            if i < 0:
                break
            positions.append((i, kw))
            idx = i + len(kw)
    positions.sort()

    if not positions:
        return [("正文", content)]

    # 按相邻位置切片
    sections: list[tuple[str, str]] = []
    for i, (pos, kw) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(content)
        body = content[pos + len(kw):end].strip()
        if body:
            sections.append((kw, body))
    return sections


def split_to_news_items(section_name: str, section_text: str) -> list[dict]:
    """
    把章节正文切成单条新闻。
    简单策略：按 ①②③ 或 「..." 大段切，避免太长。
    每条最多 200 字。
    """
    # 移除多余空白
    text = re.sub(r"\s+", " ", section_text).strip()
    if not text:
        return []

    # 优先按 ①②③ 切
    parts = re.split(r"(?=[①②③④⑤⑥⑦⑧⑨⑩])", text)
    parts = [p.strip().lstrip("①②③④⑤⑥⑦⑧⑨⑩").strip() for p in parts if p.strip()]

    # 若没切出多段，按句号大段切（避免一段太长 LLM 难处理）
    if len(parts) <= 1:
        parts = []
        buf = ""
        for sentence in re.split(r"(?<=[。！？])", text):
            buf += sentence
            if len(buf) >= 80:
                parts.append(buf.strip())
                buf = ""
        if buf:
            parts.append(buf.strip())

    items = []
    for p in parts:
        if len(p) < 15:
            continue
        items.append({
            "section": section_name,
            "title": p.split("。")[0][:60],
            "content": p[:400],  # 限长，避免过长
            "source": "证券时报早知道",
        })
    return items


def fetch_stcn_briefing() -> tuple[list[dict], str | None]:
    data = _http_get_json(LIST_URL)
    if not data or data.get("state") != 1:
        return [], None

    items = data.get("data") or []
    if not items:
        return [], None

    # 取最新一条；判断是否今天发布（MM-DD 格式）
    latest = items[0]
    time_str = latest.get("time", "")
    today_md = datetime.now().strftime("%m-%d")
    if not time_str.startswith(today_md):
        # 不是今天的，但仍可作 fallback —— 返回最新但标注为非今日
        print(f"[stcn] 最新一条 time={time_str}，非今日 ({today_md})，仍使用最新", file=sys.stderr)

    title = latest.get("title", "")
    detail_url = f"https://egs.stcn.com{latest.get('url', '')}"

    content = latest.get("content_full") or latest.get("content") or ""
    if not content:
        return [], detail_url

    # 切章节 → 切条目
    all_items: list[dict] = []
    for sec_name, sec_text in split_by_sections(content):
        all_items.extend(split_to_news_items(sec_name, sec_text))

    return all_items, detail_url


if __name__ == "__main__":
    items, url = fetch_stcn_briefing()
    print(f"article: {url}")
    print(f"共抓到 {len(items)} 条")
    for i, it in enumerate(items[:10], 1):
        print(f"\n  [{i}] [{it['section']}] {it['title']}")
        print(f"      {it['content'][:160]}...")
