# GitHub Pages 部署与故障排查

## 工作流约定

工作流：`.github/workflows/ci.yml`。

1. `verify` 安装依赖，运行 Node 测试、构建及 Chromium 端到端测试。
2. 检查 `dist/index.html`、CSS 和演示 JS 是否存在。
3. 通过官方 `upload-pages-artifact` 将 `dist/` 打包为 Pages 要求的 `artifact.tar` 并上传；**不能把普通目录 ZIP 制品直接当作 Pages 制品**。
4. 制品名为 `github-pages-<run_id>-<run_attempt>`，保留 7 天；确切名称和上传返回的 ID 作为构建任务输出。
5. 只有 `main` 的非 PR 运行允许进入 `pages` 任务。手动选择其他分支时只验证及打包，不发布生产站点。
6. 只读的 `artifact-check` 任务在 PR 和生产运行中都会校验同一次运行的制品名称、ID、非空及未过期状态；部署任务依赖此检查，再把构建任务输出的名称传给官方 `deploy-pages`。
7. 生产部署使用 `github-pages` 并发组，不主动取消正在进行的部署。GitHub 可能替换排队中的旧部署，因此并不承诺每个中间提交都上线。

PR 也执行同样的打包步骤，但没有 Pages 写入权限、不执行生产部署。Actions 下载页面中看到的是包含 `artifact.tar` 的 Pages 制品，不再额外上传普通的 `site` 制品。

### 运行时与权限

- 使用官方当前 Node 24 运行时 Actions；项目测试本身仍使用 Node 22，不要求库消费者改用 Node 24。
- 验证任务仅有 `contents: read`。
- `artifact-check` 任务有 `contents: read`、`actions: read`，只负责校验制品，无发布权限。
- 部署任务另有 `pages: write`、`id-token: write`。
- 不需要增加 PAT 或在仓库中保存个人凭据。
- Pages 设置必须为 **Settings → Pages → Build and deployment → GitHub Actions**。

## 重试方式

- **仅发布失败、构建成功且制品未过期：** 可以使用 “Re-run failed jobs”。部署任务引用成功构建输出的名称，不会再上传一个同名制品。不要在部署任务中根据当前 `github.run_attempt` 自行重新计算名称。
- **构建 / 打包失败或制品已过期：** 使用 “Re-run all jobs”，或在 `main` 上手动触发完整工作流。新构建使用新的 attempt 名称。
- **临时 API 429 / 5xx 或制品暂不可见：** 发布前检查按 2、4、8、16、30 秒间隔重试，累计等待最多约 60 秒（不含 API 请求耗时）。权限错误、ID 不符、重复、空制品和过期制品会直接失败，不会随意选择旧制品继续发布。
- 预检通过不等于发布成功；最终以 `deploy-pages` 的结果和 Pages 环境链接为准。

## 2026-11-22 故障记录

运行：[45031264835](https://github.com/weepwood/gr8r-studio-ui/actions/runs/45031264835)，提交 `5f8a90d`。

### 已确认的事实

- `verify` 成功，包含 Node 测试、静态构建和浏览器测试。
- Pages 配置、普通制品下载、Pages 制品上传均成功，错误发生在 `actions/deploy-pages@v4` 的制品发现阶段。
- 第一次报错：`No artifacts named "github-pages" were found for this workflow run`。
- 事后通过 GitHub REST API 查询，同一次运行确实存在名为 `github-pages` 的未过期制品，大小为 31011 字节。因此不能把错误简单归因于没有执行上传。发布 Action 的即时查询和事后的 REST 列表结果不一致；底层原因仅凭这些日志不能最终确定。
- 重跑失败任务后报错变为：`Multiple artifacts named "github-pages" were unexpectedly found ... Artifact count is 2`。旧流程在部署任务内重新上传固定名称，暴露了重跑时的重复制品问题。
- 另有 Node 20 Actions 被强制切换到 Node 24 的弃用警告；它不是上述制品错误的直接证据，但需要更新。

### 修复范围

- 用构建任务直接上传 Pages 制品，删除部署任务内的下载及再次上传。
- 用运行 / 尝试唯一名称与构建输出，消除重跑名称碰撞和选错旧产物的风险。
- 新增 `scripts/pages-artifact.mjs`，在发布前进行有界的制品发现等待和身份校验。
- 更新 checkout、setup-node、artifact、configure-pages、deploy-pages 等官方 Actions 到当前主版本。
- 限制生产分支、增加部署并发组，并补充独立单元测试。

**验证边界：** 本地模拟测试可以验证等待、失败、身份校验及工作流结构，PR 可以验证真实构建和上传；生产 Pages 发布仍需修复合并后在 `main` 运行才能确认。没有把更改提交到分支或 PR 检查通过描述为“已经恢复上线”。
