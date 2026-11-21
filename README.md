# DeepSeek 余额徽章

在 DeepSeek Harness（DSH）左侧栏底部、Settings 行旁显示一个 `deepseek余额：￥xx.xx` 徽章，余额与「设置 → 账号与余额」完全同源，不用再点进设置查余额。

## 功能

- **显示位置**：左侧栏底部 `sidebar.footer.action` 槽位，`order: 5`，紧邻 Settings 行。
- **显示条件**（任一不满足即隐藏，不占位）：
  - 右侧窗口打开的主会话（`mainView` 绑定的会话）选中的模型是 DeepSeek 模型，即 model id 或 provider 以 `deepseek` 开头；
  - 内置账号服务报告已登录，且余额接口返回 `ready`；
  - 侧边栏为宽栏（窄栏收起时不渲染）。
- **数据来源**：复用内置账号服务，调用 `remote.account.getBalance`（与设置页同一接口、同一份数据），不读取、不存储任何凭证。
- **刷新时机**：插件挂载、账号状态变化（`account-ui/change`、`account-ui/refresh`）、窗口重新获得焦点、以及每 3 分钟轮询一次。
- **展示格式**：`deepseek余额：￥12.34`，多钱包以空格分隔；未知币种显示 `CODE 12.34`，负数保留 `-`。

## 安装

插件商店（推荐）：打开 **设置 → DSH HUB 市场**，搜索 “DeepSeek 余额徽章” 后按提示安装。

命令行：

```bash
# 把 web 换成你实际使用的 profile（桌面版为 desktop）
dsh plugin --profile web add github:Temila/deepseek-balance-badge
```

安装后重启对应 profile，无需任何配置即可生效。

## 配置

无。本插件没有配置项，`cordis.patch.yml` 只插入一行插件：

```yaml
- insert:
    - id: deepseek-balance-badge
      name: 'deepseek-balance-badge'
```

## 权限与隐私

- 仅调用 DSH 内置的账号服务读取当前账号余额，**不发起任何额外的网络请求**，不上报遥测，不改动会话或其他插件数据。
- 依赖 DSH 提供的 `sidebar.footer.action` 槽位与 `remote.account` 服务，因此实际可见性完全由 DSH 的登录状态与权限控制决定。
- 包内**不含 `postinstall` 等生命周期脚本**，安装时不执行任何构建或下载。

## 兼容性

- 目标为 DSH Web 客户端（`platform: web`），需要 `@deepseek-ai/dsh-client-ui-sidebar` 与 `@deepseek-ai/dsh-client-ui-settings-account`（均为内置插件）。
- 已在 DSH 0.2.x 的 Web profile 上验证：徽章随 DeepSeek 模型选择出现/消失，余额与设置页一致。

## 卸载

```bash
dsh plugin --profile web remove deepseek-balance-badge
```

或在 **设置 → 插件** 中移除对应的 bundle。卸载只删除这一行插件，不影响账号数据与余额接口。

## 许可

[MIT](./LICENSE)

---

## English

A DSH bundle that shows a `deepseek余额：￥xx.xx` badge at the foot of the sidebar, next to Settings.

- **Where**: the `sidebar.footer.action` slot (`order: 5`).
- **When**: only while the main session in the right-hand window runs a DeepSeek model (model id or provider starting with `deepseek`), the account is signed in, and the balance call returns `ready`; hidden while the sidebar is collapsed.
- **Source**: the built-in account service (`remote.account.getBalance`), identical to Settings → Account & balance. No credentials are read or stored.
- **Refresh**: on mount, on account state changes, on window focus, and every 3 minutes.
- **Configuration**: none.
- **Network/permissions**: no extra requests, no telemetry, no lifecycle scripts; only the DSH-provided slot and account service are used.
- **Uninstall**: `dsh plugin --profile <profile> remove deepseek-balance-badge`.
- **License**: MIT.
