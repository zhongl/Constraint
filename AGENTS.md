## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

### 分阶段修改

当用户要求“按建议逐步修改”时：

1. 分阶段执行修改。
2. 每完成一个阶段并完成自我验证后，暂停并等待用户确认；确认后再提交该阶段变更并继续下一阶段。
3. 持续执行，直到所有修改完成。
