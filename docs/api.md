# Gr8r Studio UI — API

本库有两种使用接口：`gr-` 前缀的 **CSS 组合类**，以及 12 个提供 DOM 行为的 **Web Components**。请先在包含组件的区域上添加 `class="gr-ui"`。

> 展示站里每张组件卡片都有 **Preview / Code / API** 三个视图：Code 视图中的 HTML 是组件升级前抓取的原始写法，可直接复制。

## 导入

~~~js
import "@weepwood/gr8r-studio-ui/styles.css";
import { defineGr8rElements, applyGr8rPreferences } from "@weepwood/gr8r-studio-ui";

defineGr8rElements(); // 幂等，注册全部 12 个元素
applyGr8rPreferences(document.querySelector(".gr-ui"), {
  theme: "system",         // light | dark | system（system 由 CSS 跟随 prefers-color-scheme，无闪烁）
  accent: "indigo",        // indigo | teal | rose | graphite
  density: "comfortable",  // comfortable | compact
  motion: "full"           // full | reduce（应用内“减少动效”，与系统设置叠加）
});
~~~

不合法的设置抛出 `RangeError`，并且整次更新都不会生效；该方法不写入 localStorage，也不修改其他 DOM 节点。

其他导出：

| 导出 | 说明 |
| --- | --- |
| `resolveGr8rTheme(theme)` | 把 `system` 解析为当前实际显示的 `light` / `dark` |
| `PREFERENCE_CHOICES` | 各偏好的合法取值（冻结对象） |
| `playEffect(element, className, ms?)` | 播放一次性动效类（见“动效”），自动尊重减少动效 |
| `computePlacement(anchor, floating, viewport, opts)` | 浮层定位纯函数：上下翻转 + 视口夹取 |
| `dropIndex(midpoints, y)` | 看板落点计算纯函数 |
| `monthMatrix` / `addMonths` / `addDays` / `toISODate` / `parseISODate` | 本地日期工具（无时区漂移） |

## 本地化（i18n）

组件内置文案（无障碍名称、空状态、看板读屏播报、日历按钮、通知关闭按钮等）内置 **English** 与 **简体中文**，按元素最近的 `[lang]` 祖先选择语言，同一页面的不同区域可以用不同语言。

~~~js
import { applyGr8rLocale, registerGr8rMessages } from "@weepwood/gr8r-studio-ui";

applyGr8rLocale(document.documentElement, "zh-CN"); // 设置 lang 并刷新区域内所有 gr-* 元素
applyGr8rLocale(document.querySelector("#panel"), "en"); // 也可以只切换某个区域

// 新增或覆盖语言（未提供的键回退到英文）
registerGr8rMessages("ja", { "popover.empty": "一致する項目はありません", "calendar.next": "翌月" });
~~~

| 导出 | 说明 |
| --- | --- |
| `applyGr8rLocale(target, locale)` | 设置 `lang`，并对 target 及其内部每个 Gr8r 元素调用 `localize()`；非法标签抛 `RangeError` |
| `registerGr8rMessages(locale, messages)` | 注册 / 合并语言包 |
| `grT(element, key, vars?)` | 按元素语言取文案，支持 `{name}` 占位符 |
| `resolveGr8rLocale(element)` / `matchGr8rLocale(tag)` | 解析元素语言；`zh`、`zh-Hans`、`zh-TW` 等都匹配到 `zh-CN`，未知语言回退 `en` |
| `gr8rMessages(locale)` / `gr8rLocales()` | 读取语言包 / 已注册语言 |

- `gr-calendar` 的月份、星期与完整日期朗读名称使用 `Intl.DateTimeFormat`，直接采用 `lang` 标签（如 `zh-CN` 显示“2026年11月”）。
- 组件只翻译**自己生成**的文字；你写在组件里的标签、选项和 `aria-label` 由应用负责翻译。语言改变后调用 `applyGr8rLocale` 或元素的 `localize()`。
- `gr-select` 会监听原生 `<option>` 文字与 `optgroup[label]` 的变化并自动重建列表。
- 中文排版：`--gr-font` 在拉丁字体之后提供苹方 / 冬青黑 / 微软雅黑 / 思源黑体回退；`:lang(zh)` 下标题取消负字距、正文行高增至 1.6。

