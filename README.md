# Offer 捕手

学生求职匹配智能体网页 demo。用户上传简历后，后端优先使用本机腾讯校招 WorkBuddy skill 获取 `join.qq.com` 真实岗位/JD；分析时直接调用腾讯 skill 的官网岗位匹配脚本，再通过阿里云百炼 OpenAI 兼容接口运行简历解析与辅导流程，输出岗位推荐、简历诊断、岗位定制改写、面试准备、模拟面试和群面/HR 面辅导。

## 本地运行

```bash
npm install
cp .env.example .env
# 编辑 .env，填入 DASHSCOPE_API_KEY
npm run dev
```

默认地址：

- 前端：http://127.0.0.1:5173
- 后端：http://127.0.0.1:8787

## 后端岗位库

默认 `JOB_SOURCE_PROVIDER=auto`：后端使用腾讯校招 skill 中的 `scripts/fetch_recruit_jds.py match`，把原始简历文本交给腾讯 WorkBuddy skill 匹配腾讯官网真实岗位；分析接口不会悄悄回退到本地岗位库。

可以在 `.env` 中切换岗位源：

```bash
# auto | tencent | local
JOB_SOURCE_PROVIDER=auto
TENCENT_SKILL_DIR=/Users/mike/.workbuddy/skills/skill_2054903442024890368
TENCENT_SKILL_PYTHON=python3
TENCENT_JD_CACHE_DB=data/tencent-jobs.sqlite
```

腾讯岗位策略：

- 分析时运行 `fetch_recruit_jds.py match "<原始简历文本>"`，保留腾讯 skill 返回的岗位顺序、岗位字段、投递链接和匹配理由
- 项目内不再运行自研岗位检索或匹配评分，不展示分数、概率、排名算法
- 岗位状态接口仍可使用每日缓存读取官网岗位总量
- 可选手动刷新：`POST /api/jobs/refresh`；如需补齐全部详情可加 `?details=true`

本地岗位库读取 `server/data/jobs.json`，如果不存在则读取 `server/data/jobs.csv`。也可以在 `.env` 中配置：

```bash
JOBS_FILE=data/jobs.csv
```

支持 JSON 或 CSV。推荐字段：

- `company`
- `title`
- `city`
- `type`
- `description`
- `requirements`
- `bonus`
- `link`
- `deadline`

## 腾讯校招辅导

结果页是分 Tab 的腾讯校招辅导工作台：

- `推荐概览`：基于腾讯官网真实岗位/JD 的专业推荐、JD 解读、风险缺口和下一步动作
- `简历优化`：基于腾讯 skill 的简历诊断，并针对当前选中岗位输出关键词策略、证据补充和改写示例
- `面试准备`：结合腾讯面试参考与岗位方向资料输出准备重点
- `模拟 & HR`：生成练习问题，并输出群面策略、HR 面问题、回答框架和注意事项

所有腾讯辅导都遵守边界：不编造经历，不推测薪酬、HC、官方通过率、录取率或竞争比。
