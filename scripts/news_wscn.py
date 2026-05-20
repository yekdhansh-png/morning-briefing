#!/usr/bin/env python3
"""
华尔街见闻早餐 FM-Radio 抓取器

策略：
1) 调 wallstreetcn 公开 API 拿全站文章流（按 cursor 翻页）
2) 翻多页找标题含「早餐」「早餐 FM」的最新一篇
3) 用文章 id 抓详情 API 拿正文
4) 解析正文为条目列表

API 不稳定时返回空列表，调用方应当作可选源处理（有就增强，没就跳过）。
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
import urllib.error
from html import unescape

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
LIST_URL_TPL = "https://api-prod.wallstreetcn.com/apiv1/content/articles?channel=global-channel&limit=50&cursor={cursor}"
DETAIL_URL_TPL = "https://api-prod.wallstreetcn.com/apiv1/content/articles/{id}"
TIMEOUT = 10
MAX_PAGES = 6  # 最多翻 6 页找早餐
RETRY = 2


def _http_get_json(url: str) -> dict | None:
    last_err = None
    for attempt in range(RETRY + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept": "application/json",
                    "Origin": "https://wallstreetcn.com",
                    "Referer": "https://wallstreetcn.com/",
                },
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                raw = r.read().decode("utf-8", errors="replace")
                data = json.loads(raw)
                # 接口正常会返回 {"code":20000, "data":{"items":[...]}}
                d = data.get("data") if isinstance(data, dict) else None
                if isinstance(d, dict):
                    return data
                # data 是空字符串或 None → 视为反爬中断，重试
                last_err = f"data is {type(d).__name__}"
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = str(e)
        time.sleep(1.5 * (attempt + 1))
    print(f"[wscn] HTTP/JSON 失败: {last_err}", file=sys.stderr)
    return None


def find_breakfast_article() -> dict | None:
    """翻页找含「早餐」的最新一篇 article 元信息"""
    cursor = 0
    for page in range(MAX_PAGES):
        data = _http_get_json(LIST_URL_TPL.format(cursor=cursor))
        if not data:
            break
        items = data.get("data", {}).get("items", []) or []
        for it in items:
            title = (it.get("title") or "")
            if "早餐" in title:
                return it
        # 下一页
        next_cursor = data.get("data", {}).get("next_cursor")
        if not next_cursor or next_cursor == cursor:
            break
        cursor = next_cursor
    return None


def _strip_tags(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</?(?:p|div|li|h[1-6])\s*[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[\xa0\u3000]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def parse_breakfast_content(content_html: str) -> list[dict]:
    """
    把见闻早餐正文 HTML 解析为条目列表。
    见闻早餐结构通常：多个 <h>/<strong> 板块标题 + 段落条目。
    简单做法：按段落 + 章节关键词切分。
    """
    items: list[dict] = []
    # 先按 h2/h3/strong 拆段
    blocks = re.split(r"(?=<(?:h[1-4]|strong)[^>]*>)", content_html, flags=re.IGNORECASE)

    section_keys = ["要闻", "中国", "海外", "国内", "全球", "市场", "公司", "宏观", "重磅", "商品", "债市"]
    current_section = "见闻早餐"

    for blk in blocks:
        if not blk.strip():
            continue
        # 提取 h/strong 作为可能的小标题
        head_m = re.match(r"<(?:h[1-4]|strong)[^>]*>(.+?)</(?:h[1-4]|strong)>", blk, re.IGNORECASE | re.DOTALL)
        if head_m:
            head = _strip_tags(head_m.group(1))
            if head and len(head) <= 12 and any(k in head for k in section_keys):
                current_section = head

        # 抠所有 <p>
        for raw in re.findall(r"<p[^>]*>(.+?)</p>", blk, re.DOTALL):
            text = _strip_tags(raw)
            if len(text) < 10:
                continue
            items.append({
                "section": current_section,
                "title": text.split("。")[0][:60],
                "content": text,
                "source": "华尔街见闻早餐",
            })
    return items


def fetch_wscn_breakfast() -> tuple[list[dict], str | None]:
    article = find_breakfast_article()
    if not article:
        return [], None

    article_id = article.get("id")
    article_uri = article.get("uri") or f"https://wallstreetcn.com/articles/{article_id}"

    # 详情
    data = _http_get_json(DETAIL_URL_TPL.format(id=article_id))
    if not data:
        return [], article_uri

    article_data = data.get("data") if isinstance(data, dict) else None
    if not isinstance(article_data, dict):
        return [], article_uri

    content_html = article_data.get("content") or article_data.get("content_text") or ""
    if not content_html:
        return [], article_uri

    items = parse_breakfast_content(content_html)
    return items, article_uri


if __name__ == "__main__":
    items, url = fetch_wscn_breakfast()
    print(f"article: {url}")
    print(f"共抓到 {len(items)} 条")
    for i, it in enumerate(items[:8], 1):
        print(f"\n  [{i}] [{it['section']}] {it['title']}")
        print(f"      {it['content'][:120]}...")
