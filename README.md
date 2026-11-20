# Gr8r Studio UI

**独立实现、框架无关的任务管理 / SaaS 后台 UI 组件库。**

[组件展示站（需启用 GitHub Pages）](https://weepwood.github.io/gr8r-studio-ui/) · [组件 API](docs/api.md) · [设计说明](docs/design-notes.md) · [版权与来源](docs/attribution.md)

视觉语言参考 [gr8rstudio/gr8r-studio](https://github.com/gr8rstudio/gr8r-studio)：温和的中性色分层、细线条、紧凑工作台、轻量动效与清晰的信息等级。

**本库不是原项目的官方组件库。** 原项目仓库检查时没有发现明确 LICENSE；本库的 CSS、JavaScript、示例与 SVG 均单独编写，没有将原项目文件直接移植到新仓库。

## 功能与组件

- **运行时零依赖**：CSS + ES modules + 原生 Web Components；可在普通网页、Vue、React、WebView 中使用。
- **主题**：浅色 / 深色，indigo / teal / rose / graphite 四种强调色，comfortable / compact 两种密度。
- **基础控件**：Button、IconButton、Input、Search、Textarea、Select、Checkbox、Radio、Card、Badge、Tag、Avatar、Progress、Skeleton、Empty。
- **工作台结构**：Sidebar、Topbar、AppShell、Tabs、Segmented、TaskRow、Table、Kanban。
- **带交互的原生组件**：Switch、Tabs、Dialog、Dropdown、ToastStack、CommandPalette。
- **示例**：组件展示站、可切换主题、任务新增和筛选、命令面板、弹窗及通知。
- **质量**：TypeScript 类型声明、Node 内置测试、GitHub Actions 构建 / Pages 部署配置。

## 本地启动

要求 Node.js 20+，无需安装任何额外运行时依赖：

~~~bash
git clone https://github.com/weepwood/gr8r-studio-ui.git
cd gr8r-studio-ui
npm run dev        # http://127.0.0.1:5173
npm test
npm run build      # 静态站点输出到 dist/
~~~

## 使用

仓库尚未发布到 npm Registry，可直接安装 GitHub 仓库：

~~~bash
npm install github:weepwood/gr8r-studio-ui
~~~

在支持 CSS import 的前端构建工具中：

~~~js
import "@weepwood/gr8r-studio-ui/styles.css";
import { defineGr8rElements, applyGr8rPreferences } from "@weepwood/gr8r-studio-ui";

defineGr8rElements();
applyGr8rPreferences(document.querySelector(".gr-ui"), {
  theme: "dark",
  accent: "teal",
  density: "compact"
});
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
| `src/components.css` | 控件与数据视图样式 |
| `src/layout.css` | 后台布局 |
| `src/index.css` | 统一样式入口 |
| `src/elements.js` | 六个 Web Components |
| `src/index.js` / `src/index.d.ts` | JS / TS 公共 API |
| `index.html` / `demo/` | 组件展示站 |
| `test/` | Node 组件契约测试 |
| `docs/` | 使用与版权文档 |

## 可访问性与功能边界

组件支持常见语义结构、焦点样式、键盘事件以及 `prefers-reduced-motion`，但不宣称已通过完整 WCAG 或浏览器矩阵认证。Kanban、Table、TaskRow 是**呈现组件**，并不包含原应用的协作服务、数据库、持久化或拖拽引擎。

## 部署

`main` 分支推送后，GitHub Actions 会尝试测试、构建和部署静态页面。若首次使用，请在仓库 **Settings → Pages → Build and deployment → GitHub Actions** 选择部署源。站点预期地址：https://weepwood.github.io/gr8r-studio-ui/ 。工作流文件已提交不代表页面已经上线，应以 Actions / Pages 的实际结果为准。

## 授权与来源

本仓库独立编写的代码采用 [MIT](LICENSE) 许可证。原始 [Gr8r Studio](https://github.com/gr8rstudio/gr8r-studio) 的源码、商标和资产不属于本库的 MIT 授权范围。详细说明参见 [docs/attribution.md](docs/attribution.md)。