可用的文案键：`switch.toggle`、`toast.dismiss`、`command.list`、`command.empty`、`popover.empty`、`contextMenu.label`、`calendar.previous`、`calendar.next`、`kanban.roledescription`、`kanban.hint`、`kanban.pickedUp`、`kanban.pickedUpAt`、`kanban.position`、`kanban.dropped`、`kanban.droppedOriginal`、`kanban.cancelled`、`kanban.rejected`（后几项使用 `{card}`、`{column}`、`{position}`、`{total}` 占位符）。

## CSS 组件目录

| 类型 | CSS 接口 |
| --- | --- |
| 按钮 | `gr-button`、`gr-button--primary`、`--secondary`、`--ghost`、`--danger`、`--sm`、`--lg`；`gr-link` |
| 图标按钮 | `gr-icon-button`（始终提供可访问名称）、`gr-tooltip[data-gr-tooltip]` |
| 表单 | `gr-field`、`gr-label`、`gr-hint`、`gr-error`、`gr-input`、`gr-search`、`gr-select`、`gr-textarea` |
| 选择 | `gr-checkbox`、`gr-radio`、`gr-switch-button` |
| 数据 | `gr-card`、`gr-badge`、`gr-tag`（`--blue/violet/green/teal/amber/rose/red/orange/outline`、`gr-tag__dot`）、`gr-avatar`（`--xs/sm/lg`、`[data-presence]`）、`gr-progress`（`--good/danger/sm/animate`）、`gr-skeleton`、`gr-spinner`、`gr-empty`（`--danger`、`gr-empty__glyph`） |
| 状态与优先级 | `gr-status[data-status=backlog|todo|progress|review|done|cancelled]`、`gr-priority[data-level=urgent|high|medium|low|none]`（内含 3 个 `<i>`）、`gr-status-label` |
| 指标 | `gr-stat-group`、`gr-stat`、`gr-stat__label/value/meta(--good|--danger)` |
| 反馈 | `gr-alert`（`--good/warning/danger`、`gr-alert__body`）、`gr-chip`、`gr-chip__remove` |
| 导航 | `gr-segmented`、`gr-tab-list`、`gr-breadcrumbs`、`gr-sidebar`、`gr-topbar`、`gr-app-shell` |
| 业务视图 | `gr-task-row`、`gr-table`、`gr-kanban`、`gr-kanban-column`、`gr-kanban-column__cards`、`gr-kanban-card`、`gr-props`（dl 属性列表） |
| 弹层 | `gr-menu`、`gr-popover`、`gr-picker`、`gr-listbox`、`gr-toast`、`gr-dialog-header/body/footer`、`gr-drawer__body`、`gr-command-list` |

推荐尽可能直接使用原生的 `button`、`input`、`select`、`table` 元素，以继承浏览器已有的键盘和表单行为。

## 动效

`src/motion.css` 提供一次性的状态动效类，添加到元素上即可播放（或调用 `playEffect`）：

| 类 | 用途 |
| --- | --- |
| `gr-fx-rise` | 入场；配合 `style="--gr-stagger: n"` 做 40 ms 递进 |
| `gr-fx-added` | 新建：上浮 + 强调色底色淡出 |
| `gr-fx-done` | 完成：绿色底色、复选框弹跳、标题从左到右划线 |
| `gr-fx-land` | 卡片落位 |
| `gr-fx-leave` | 删除离场（约 180 ms 后移除元素） |
| `gr-fx-shake` | 校验失败的轻微抖动 |

缓动 / 时长变量：`--gr-ease-out`、`--gr-ease-in-out`、`--gr-ease-spring`（支持 `linear()` 时为真实弹簧曲线）、`--gr-duration-fast | base | slow`。所有效果在 `prefers-reduced-motion: reduce` 或 `.gr-ui[data-gr-motion="reduce"]` 下退化为短淡入或直接跳过；高频界面（菜单项、命令面板行）不加逐项动画。

## gr-switch

~~~html
<gr-switch checked aria-label="Desktop notifications"></gr-switch>
~~~

- 属性：`checked`、`disabled`（布尔），`aria-label`（必需）
- JS 属性：`checked: boolean`
- 事件：`gr-change`，`detail = { checked: boolean }`
- 拇指以弹簧曲线移动；44×36 px 点击区域。

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

