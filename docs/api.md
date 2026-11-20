# Gr8r Studio UI — API

本库有两种使用接口：`gr-` 前缀的 **CSS 组合类** 和 6 个提供 DOM 行为的 **Web Components**。请先在包含组件的区域上添加 `class="gr-ui"`。

## 导入

~~~js
import "@weepwood/gr8r-studio-ui/styles.css";
import { defineGr8rElements, applyGr8rPreferences } from "@weepwood/gr8r-studio-ui";

defineGr8rElements(); // 幂等
applyGr8rPreferences(document.querySelector(".gr-ui"), {
  theme: "light",          // light | dark
  accent: "indigo",        // indigo | teal | rose | graphite
  density: "comfortable"   // comfortable | compact
});
~~~

不合法的设置抛出 `RangeError`，且该方法不会自动写入 localStorage 或更改其他 DOM 节点。

## CSS 组件目录

| 类型 | CSS 接口 |
| --- | --- |
| 按钮 | `gr-button`、`gr-button--primary`、`--secondary`、`--ghost`、`--danger`、`--sm`、`--lg` |
| 图标按钮 | `gr-icon-button`（始终提供可访问名称） |
| 表单 | `gr-field`、`gr-label`、`gr-hint`、`gr-error`、`gr-input`、`gr-search`、`gr-select`、`gr-textarea` |
| 选择 | `gr-checkbox`、`gr-radio`、`gr-switch-button` |
| 数据 | `gr-card`、`gr-badge`、`gr-tag`、`gr-avatar`、`gr-progress`、`gr-skeleton`、`gr-empty` |
| 导航 | `gr-segmented`、`gr-tab-list`、`gr-sidebar`、`gr-topbar`、`gr-app-shell` |
| 业务视图 | `gr-task-row`、`gr-table`、`gr-kanban`、`gr-kanban-column`、`gr-kanban-card` |
| 弹层 | `gr-menu`、`gr-toast`、`gr-dialog-header`、`gr-command-list` |

推荐尽可能直接使用原生的 `button`、`input`、`select`、`table` 元素，以继承浏览器已有的键盘和表单行为。

## gr-switch

~~~html
<gr-switch checked aria-label="Desktop notifications"></gr-switch>
~~~

- 属性：`checked`、`disabled`（布尔）；
- JS 属性：`checked: boolean`；
- 事件：`gr-change`，`detail = { checked: boolean }`。

## gr-tabs

~~~html
<gr-tabs>
  <div role="tablist" class="gr-tab-list" aria-label="Project view">
    <button role="tab" id="list-tab" aria-controls="list-panel" aria-selected="true">List</button>
    <button role="tab" id="board-tab" aria-controls="board-panel">Board</button>
  </div>
  <section role="tabpanel" id="list-panel" aria-labelledby="list-tab">List content</section>
  <section role="tabpanel" id="board-panel" aria-labelledby="board-tab" hidden>Board content</section>
</gr-tabs>
~~~

- 方法：`activate(tabButton, notify = true)`
- 键盘：左右方向键 / Home / End，自动更新焦点与 `aria-selected`
- 事件：`gr-change`，`detail = { tab: string }`
- 所有 Tab 的 `aria-controls` 应对应同一组件内的 panel ID。

## gr-dialog

~~~html
<gr-dialog id="confirm-dialog">
  <dialog aria-labelledby="confirm-title">
    <div class="gr-dialog-header"><h2 id="confirm-title">Confirm</h2></div>
    <div class="gr-dialog-body">Continue?</div>
    <div class="gr-dialog-footer"><button data-gr-close>Cancel</button></div>
  </dialog>
</gr-dialog>
~~~

- 方法：`show()` / `close(value?)`
- 事件：`gr-open` / `gr-close`
- 原生 `dialog.showModal()`，支持 Escape、点击 backdrop 与带 `data-gr-close` 的关闭按钮。

## gr-dropdown

~~~html
<gr-dropdown>
  <button class="gr-button" data-gr-trigger>Actions</button>
  <div class="gr-menu" role="menu" hidden>
    <button role="menuitem" data-value="edit">Edit</button>
    <button role="menuitem" data-value="archive">Archive</button>
  </div>
</gr-dropdown>
~~~

- 方法：`open()` / `close(refocus?)`
- 键盘：上下方向键 / Home / End / Escape / Tab
- 事件：`gr-select`，`detail = { value: string }`
- 使用 `menu` 表示操作菜单，表单选择仍应优先用原生 `select`。

## gr-toast-stack

~~~html
<gr-toast-stack id="notices"></gr-toast-stack>
~~~

`document.querySelector("#notices").push("Saved", { tone: "success", duration: 3500 })`

- `tone`: `neutral` | `success` | `danger`
- `duration` 毫秒；`0` 表示不自动消失
- 文本以 `textContent` 插入，不解析为 HTML；最多保留 4 条同时显示。

## gr-command-palette

~~~html
<gr-command-palette id="palette">
  <dialog aria-label="Command palette">
    <input type="search" class="gr-command-input" />
    <div class="gr-command-list">
      <button data-gr-command="go-home">Home</button>
    </div>
  </dialog>
</gr-command-palette>
~~~

- 方法：`open()` / `close()`
- 输入过滤、上下键选择、Enter 执行、Escape 关闭
- 事件：`gr-command`，`detail = { command: string }`
- 键盘全局快捷键由应用自行注册。

## 自定义事件示例

~~~js
document.querySelector("gr-switch").addEventListener("gr-change", event => {
  console.log(event.detail.checked);
});
~~~

## Accessibility note

请提供 label / aria-label、关联字段错误描述、在使用 `gr-progress` 时补充 `role="progressbar"` 和 aria 值，并在生产环境针对具体读屏器和浏览器进行验证。此库实现基础键盘行为，并非完整的无障碍认证。
