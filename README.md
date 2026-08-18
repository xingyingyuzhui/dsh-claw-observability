# dsh-observability

治理套件共用的诊断日志，以及设置里的 **运行诊断** 页。其它插件通过同级的 `../dsh-observability/observe.mjs` 写日志；本包再提供按错误码 / `traceId` 看时间线的页面。

```sh
dsh plugin --profile web add github:xingyingyuzhui/dsh-observability
```

装完重启 `dsh web`。打开 **设置 → 运行诊断**（在「审计」旁边）。

改 Client 源码后执行 `npm run build`，不要手改生成的 `client.js`。

- 记操作终态，不记每次内部函数调用
- 终态只能是 `succeeded` / `rejected` / `failed` / `degraded`
- 字段白名单，不写 prompt、memory/identity 正文、工具参数、token
- 诊断落在 `$DSH_HOME/agent-observe/diag.jsonl`；写失败退回 stderr
- 安全审计仍由 `dsh-agent-gate` 写 `agent-gate/audit.jsonl`
