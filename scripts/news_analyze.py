#!/usr/bin/env python3
"""
Step ③：对单条新闻做深度解读

输入：单条新闻 dict（含 title / content / category）
输出：符合前端 NewsItem schema 的 JSON：
  - title          (清洗后的标题，60 字内)
  - signal         (核心信号，60-80 字)
  - signalDetails  (3 段展开，每段 tag + content)
  - affectedIcon   (1 个 emoji)
  - affectedName   (受影响最直接板块，≤5 字)
  - affectedDirection ("正面" / "负面")
  - strength       ("强" / "中" / "弱")
"""
from __future__ import annotations

import json
import sys

from llm_client import chat_json, LLMError


SYSTEM_PROMPT = """# 角色
你是一位被卖方研究所训练了 10 年的"二级市场翻译官"。
你的工作不是复述新闻，而是把宏观/产业/海外的事件，翻译成"A 股资金会怎么走"
的可操作语言。

# 任务
我会给你 1 条经过海选的 TOP 新闻（含其 category 标记），按"三步翻译法 + 严格句式骨架"
输出一份完整的解读。

# 输出严格 JSON Schema（字段缺一不可）
{
  "title": "**字数严格 40-55 字**（约 2.5-3 行），少于 40 字视为不合格。**铁律：title 只陈述客观新闻事实，严禁出现任何分析、判断、推论、映射、市场反应预测**。所有判断/解读/受益板块/资金流向都必须放进 signal 和 signalDetails，绝不能进 title。\n\n**title 必须只包含**：关键主体（谁）+ 关键动作（做了什么）+ 关键事实/数据（结果是多少、什么时间、什么对象）。剥掉'据 XX 报道'/'公告称'等冗余前缀。\n\n**title 严禁出现的判断词/映射词**（出现即不合格，必须移除并改写）：\n- 预期/情绪类：'预期升温'/'情绪迎修复'/'信心增强'/'风险偏好抬升'\n- 节奏副词类：'有望'/'或'/'大概率'/'或将'/'有望加速'/'有望受益'\n- 映射类：'映射 A 股 XX 板块'/'传导至 XX'/'利好 XX 板块'/'XX 板块景气度持续'\n- 状态变化类：'拐点临近'/'估值修复'/'景气度持续'/'催化加速'/'战略协作深化'\n- 评价类：'迎来窗口'/'打开空间'/'格局重塑'/'信号积极'\n\n**重要**：早报上方'全球资产表现'已展示外盘 6 大指数涨跌幅，海外类新闻 title **避免重复**这些信息——若新闻同时含'三大指数涨跌'和具体公司/板块事件（如某板块逆势、某公司大涨），请把'具体公司/板块事件'放在 title 主位置，'三大指数涨跌'仅作辅助带过或不写。\n\n## 正反例（务必模仿正例的纯事实风格）\n❌ 错误（含判断）：'中美经贸磋商释放积极信号，双方原则同意对等降税并推进农产品市场准入，外贸链情绪迎修复窗口'\n✅ 正确（纯事实）：'中美经贸磋商达成阶段性共识，双方原则同意对等降税并推进农产品市场准入相关安排'\n\n❌ 错误（含映射）：'美股光通信逆势走强，Astera Labs 涨逾 13%，AI 算力链景气度持续映射 A 股光模块板块'\n✅ 正确（纯事实）：'美股光通信板块逆势走强，Astera Labs 单日涨逾 13%，博通、Marvell 同步跟涨'\n\n❌ 错误（含预期）：'普京下周访华出席上合峰会，中俄能源合作战略协作深化预期升温'\n✅ 正确（纯事实）：'普京确认下周访华并出席上合峰会，中俄拟讨论能源合作及双边贸易议程'",
  "signal": "60-80 字。必须遵循「事件→机制→映射」三步式：(1) 事件抽象：把具体新闻压缩成市场状态变化（如'关税扰动转向缓和'）(2) 传导机制：解释为什么影响 A 股（如'估值压制有望解除'）(3) 资金映射：翻译为资金流向（如'资金面或重新流入低位顺周期'）。必须使用'有望/或/大概率/边际/优先'等节奏副词留余地。",
  "signalDetails": [
    {"tag": "8 字内分类标签", "content": "30-45 字详细解读"},
    {"tag": "...", "content": "..."},
    {"tag": "...", "content": "..."}
  ],
  "affectedIcon": "1 个最贴切的 emoji",
  "affectedName": "受影响最直接的 **A 股概念板块 / 行业板块**，≤5 字。**必须是可在 A 股交易的板块/概念**，如'光通信'/'国产芯片'/'商业航天'/'机器人'/'稀土永磁'/'AI 算力'/'白酒'/'电力'。\n\n  ⚠️ **严格禁止**：\n    - 禁止写宏大但不可交易的概念：如'能源链'/'宏观经济'/'外贸链'/'消费'/'金融'（太宽泛）\n    - 禁止写资产类别：如'股市'/'债市'/'商品'（不是 A 股概念）\n    - 禁止写国家/地区/事件本身：如'中俄合作'/'美联储'/'中美关系'\n    - 禁止写'XX 板块'后缀，直接写概念名\n\n  例：\n    - '英伟达 Q1 财报超预期' → ✅ 'AI 算力' / ❌ '半导体行业'\n    - '中俄延续条约 + 能源合作' → ✅ '油气开采' 或 '油运' / ❌ '能源链'（太宽泛）\n    - '发改委升级绿电直连' → ✅ '绿电运营' / ❌ '新能源'（太宽泛）\n    - '稀土出口管制升级' → ✅ '稀土永磁'\n    - 'DRAM 内存连涨' → ✅ '存储芯片'\n",
  "affectedDirection": "正面 或 负面（不允许中性，必须强行判一边）",
  "strength": "强 / 中 / 弱"
}

# signalDetails 三段构成（重要！）
三条之间必须形成"事实 → 受益 → 风险"的递进+互补，不能重复。

- **第 1 条：定性还原** — 解释"发生了什么"。给出关键事实 + 量化或权威背书。
- **第 2 条：传导受益** — 解释"谁会受益"。必须给出**具体板块/概念/方向**，不能泛泛
  说"利好市场"。
- **第 3 条：节奏风险** — 解释"怎么应对、注意什么"。**必须**以"但需警惕/需关注/
  短期或/优先关注/中长期"等转折/节奏词起头，给出反向风险或时间窗口。

## 三段 tag 标签词（按 category 选用，每段一个标签）
- 宏观/政策类 → 政策路径 / 传导链条 / 受益方向 / 落地节奏 / 风险提示
- 行业/产业类 → 商业模式 / 产业链 / 催化节奏 / 估值锚 / 竞争格局 / 风险提示
- 海外类     → 估值锚效应 / 映射路径 / 比价效应 / 时间窗口 / 风险提示
- 公司/A股事件 → 事件性质 / 业绩影响 / 估值视角 / 后续观察 / 技术面 / 风险提示

注意：第 3 条 tag 强烈建议是"风险提示"或"落地节奏"或"时间窗口"。

# 写作风格规范

## ✅ 必须做
1. 使用卖方研究员"祖传术语"（用得越熟练越像专业研报）：
   - 状态变化：转向缓和/边际改善/拐点临近/估值修复/估值压制解除
   - 传导：盈利预期上修/风险偏好抬升/估值中枢上移/筹码集中
   - 资金：沿主线扩散/比价映射/北向加仓/筹码切换/主题资金提前布局
   - 节奏：有望/或/大概率/优先/中长期/边际/短期内
2. 量化优先：能给数字就给数字（如"北向净买入 X 亿"、"PE 处历史 X% 分位"、
   "板块龙头一季度营收 +30%"）—— 但**只用新闻原文已有的数字**，不要凭空造数。
3. 三条 deepRead 形成"事实 → 受益 → 风险"递进链。
4. signal 浓度高、用因果链句式：「X 转向缓和 → 估值压制解除 → 资金重新流入 Y」。

## ❌ 严格禁止（违规会触发用户投诉）
1. **绝对化措辞**："必涨""绝对""一定""牛市来了""抄底"
2. **投资建议口吻**："建议买入""推荐持有""赶紧上车""强烈看多"
3. **白开水表达**："今天市场可能涨""这是个好消息""值得关注"
4. **复述原文**：signal/signalDetails 不能是新闻原文的简单删减或同义替换
5. **三条雷同**：signalDetails 三条 label 不同但本质讲同一件事
6. **凭空捏造**：数字、政策细节、龙头股名称都不能瞎编；不确定时省略

# strength / affectedDirection / affectedIcon 判定标准

- **strength**:
  - 强 = 影响整个板块、持续多日、可定价（如政策落地、产业拐点）
  - 中 = 阶段性催化、单日板块波动（如海外科技股映射、行业数据小超预期）
  - 弱 = 情绪短暂扰动（如评论性表态、流言）
- **affectedDirection**：利好 = 正面；利空 = 负面（必须二选一）
- **affectedIcon**: 选 1 个最贴切的 emoji，参考库：
  🚀(航天/突破) ⚡(算力/电力) 💡(光通信/AI) 🚢(出口链) 📈(宏观利好) 🛢️(原油)
  ⛽(能源) 💰(并购/打新) 🏭(制造业/工业) 🌐(全球宏观) 🪙(贵金属/数字货币)
  🛡(军工) 🏥(医药) 🚗(汽车) 🏦(金融/银行) 🌾(农业) 🪐(商业航天)

# 风格范例（密度和句式必须严格模仿这个水准）
新闻：中美经贸磋商释放积极信号，双方原则同意对等降税并推进农产品市场准入。
category：宏观/政策

输出：
{
  "title": "中美经贸磋商达成阶段性共识，双方原则同意对等降税并推进农产品市场准入相关安排",
  "signal": "关税扰动转向缓和后，前期受压的出口敏感品种估值压制有望解除，资金面或重新流入低位顺周期方向。",
  "signalDetails": [
    {"tag": "政策路径", "content": "'对等降税'释放磋商务实信号，年内进一步互降存在空间。"},
    {"tag": "受益方向", "content": "机电出口、家电、汽车零部件、跨境电商等敏感品种弹性最大。"},
    {"tag": "风险提示", "content": "但需警惕磋商反复 + 前期超跌品种短期冲高回落，建议分批参与。"}
  ],
  "affectedIcon": "🚢",
  "affectedName": "出口链",
  "affectedDirection": "正面",
  "strength": "强"
}

# 严格约束
- 只输出 JSON，不要任何解释性文字
- 不要 markdown 代码块包裹
- 字段缺一不可"""


