#!/usr/bin/env python3
"""
财联社早报抓取器
- 入口：https://www.cls.cn/subject/1151（早报合集页）
- 流程：抓列表 HTML → 找最新 detail/<id> 链接 → 抓详情 HTML → 解析正文条目

输出：list[dict]，每条 {section, title, content, source}
"""
from __future__ import annotations

import re
import sys
import urllib.request
import urllib.error
from html import unescape

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
SUBJECT_URL = "https://www.cls.cn/subject/1151"
DETAIL_URL_TPL = "https://www.cls.cn/detail/{id}"
TIMEOUT = 12


def _http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", errors="replace")


def _strip_tags(html: str) -> str:
    """去掉 HTML 标签，保留文字"""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</?(?:p|div|li|h[1-6])\s*[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[\xa0\u3000]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def fetch_latest_detail_id() -> str | None:
    """从 subject/1151 列表页拿最新一篇早报的 detail id"""
    try:
        html = _http_get(SUBJECT_URL)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[cls] 列表页抓取失败: {e}", file=sys.stderr)
        return None
    ids = re.findall(r"/detail/(\d+)", html)
    return ids[0] if ids else None


def parse_briefing_detail(html: str) -> list[dict]:
    """
    解析财联社早报详情页正文 → 条目列表
    财联社早报正文结构（观察实际页面）：
    - 多个段落 <p>，用「**xxx**」或加粗标题分隔不同新闻
    - 章节标题如「宏观新闻」「行业新闻」「公司新闻」「环球市场」「投资机会参考」

    简单实用的解析策略：抠出 .detail-content 容器内的所有 <p>，
    把所有非空段落按 1 句 1 条切分。
    """
    items: list[dict] = []

    # 锁定正文容器
    m = re.search(r'<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>(.+?)</div>\s*<div[^>]*class="[^"]*detail-(?:bottom|share|like|comment|recommend)',
                  html, re.DOTALL)
    if not m:
        # fallback：截取 detail-content 后到下一个明显分隔
        m = re.search(r'<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>(.+)', html, re.DOTALL)
    if not m:
        return items

    body = m.group(1)
    # 抠所有 <p>
    paras = re.findall(r"<p[^>]*>(.+?)</p>", body, re.DOTALL)

    current_section = "未分类"
    section_keys = ["宏观", "行业", "公司", "环球", "市场", "机会", "投资"]

    for raw in paras:
        text = _strip_tags(raw)
        if not text or len(text) < 6:
            continue

        # 是不是章节标题？（一般极短，含某个关键词）
        if len(text) <= 12 and any(k in text for k in section_keys):
            current_section = text.replace("【", "").replace("】", "")
            continue

        # 是不是新闻条目（一般有句号、长度合理）
        # 剥掉条目编号前缀（如 "1、" "1." "①"）
        cleaned = re.sub(r"^\s*[\d①②③④⑤⑥⑦⑧⑨⑩]+\s*[、\.\)]\s*", "", text)
        cleaned = cleaned.strip()
        if not cleaned:
            continue

        items.append({
            "section": current_section,
            "title": cleaned.split("。")[0][:60],   # 首句作 title
            "content": cleaned,
            "source": "财联社早报",
        })

    return items


def fetch_cls_briefing() -> tuple[list[dict], str | None]:
    """
    返回 (条目列表, detail_url)
    失败返回 ([], None)
    """
    detail_id = fetch_latest_detail_id()
    if not detail_id:
        return [], None
    detail_url = DETAIL_URL_TPL.format(id=detail_id)
    try:
        html = _http_get(detail_url)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[cls] 详情页抓取失败: {e}", file=sys.stderr)
        return [], detail_url
    items = parse_briefing_detail(html)
    return items, detail_url


if __name__ == "__main__":
    items, url = fetch_cls_briefing()
    print(f"detail: {url}")
    print(f"共抓到 {len(items)} 条")
    for i, it in enumerate(items[:10], 1):
        print(f"\n  [{i}] [{it['section']}] {it['title']}")
        print(f"      {it['content'][:120]}...")
