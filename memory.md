# Offer 捕手项目记忆

后续智能体处理这个项目时，先读本文件即可，不必先通读整个工作区。只有在要改具体功能时，再按下面的文件索引精读对应文件。

## 项目是什么

「Offer 捕手」是一个学生求职匹配智能体网页 demo。

用户上传或粘贴简历，后端读取本地岗位库，调用阿里云百炼 OpenAI 兼容接口，按 skill pipeline 输出：

- 简历结构化画像
- 腾讯 WorkBuddy skill 返回的真实岗位短名单
- 匹配理由、风险点、简历优化动作和改写示例

当前产品方向是「浅色极简卡片型」，不是深色 AI 控制台。页面需要简约、好看、产品感强，并带少量 React Bits 风格动效。

## 当前技术栈

- 根目录 npm workspaces
- 前端：Vite + React + TypeScript
- 后端：Node.js + Express + TypeScript
- 模型：阿里云百炼，OpenAI-compatible Chat Completions
- 简历文件解析：`pdf-parse`、`mammoth`
- 岗位 CSV 解析：`papaparse`

## 运行方式

```bash
npm install
cp .env.example .env
npm run dev
```

默认地址：

- 前端：http://127.0.0.1:5173
- 后端：http://127.0.0.1:8787

常用验证：

```bash
npm run build
npm audit
curl -s http://127.0.0.1:8787/api/health
curl -s http://127.0.0.1:8787/api/jobs
```

## 环境变量

`.env` 在根目录，已被 `.gitignore` 忽略，不能提交、不能打印 API key。

重要变量：

- `DASHSCOPE_API_KEY`
- `DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `DASHSCOPE_MODEL=qwen-plus`
- `PORT=8787`
- `JOBS_FILE=data/jobs.json`

后端通过 `server/src/env.ts` 同时读取根目录 `.env` 和 `server/.env`。

## 关键文件索引

前端主入口：

- `client/src/App.tsx`：页面结构、状态、API 调用、结果渲染、本地 React Bits 风格小组件
- `client/src/styles.css`：浅色极简视觉、Spotlight hover、渐变文字、Fade in、按钮 Glare、分数环和进度条动画
- `client/vite.config.ts`：前端 dev server 与 `/api` 代理

后端主入口：

- `server/src/index.ts`：Express API，含 `/api/health`、`/api/jobs`、`/api/extract-resume`、`/api/analyze`
- `server/src/modelClient.ts`：百炼 OpenAI 兼容调用与 JSON 解析
- `server/src/jobData.ts`：读取后端岗位库，支持 JSON/CSV 和中英文字段
- `server/src/fileExtractors.ts`：PDF/DOCX/TXT 等简历文本提取
- `server/src/types.ts`：前后端共享的数据形状参考

Skill pipeline：

- `server/src/skills/registry.ts`：串联完整流程
- `server/src/skills/resumeParser.ts`：简历解析 skill
- `server/src/skills/tencentMatchBuilder.ts`：把腾讯 WorkBuddy skill 的 match 结果适配为前端展示结构；不重新排序、不输出分数或概率
- `server/src/skills/resumeOptimizer.ts`：简历优化 skill

可复用的外部腾讯校招 Skill：

- 本机有 WorkBuddy 腾讯校招 skill：`/Users/mike/.workbuddy/skills/skill_2054903442024890368/`
- 已接入的部分：`scripts/fetch_recruit_jds.py` 拉取 `join.qq.com` 真实岗位/JD，`references/resume-guide.md`、`references/interview-prep.md`、`references/job-database.md` 作为腾讯校招简历诊断、岗位定制、面试准备、模拟面试、群面/HR 面辅导参考
- 接入方式：`server/src/tencentSkill.ts` 把 WorkBuddy skill 包装为官网抓取能力；`server/src/tencentJobCache.ts` 仍用于岗位总量和手动刷新；分析接口默认直接调用腾讯 skill 的 `match`，失败时不悄悄回退本地岗位库；只有显式 `JOB_SOURCE_PROVIDER=local` 才走本地调试岗位
- 岗位推荐规则：遵守腾讯 skill 模块二。分析时直接调用 WorkBuddy skill 的 `scripts/fetch_recruit_jds.py match "<原始简历文本>"`，使用脚本返回的岗位顺序、真实官网字段、投递链接和 `match_reasons`；项目内不得再接自研岗位检索、二次评分、分数、百分比或排名算法。前端只展示 3-5 个真实岗位、官网字段、1-2 句推荐理由和 JD 五段解读
- 腾讯辅导输出：`server/src/skills/tencentCoach.ts` 生成 `tencentCoaching`，前端结果页用 Tabs 展示「岗位推荐 / 简历诊断 / 岗位定制 / 面试准备 / 模拟面试 / 群面/HR」
- 没有接入的部分：WorkBuddy hooks、埋点上报和强制选项式追问规则，不要直接搬进网页 demo
- 腾讯岗位推荐必须基于官网脚本返回的真实岗位、部门、工作地、JD 和投递链接；不要凭模型经验编造岗位、通过率、HC、薪酬或录取概率
- 简历优化可吸收该 skill 的原则：基于真实经历、STAR 表达、院校中性、不夸大、不编造

岗位库：

- `server/data/jobs.json`：当前默认岗位库
- 如果改用 CSV，可放 `server/data/jobs.csv` 或在 `.env` 配 `JOBS_FILE`

设计文档：

- `docs/superpowers/specs/2026-06-10-offer-catcher-design.md`

## 当前 UI 约定

视觉方向：

- 浅色背景
- 白色卡片
- 细边框
- 轻阴影
- 不要回到深色网格、大面积 glow、控制台风格
- 不要把页面做成 React Bits 组件展览，只在关键区域使用轻量动效

文案方向：

- 少说「AI」「模型」「Skill Trace」
- `Skill Trace` 已改为「分析进度」
- 页面主文案是「上传简历，找到更值得投的岗位。」

布局方向：

- 未分析：上传卡片 + 分析进度 + 空结果提示
- 分析后：压缩上传区，让岗位匹配榜和岗位诊断更早进入首屏

## 已验证状态

最近一次改版后已验证：

- `npm run build` 通过
- `npm audit` 为 0 vulnerabilities
- 桌面截图检查通过
- 390px 移动端检查通过，无横向溢出
- 真实百炼调用结果页可渲染

## 注意事项

- 不要提交 `.env`、`node_modules`、`dist`、`tmp`
- 用户此前提供过 API key，后续不要在回复、日志或提交里复述
- 文件编辑用 `apply_patch`
- 如果只改前端视觉，通常不需要读完整后端，只需确认 API response shape
- 如果改模型输出字段，要同步检查 `server/src/types.ts`、对应 skill 和 `client/src/App.tsx`