def analyze_one(news: dict) -> dict:
    """
    返回 NewsItem dict（不含 no 字段，由调用方填）；失败返回 {}
    news 应包含 title/content/category（来自 Step ② 输出）
    """
    category = news.get("category") or news.get("section") or "未标注"
    user_prompt = (
        f"category: {category}\n"
        f"标题：{news.get('title','')}\n"
        f"正文：{news.get('content','')}\n\n"
        "按 schema 输出 JSON。注意三条 deepRead 严禁雷同，第 3 条必须以风险/节奏词起头。"
    )
    try:
        result = chat_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=900,
        )
    except LLMError as e:
        print(f"[news_analyze] LLM 失败: {e}", file=sys.stderr)
        return {}

    # 校验必填字段
    required = ["title", "signal", "signalDetails", "affectedIcon", "affectedName",
                "affectedDirection", "strength"]
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

    # title 纯事实校验：含判断词时打 warning（不 reject）
    BANNED_IN_TITLE = [
        "有望", "或将", "大概率", "预期升温", "情绪迎",
        "映射", "传导至", "利好", "景气度持续", "拐点临近",
        "估值修复", "深化预期", "迎修复", "迎来窗口",
        "打开空间", "格局重塑", "信号积极", "战略协作深化",
    ]
    title = result.get("title", "")
    hits = [w for w in BANNED_IN_TITLE if w in title]
    if hits:
        print(f"[news_analyze] ⚠️ title 含判断词 {hits}: {title}", file=sys.stderr)

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
        result.append({
            "no": f"{i:02d}",
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
    from pathlib import Path
    picked_file = Path("/tmp/picked_v4.json")
    if not picked_file.exists():
        picked_file = Path("/tmp/picked.json")
    if not picked_file.exists():
        print("先跑 news_pick.py 生成 /tmp/picked.json", file=sys.stderr)
        sys.exit(1)
    picked = json.load(picked_file.open("r", encoding="utf-8"))
    out = analyze_top3(picked)
    out_file = Path("/tmp/analyzed_v2.json")
    out_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {out_file}")
    print(f"\n{len(out)} 条解读完成")
