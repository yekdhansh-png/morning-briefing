#!/usr/bin/env python3
"""
财联社「美股收评」抓取器
- 入口：https://www.cls.cn/subject/7373（美股收评合集页）
- 流程：subject 列表页 → 找最新 detail/<id> → 抓详情页 → 提取 title + content

返回：dict {title, content, url, length}  失败返回 None
"""
from __future__ import annotations

import re
import sys
import urllib.error
import urllib.request
from html import unescape

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
SUBJECT_URL = "https://www.cls.cn/subject/7373"
DETAIL_URL_TPL = "https://www.cls.cn/detail/{id}"
TIMEOUT = 12


def _http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", errors="replace")


def _strip_tags(html: str) -> str:
    """去 HTML 标签，保留段落分隔"""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</?(?:p|div|li|h[1-6])\s*[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[\xa0\u3000]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def _fetch_latest_detail_id() -> str | None:
    try:
        html = _http_get(SUBJECT_URL)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[cls_us_close] 列表页抓取失败: {e}", file=sys.stderr)
        return None
    ids = re.findall(r"/detail/(\d+)", html)
    return ids[0] if ids else None


def _parse_detail(html: str) -> tuple[str, str]:
    """从详情页 HTML 提取 (title, content)"""
    # 标题在 <title> 标签
    m_title = re.search(r"<title>([^<]+)</title>", html)
    title = unescape(m_title.group(1).strip()) if m_title else ""

    # 正文容器：detail-content
    m = re.search(
        r'<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>(.+?)</div>\s*<div[^>]*class="[^"]*detail-(?:bottom|share|like|comment|recommend)',
        html, re.DOTALL,
    )
    if not m:
        m = re.search(
            r'<div[^>]*class="[^"]*detail-content[^"]*"[^>]*>(.+)',
            html, re.DOTALL,
        )
    content = ""
    if m:
        content = _strip_tags(m.group(1))
        content = _trim_footer(content)
    return title, content


# 正文末尾噪声标志词，遇到第一个就截断
FOOTER_MARKERS = [
    "收藏", "阅读", "我要评论", "反馈意见", "欢迎您发表",
    "发表评论", "关联话题", "查看更多", "关于我们", "财联社 ©",
    "版权所有", "沪ICP", '{"props"',
]


def _trim_footer(text: str) -> str:
    """从尾部噪声词第一次出现的位置截断正文"""
    earliest = len(text)
    for marker in FOOTER_MARKERS:
        idx = text.find(marker)
        if idx > 0 and idx < earliest:
            earliest = idx
    return text[:earliest].rstrip()


def fetch_us_close() -> dict | None:
    """
    抓最新一篇美股收评。返回 {title, content, url, length}；失败返回 None
    """
    detail_id = _fetch_latest_detail_id()
    if not detail_id:
        return None
    url = DETAIL_URL_TPL.format(id=detail_id)
    try:
        html = _http_get(url)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[cls_us_close] 详情页抓取失败: {e}", file=sys.stderr)
        return None

    title, content = _parse_detail(html)
    if not content or len(content) < 200:
        print(f"[cls_us_close] 正文过短或空: {len(content)} chars", file=sys.stderr)
        return None

    return {
        "title": title,
        "content": content,
        "url": url,
        "length": len(content),
    }


if __name__ == "__main__":
    import json
    res = fetch_us_close()
    if res is None:
        print("FAIL")
        sys.exit(1)
    print(f"URL: {res['url']}")
    print(f"标题: {res['title']}")
    print(f"正文长度: {res['length']} 字")
    # 保存到 tmp 让用户可以 cat 看
    with open("/tmp/us_close_latest.json", "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
    print("saved /tmp/us_close_latest.json")
