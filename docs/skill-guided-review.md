# Skill-guided UI / UX 审查与实施（2026-11-21）

## 审查范围

仓库 `weepwood/gr8r-studio-ui` 的设计令牌、基础控件、弹层交互、组件展示站，以及 320px～桌面宽度的 CSS 规则。原项目使用 CSS、Web Components、Node 静态演示；因此本轮未引入动画库、Vue 或 React。

阅读并应用的公开 Skill：

- Jakub Krehel：[better-interface](https://github.com/jakubkrehel/skills/tree/main/skills/better-interface)、[better-ui](https://github.com/jakubkrehel/skills/tree/main/skills/better-ui)、[better-colors](https://github.com/jakubkrehel/skills/tree/main/skills/better-colors)、[better-layout](https://github.com/jakubkrehel/skills/tree/main/skills/better-layout)、[better-accessibility](https://github.com/jakubkrehel/skills/tree/main/skills/better-accessibility)、[better-motion](https://github.com/jakubkrehel/skills/tree/main/skills/better-motion)。
- Emil Kowalski：[animate](https://github.com/emilkowalski/skills/tree/main/skills/animate)、[review-animations](https://github.com/emilkowalski/skills/tree/main/skills/review-animations)、[animation-performance](https://github.com/emilkowalski/skills/tree/main/skills/animation-performance)、[remove-animations](https://github.com/emilkowalski/skills/tree/main/skills/remove-animations)。

## 按优先级实施的内容

| 优先级 | 源位置 | 发现 | 调整 |
| --- | --- | --- | --- |
| 高 | `src/tokens.css` | `--gr-ink-muted: #929089` 在白色表面对比度约 3.20:1（小字低于 4.5:1） | 调整为 `#74716b`；深色模式单独校准 |
| 高 | `src/tokens.css` | 警告、错误、蓝色标签等文字色在白色表面未稳定达到 4.5:1 | 调整为更可读的语义颜色 |
| 高 | `src/components.css` | 原生输入控件边线较浅，触屏输入字号 13px，窄屏可用性不足 | 独立控制边框令牌，粗指针下 16px 输入文字 |
| 高 | `demo/demo.js`, `src/layout.css` | 移动导航可见时缺少遮罩和焦点约束，收起后仍可由键盘进入 | 添加 scrim、inert、Tab 焦点循环、Escape 关闭与焦点恢复 |
| 中 | `demo/demo.js` | 筛选按钮以 `textContent` 重写自身，导致图标永久消失 | 保留原 DOM，更新 pressed 状态与实时计数 |
| 中 | `src/elements.js` | 命令面板视觉选择状态与读屏器选项语义未统一 | combobox / listbox / active descendant、空结果提示 |
| 中 | `src/elements.js` | Toast 自动关闭可能打断阅读，退出时直接消失 | 指针/焦点暂停，退出状态，opacity/transform 过渡 |
| 中 | `src/components.css` | 原有 hover 样式对触屏可能粘住 | hover-only 规则移至 `hover:hover` 与 `pointer:fine` 媒体条件 |
| 低 | `demo/demo.js` | 分段按钮只弹 toast，没有切换内容 | 使用真实的三个状态面板，支持左右键 |
| 低 | `src/components.css` | 对话框出现时缺乏空间过渡 | 低频 modal 采用 210ms opacity/transform 进入，命令面板保持即时 |

## 运动策略

- 高频：命令面板开关、表格行、键盘导航 **无入场编排和 stagger**。
- 常规：按钮悬停、Tab 指示 120～160ms 快速状态变化。
- 偶发：Dialog 210ms 小幅移入、Toast 基于状态的可中断进入与退出。
- 无障碍：`prefers-reduced-motion` 移除几何位移，保留必要的视觉状态；鼠标 hover 仅在 fine pointer 生效。
- 不使用 `transition: all`、昂贵的 blur 动画或每帧 JS 布局状态更新。

## 验证与限制

- 使用 Node 内置的测试检查组件公开 API、主题、相关 DOM 契约以及语义颜色的 WCAG 对比度。
- GitHub Actions 执行测试和静态构建，结果以 PR 的 Checks 页面为准。
- **未声称**已验证所有浏览器/移动设备真实渲染、屏幕阅读器或完整 WCAG 2.2 AA，以上需要后续浏览器矩阵与人工评估。
- 设计取向保持原项目紧凑、温和、低噪声，不额外加入连续光效、卡片弹跳或装饰性动画。
