#!/usr/bin/env python3
"""
DeepSeek LLM 调用封装

约定：
- API Key 通过环境变量 DEEPSEEK_API_KEY 注入（GitHub Secrets / 本地 .env）
- 默认模型 deepseek-chat（v3，¥0.5/百万 token）
- JSON 模式：response_format={"type":"json_object"}
- 内置重试 + 超时

环境：纯 Python 3.13 标准库（urllib + json）。
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

API_URL = "https://api.deepseek.com/chat/completions"
DEFAULT_MODEL = "deepseek-chat"
TIMEOUT = 120
RETRY = 2

# 简单计费日志（不精确，仅供监控）
PRICE_INPUT_PER_M = 0.5   # ¥0.5/M token (DeepSeek-v3 缓存命中价)
PRICE_OUTPUT_PER_M = 8.0  # ¥8.0/M token (DeepSeek-v3 输出)


class LLMError(RuntimeError):
    """LLM 调用失败"""


def _api_key() -> str:
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not key:
        raise LLMError(
            "未设置环境变量 DEEPSEEK_API_KEY。\n"
            "本地：export DEEPSEEK_API_KEY=sk-xxx\n"
            "CI：在 GitHub Secrets 中配置"
        )
    return key


def chat_json(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> dict:
    """
    调用 DeepSeek 拿一段严格 JSON 响应。
    返回解析后的 dict。失败抛 LLMError。
    """
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    last_err: str | None = None
    for attempt in range(RETRY + 1):
        try:
            req = urllib.request.Request(
                API_URL,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {_api_key()}",
                    "Accept": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
            data = json.loads(raw)

            usage = data.get("usage", {}) or {}
            in_tok = usage.get("prompt_tokens", 0)
            out_tok = usage.get("completion_tokens", 0)
            cost = (in_tok / 1_000_000) * PRICE_INPUT_PER_M + (out_tok / 1_000_000) * PRICE_OUTPUT_PER_M
            print(
                f"  [llm] model={model} in={in_tok} out={out_tok} cost≈¥{cost:.4f}",
                file=sys.stderr,
            )

            choice = (data.get("choices") or [{}])[0]
            content = (choice.get("message") or {}).get("content", "")
            if not content:
                raise LLMError(f"DeepSeek 返回空 content: {raw[:200]}")

            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                # 偶尔模型输出含 ```json...``` markdown 包装
                stripped = content.strip()
                if stripped.startswith("```"):
                    stripped = stripped.strip("`")
                    if stripped.startswith("json"):
                        stripped = stripped[4:]
                    stripped = stripped.strip()
                    return json.loads(stripped)
                raise LLMError(f"JSON 解析失败: {e}\n原文: {content[:300]}")

        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8", errors="replace")[:300]
            except Exception:  # noqa
                pass
            last_err = f"HTTP {e.code}: {err_body}"
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = str(e)
        except LLMError:
            raise

        if attempt < RETRY:
            backoff = 2.0 * (attempt + 1)
            print(f"  [llm] 重试 {attempt + 1}/{RETRY}（{backoff}s 后） · {last_err}", file=sys.stderr)
            time.sleep(backoff)

    raise LLMError(f"DeepSeek 调用失败（已重试 {RETRY} 次）: {last_err}")


if __name__ == "__main__":
    # 自检：要 DEEPSEEK_API_KEY 在环境里
    res = chat_json(
        system_prompt="你是 JSON 输出助手。",
        user_prompt='返回一个 JSON：{"hello":"world","ok":true}',
        max_tokens=100,
    )
    print("自检结果:", res)