- 方法：`activate(tabButton, notify = true)`、`moveIndicator(animate?)`
- 键盘：左右方向键 / Home / End
- 事件：`gr-change`，`detail = { tab: string }`
- v0.3：选中指示条在标签之间滑动（ResizeObserver 跟随字体、密度、隐藏父级变化）；嵌套 `gr-tabs` 互不影响。

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

- 方法：`show()` / `close(value?)`；事件：`gr-open` / `gr-close`
- 原生 `dialog.showModal()`，支持 Escape、点击 backdrop 与带 `data-gr-close` 的关闭按钮，关闭后焦点回到打开者。

## gr-drawer

~~~html
<gr-drawer id="task-details" side="end">
  <dialog aria-labelledby="details-title">
    <div class="gr-dialog-header"><h2 id="details-title">Task details</h2><button data-gr-close aria-label="Close">×</button></div>
    <div class="gr-drawer__body">…</div>
    <div class="gr-dialog-footer">…</div>
  </dialog>
</gr-drawer>
~~~

- 继承 `gr-dialog` 的全部 API 与事件；`side="start"` 从左侧滑入。
- 打开时整页高度的侧边面板滑入，内容稍后递进上浮；关闭时可中断地滑出（`@starting-style` + `allow-discrete`）。

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

- 方法：`open()` / `close(refocus?)`；事件：`gr-select`，`detail = { value: string }`
- 键盘：上下方向键 / Home / End / Escape / Tab / 首字母查找
- 菜单从触发器方向轻微缩放淡入（使用独立的 `translate`/`scale` 属性，不覆盖视口修正用的 `transform`）。

## gr-popover

锚定在触发器上的浮层，使用原生 Popover API（顶层渲染，不受 `overflow` / `transform` 祖先裁切），不支持时回退到 `hidden`。

~~~html
<gr-popover placement="bottom-start">
  <button type="button" class="gr-picker" data-gr-trigger aria-label="Status: In progress">
    <span class="gr-status" data-status="progress"></span>In progress
  </button>
  <div class="gr-popover" data-gr-panel hidden>
    <input class="gr-popover__filter" type="search" data-gr-filter aria-label="Filter" />  <!-- 可选 -->
    <div role="listbox" aria-label="Status">
      <button type="button" role="option" data-value="todo">To do</button>
      <button type="button" role="option" data-value="progress" aria-selected="true">In progress</button>
    </div>
  </div>
</gr-popover>
~~~

- 属性：`placement`（`bottom-start | bottom-end | bottom-center | top-*`）、`keep-open`；listbox 可加 `aria-multiselectable="true"`
- 方法：`open()`、`close(refocus = true)`、`reposition()`；只读 `isOpen`
- 事件：`gr-select`（可取消），`detail = { value, label, selected }`；`gr-open` / `gr-close`
- 键盘：触发器上 ↓ 打开；列表内 ↑ ↓ Home End、首字母、Enter / Space 选择、Escape 关闭并回焦；过滤框内 ↓ 进入列表、Enter 选第一项。
- 内部没有 listbox 时按 dialog 处理（例如嵌入 `gr-calendar` 的日期选择），Tab 移出即关闭。

## gr-select

把原生 `<select>` 增强为设计系统列表框（WAI-ARIA “select-only combobox” 模式）。原生元素仍是唯一数据源：表单提交、`value`、`change` 事件均照常工作。

~~~html
<span class="gr-label" id="project-label">Project</span>
<gr-select>
  <select class="gr-select" name="project" aria-labelledby="project-label">
    <optgroup label="Active">
      <option data-gr-color="var(--gr-accent)" selected>Website redesign</option>
      <option data-gr-color="var(--gr-teal)">Mobile app</option>
    </optgroup>
    <option disabled>Customer portal</option>
  </select>
</gr-select>
~~~

- `option[data-gr-color]` 显示色点；支持 `optgroup`、禁用项；`placement` 属性
- 事件：原生 `input` / `change`，以及 `gr-change`，`detail = { value }`
- 键盘：↑ ↓ Home End PageUp PageDown、连续输入查找、Enter / Space 确认、Escape 取消、Tab 确认并移出
- 选项变化由 MutationObserver 自动重建；也可调用 `build()`。

## gr-context-menu

~~~html
<gr-context-menu>
  <ul data-gr-context-target>
    <li data-gr-context-item="brief.pdf" tabindex="0">Launch brief.pdf</li>
  </ul>
  <div class="gr-menu" role="menu" aria-label="File actions" hidden>
    <button type="button" role="menuitem" data-value="open">Open</button>
    <button type="button" role="menuitem" data-value="delete">Delete</button>
  </div>
