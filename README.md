# Gr8r Studio UI

**独立实现、框架无关的任务管理 / SaaS 后台 UI 组件库。**

[组件展示站（需启用 GitHub Pages）](https://weepwood.github.io/gr8r-studio-ui/) · [组件 API](docs/api.md) · [v0.3 设计 / 交互 / 动效说明](docs/v0.3-design-interaction-motion.md) · [更新日志](CHANGELOG.md) · [本地化说明](docs/i18n.md) · [设计说明](docs/design-notes.md) · [版权与来源](docs/attribution.md)

视觉语言参考 [gr8rstudio/gr8r-studio](https://github.com/gr8rstudio/gr8r-studio)：温和的中性色分层、细线条、紧凑工作台、轻量动效与清晰的信息等级。

**本库不是原项目的官方组件库。** 原项目仓库检查时没有发现明确 LICENSE；本库的 CSS、JavaScript、示例与 SVG 均单独编写，没有将原项目文件直接移植到新仓库。

## 功能与组件

- **运行时零依赖**：CSS + ES modules + 原生 Web Components；可在普通网页、Vue、React、WebView 中使用。
- **主题**：浅色 / 深色 / 跟随系统（纯 CSS，无闪烁），indigo / teal / rose / graphite 四种强调色，comfortable / compact 两种密度，应用内“减少动效”开关。
- **基础控件**：Button、IconButton、Link、Input、Search、Textarea、Select、Checkbox、Radio、Card、Badge、Tag（8 色）、Avatar（尺寸 / 在线状态）、Progress、Skeleton、Spinner、Empty、Alert、Chip、Breadcrumbs、StatGroup、Status、Priority。
- **工作台结构**：Sidebar、Topbar、AppShell、Tabs（滑动指示条）、Segmented、TaskRow、Table、Kanban、Props（属性列表）。
- **带交互的原生组件（12 个）**：Switch、Tabs、Dialog、Drawer、Dropdown、Popover（状态 / 优先级 / 负责人选择器）、Select（增强原生 select）、ContextMenu、Calendar（日期选择）、Kanban（拖放 + 键盘移动）、ToastStack（操作按钮 + 倒计时）、CommandPalette。
- **本地化**：组件内置文案提供 English / 简体中文，按 `[lang]` 区域生效，可用 `registerGr8rMessages` 扩展其他语言；展示站可在中英文间即时切换（跟随浏览器语言、可记忆）。
- **动效**：`motion.css` 一次性状态动效（新增 / 完成 / 落位 / 离场 / 抖动 / 入场）、缓动与时长变量、全部带 reduced-motion 降级。
- **示例**：每张组件卡片都有 Preview / Code / API 三视图与一键复制；可记忆的外观设置、任务搜索 / 排序 / 新增 / 抽屉详情 / 右键菜单 / 删除撤销 / 重置、可拖放看板、命令面板、多标签页同步。
- **质量**：TypeScript 类型声明、Node 内置测试、Playwright 浏览器回归、GitHub Actions 构建 / Pages 部署配置。

v0.3 改动见 [设计 / 交互 / 动效说明](docs/v0.3-design-interaction-motion.md)；历史评审见 [UI / UX 优化评审](docs/ui-ux-improvement-review.md)。

## 本地启动

要求 Node.js 20+，无需安装任何额外运行时依赖：

~~~bash
git clone https://github.com/weepwood/gr8r-studio-ui.git
cd gr8r-studio-ui
npm run dev        # http://127.0.0.1:5173
npm test
npm run build      # 静态站点输出到 dist/
~~~

浏览器回归为可选的开发检查（不会引入运行时依赖）：

~~~bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
npm run check:all  # Node 测试 + 构建 + 浏览器测试
~~~

开发服务器默认绑定 `0.0.0.0:5173`，便于代理预览；可用 `HOST` / `PORT` 覆盖。请勿将开发文件服务直接作为生产服务公开。

## 使用

仓库尚未发布到 npm Registry，可直接安装 GitHub 仓库：

~~~bash
npm install github:weepwood/gr8r-studio-ui
~~~

在支持 CSS import 的前端构建工具中：

~~~js
import "@weepwood/gr8r-studio-ui/styles.css";
import { defineGr8rElements, applyGr8rPreferences, applyGr8rLocale } from "@weepwood/gr8r-studio-ui";

defineGr8rElements();
applyGr8rPreferences(document.querySelector(".gr-ui"), {
  theme: "system",   // light | dark | system
  accent: "teal",
  density: "compact",
  motion: "full"     // full | reduce
});
applyGr8rLocale(document.documentElement, "zh-CN"); // 组件内置文案切换为简体中文
~~~

然后在 HTML / Vue / React 视图中组合使用：

~~~html
<div class="gr-ui" data-gr-theme="light">
  <button class="gr-button gr-button--primary">Create task</button>
  <span class="gr-badge gr-badge--good">Completed</span>
  <gr-switch aria-label="Notifications" checked></gr-switch>
</div>
~~~

**重要：** 将 `data-gr-theme` 等主题属性放在 `.gr-ui` 容器本身，避免与宿主应用全局 CSS 覆盖逻辑冲突。样式类和自定义事件 API 均见 [docs/api.md](docs/api.md)。

Vue 3 可将 `tag.startsWith("gr-")` 设为 `compilerOptions.isCustomElement`，React 建议通过 DOM ref 订阅 `gr-change` / `gr-select` 等自定义事件。

## 项目结构

| 路径 | 功能 |
| --- | --- |
| `src/tokens.css` | 设计变量、主题、密度 |
| `src/base.css` | 命名空间基础规则 |
| `src/components.css` | 控件、状态、数据视图样式 |
| `src/overlays.css` | 浮层、抽屉、选择器、日历样式 |
| `src/motion.css` | 一次性状态动效与 reduced-motion 降级 |
| `src/layout.css` | 后台布局 |
| `src/index.css` | 统一样式入口 |
| `src/elements.js` | 元素注册与基础组件（Switch、Tabs、Dialog、Drawer、Dropdown、Toast、Palette） |
| `src/overlays.js` | Popover、Select、ContextMenu |
| `src/board.js` | Kanban 拖放与键盘移动 |
| `src/calendar.js` | Calendar 与日期工具 |
| `src/internal.js` | 定位、焦点、动效等共享工具 |
| `src/i18n.js` | 组件内置文案（en / zh-CN）与语言解析 |
| `src/index.js` / `src/index.d.ts` | JS / TS 公共 API |
| `index.html` / `demo/` | 组件展示站（`demo/docs.js` 负责 Preview / Code / API，`demo/i18n.js` 负责中英文） |
| `test/` / `e2e/` | Node 契约测试 / Playwright 浏览器回归 |
| `docs/` | 使用与版权文档 |

## 可访问性与功能边界

组件支持常见语义结构、焦点样式、键盘事件以及 `prefers-reduced-motion`，但不宣称已通过完整 WCAG 或浏览器矩阵认证。`gr-kanban` 提供拖放与键盘移动的 DOM 行为并派发可取消的 `gr-move` 事件，但不包含原应用的协作服务、数据库或持久化；Table、TaskRow 仍是呈现组件。

展示站的任务示例使用本地存储（键 `gr8r-gallery:v1`，最多 200 条任务），刷新后保留任务和明确选择的外观偏好；浏览器禁用存储时降级为仅本次访问。任务内容不会上传，且不会跨设备同步；删除撤销入口不等于回收站，刷新或通知被关闭后不可恢复。该行为只属于 `demo/`，不会强加给组件库消费者。上方统计卡片为标注的示例数据，未与任务列表关联。

## 部署

`main` 分支推送后，GitHub Actions 会尝试测试、构建和部署静态页面。若首次使用，请在仓库 **Settings → Pages → Build and deployment → GitHub Actions** 选择部署源。站点预期地址：https://weepwood.github.io/gr8r-studio-ui/ 。工作流文件已提交不代表页面已经上线，应以 Actions / Pages 的实际结果为准。

构建任务只上传一次带运行 / 尝试编号的 Pages 制品，发布任务使用其确切名称和 ID 进行校验，避免重跑时固定名称冲突。仅 `main` 的非 PR 运行可发布，生产部署串行执行。构建成功、仅部署失败时可重跑失败任务；制品已过期或构建失败时应重跑完整工作流。详细过程和故障记录见 [Pages 部署与排查](docs/pages-deployment.md)。

## 中文本地化（v0.4.0）

- 组件库：12 个元素的内置文案全部本地化，新增 `applyGr8rLocale`、`registerGr8rMessages` 等 API；日历使用 `Intl` 显示中文月份与星期；补充中文字体回退与 `:lang(zh)` 排版。
- 展示站：顶栏“中 / EN”与外观设置中的语言切换；可见文字、`aria-label`、占位符、提示气泡、通知、读屏播报一起切换；首访跟随浏览器语言且无英文闪烁；未修改的示例任务随语言替换，你编辑过的任务保持原样。
- 测试：Node 测试保证页面上每条可见英文都有中文翻译、两种语言的键与占位符一致、翻译可逆；Playwright 在中文模式下扫描是否残留英文。

## 设计、交互与动效完善（v0.3.0）

- **从原项目提取的交互模式（独立实现）**：属性选择器弹层、增强型下拉、右键菜单、日期选择、任务抽屉、可拖放看板、状态 / 优先级图形、指标条、提示条与过滤标签。
- **交互**：所有新组件都有完整键盘路径（看板 Space 拿起 / 方向键移动；选择器 ↑↓ / 首字母 / Esc 回焦；右键菜单 Shift+F10）与读屏播报；浮层使用原生 Popover API 进入顶层，不被 overflow 裁切。
- **动效**：Tabs 指示条滑动、复选框打勾与开关弹簧、菜单从锚点方向缩放淡入、抽屉滑入、看板 FLIP 让位与落位归位、任务完成划线、删除离场、Toast 倒计时；均可被系统或应用内“减少动效”关闭。
- **展示站**：组件卡片 Preview / Code / API 三视图（代码取自组件升级前的原始 HTML）、Motion 演示区、Pickers / Status 新章节、任务右键菜单与抽屉、重置示例数据、无闪烁主题初始化、多标签页同步。

详见 [v0.3 说明](docs/v0.3-design-interaction-motion.md) 与 [CHANGELOG](CHANGELOG.md)。

## 交互与视觉优化（v0.2.0）

本轮按 [Jakub Krehel 的 better-ui / better-accessibility / better-colors / better-layout / better-motion](https://github.com/jakubkrehel/skills) 与 [Emil Kowalski 的 animate / animation-performance / review-animations](https://github.com/emilkowalski/skills) 的检查原则进行优化：

- 为部分语义文字、错误色、警告色、输入边界补足对比度；
- 鼠标悬停只在支持 hover 的设备上生效，触屏输入避免 iOS 焦点缩放；
- 优化对话框、菜单、命令面板的交互与辅助技术语义；
- Toast 改用可中断的 opacity / transform 过渡，悬停或聚焦时暂停自动关闭；
- 移动端侧栏增加遮罩、焦点限制与 Escape 返回；
- 修复任务筛选后图标消失，补上真实视图切换示例；
- 高频命令面板和列表不加入多余的入场/逐项动画，且支持 reduced motion。

以上是根据 Skill 原则完成的**代码改动**，不是对两套 Skill 的再发布。参见 [设计审查记录](docs/skill-guided-review.md)。

## 授权与来源

本仓库独立编写的代码采用 [MIT](LICENSE) 许可证。原始 [Gr8r Studio](https://github.com/gr8rstudio/gr8r-studio) 的源码、商标和资产不属于本库的 MIT 授权范围。详细说明参见 [docs/attribution.md](docs/attribution.md)。
