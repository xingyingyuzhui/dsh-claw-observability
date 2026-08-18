# dsh-observability

治理套件共用的诊断日志库。`apply()` 为空，只为和其它套件包并排放进 profile。其它插件通过同级的 `../dsh-observability/observe.mjs` 引用。

```sh
dsh plugin --profile web add github:xingyingyuzhui/dsh-observability
```

- 记操作终态，不记每次内部函数调用
- 终态只能是 `succeeded` / `rejected` / `failed` / `degraded`
- 字段白名单，不写 prompt、memory/identity 正文、工具参数、token
- 诊断落在 `$DSH_HOME/agent-observe/diag.jsonl`；写失败退回 stderr
- 安全审计仍由 `dsh-agent-gate` 写 `agent-gate/audit.jsonl`