</gr-context-menu>
~~~

- 右键、ContextMenu 键或 Shift+F10 打开（鼠标在指针处，键盘在聚焦项下方）
- 事件：`gr-select`，`detail = { value, context }`（`context` 为最近的 `data-gr-context-item`）；`gr-open` / `gr-close`
- 键盘同 `gr-dropdown`；滚动、外部点击或 Tab 关闭，Escape 关闭并回焦。

## gr-calendar

~~~html
<gr-calendar value="2026-11-25" min="2026-11-02" week-start="1" aria-label="Release date"></gr-calendar>
~~~

- 属性：`value` / `min` / `max`（`YYYY-MM-DD`）、`week-start`（0 = 周日 … 6，默认 1）；月份与星期名称取最近祖先的 `lang`
- JS 属性：`value`；事件：`gr-change`，`detail = { value }`
- 键盘：←→ 天、↑↓ 周、Home / End 周首尾、PageUp / PageDown 月（加 Shift 为年）、Enter / Space 选择
- 今天带 `aria-current="date"`；超出范围的日期禁用；可放入 `gr-popover` 作为日期选择器。

## gr-kanban

拖放看板，并提供完整的键盘替代方式与读屏播报。

~~~html
<gr-kanban aria-label="Sprint board">
  <div class="gr-kanban">
    <section class="gr-kanban-column" data-gr-column="todo" aria-label="To do">
      <div class="gr-kanban-column__heading">To do <small data-gr-count></small></div>
      <div class="gr-kanban-column__cards" data-gr-list>
        <article class="gr-kanban-card" data-gr-card="DOC-013"><b>Document component API</b></article>
      </div>
    </section>
  </div>
</gr-kanban>
~~~

- 指针：拖动卡片（移动 5 px 后开始；触屏长按约 260 ms 后开始，避免误触滚动）；靠近边缘自动横向滚动；松手后卡片从拖影位置平滑归位，其他卡片以 FLIP 动画让位。
- 键盘：聚焦卡片按 Space 拿起，方向键移动（左右换列、上下换位），Space / Enter 放下，Escape 取消；未拿起时方向键在卡片间移动焦点。
- 事件：`gr-move`（可取消），`detail = { card, from, to, index, fromIndex }`；`preventDefault()` 会把卡片放回原处（可用于流程校验）。
- 方法：`refresh()`，外部增删卡片后重新扫描并更新 `data-gr-count`。
- 卡片内的按钮 / 链接 / 输入框不会触发拖动；需要专用把手时加 `data-gr-handle`。

## gr-toast-stack

~~~js
const stack = document.querySelector("gr-toast-stack");
stack.push("Saved", { tone: "success", duration: 3500 });
stack.push("Task deleted", { duration: 0, action: { label: "Undo", onClick: toast => restore() } });
~~~

- `tone`：`neutral` | `success` | `warning` | `danger`
- `duration` 毫秒；`0` 表示不自动消失。底部有一条倒计时细线，悬停或聚焦时与计时一起暂停。
- `action`：`{ label, onClick }`；`onClick` 返回 `false` 时保持通知不关闭
- 文本以 `textContent` 插入；最多同时显示 4 条。

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

- 方法：`open()` / `close()`；事件：`gr-command`，`detail = { command: string }`
- 输入过滤、上下键选择、Enter 执行、Escape 关闭；全局快捷键由应用自行注册。

## 自定义事件示例

~~~js
document.querySelector("gr-kanban").addEventListener("gr-move", event => {
  const { card, from, to } = event.detail;
  if (to === "done" && from !== "review") event.preventDefault(); // 未经评审不能直接完成
});
~~~

Vue 3：将 `tag.startsWith("gr-")` 设为 `compilerOptions.isCustomElement`。React：通过 DOM ref 订阅 `gr-*` 事件。

## Accessibility note

请提供 label / aria-label、关联字段错误描述、在使用 `gr-progress` 时补充 `role="progressbar"` 和 aria 值；状态 / 优先级图形必须与文字同时出现。本库实现基础键盘与读屏行为，并非完整的无障碍认证，生产环境请针对具体读屏器和浏览器验证。
