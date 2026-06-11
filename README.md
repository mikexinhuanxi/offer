# Offer 捕手

学生求职匹配智能体网页 demo。用户上传简历后，后端优先使用本机腾讯校招 WorkBuddy skill 获取 `join.qq.com` 真实岗位/JD，并把腾讯岗位写入本地每日缓存库；分析时从缓存库做专业岗位推荐，再通过阿里云百炼 OpenAI 兼容接口运行 skill pipeline，输出岗位推荐、简历诊断、岗位定制改写、面试准备、模拟面试和群面/HR 面辅导。

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

默认 `JOB_SOURCE_PROVIDER=auto`：后端优先使用腾讯校招 skill 中的 `scripts/fetch_recruit_jds.py` 抓取腾讯官网岗位，并写入本地 SQLite 每日缓存；如果脚本不可用或官网请求失败，自动回退到本地岗位库。

可以在 `.env` 中切换岗位源：

```bash
# auto | tencent | local
JOB_SOURCE_PROVIDER=auto
TENCENT_SKILL_DIR=/Users/mike/.workbuddy/skills/skill_2054903442024890368
TENCENT_SKILL_PYTHON=python3
TENCENT_JD_CACHE_DB=data/tencent-jobs.sqlite
```

缓存策略：

- 每天首次读取岗位时，运行 `fetch_recruit_jds.py all --max-pages 50 --page-size 100` 抓全量岗位摘要并入库
- 分析时从全量摘要缓存做本地推荐，不只匹配岗位标题，也匹配 `recruit_label`、`project_name`、BG、工作地等字段
- 候选岗位缺少完整 JD 时才调用 `fetch_recruit_jds.py detail <post_id>` 补详情，并在当天复用
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

- `岗位推荐`：基于腾讯官网真实岗位/JD 的专业推荐和 JD 解读，不展示分数、百分比或排名算法
- `简历诊断`：基于腾讯 skill 的简历指南输出亮点、问题和修改动作
- `岗位定制`：针对当前选中岗位输出关键词策略、证据补充和改写示例
- `面试准备`：结合腾讯面试参考与岗位方向资料输出准备重点
- `模拟面试`：生成 5 个练习问题，附面试官关注点和回答建议
- `群面/HR`：输出群面策略、HR 面问题、回答框架和注意事项

所有腾讯辅导都遵守边界：不编造经历，不推测薪酬、HC、官方通过率、录取率或竞争比。
