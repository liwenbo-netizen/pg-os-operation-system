# ADR-002：Canonical Migration Baseline Adoption

- 状态：`ACCEPTED`（Gate A 完成；Staging History Adoption 属于 Gate B，未执行）
- 日期：2026-08-07
- 关联：CX-0192（对账）、CX-0193（PROVEN）、CX-0194（采纳）、ADR-001
- 关联 CLI：Supabase CLI 2.110.0（`supabase migration repair/list/db push/migration new`）

## 1. 为什么旧的 66 条远程 Migration 无法恢复

CX-0192 只读对账证明：远程 `supabase_migrations.schema_migrations` 有 66 个顺序编号版本
（`000`–`065`），与本地 24 个日期编号版本零重叠；Git 历史、分支、Tag 中不存在这些文件；
旧开发包 RAR 已不在磁盘上，原始 SQL 无法找回。因此这 66 条只能作为历史参考，
不能作为可重放的权威迁移链。

## 2. 为什么 24 条本地 Migration 仅保留为历史参考

本地 24 条迁移是重建产物，曾经通过 Supabase SQL Editor 手工执行，未进入远程
`schema_migrations`；其累积结果已包含在 CX-0193 从 Staging 只读提取的 Schema 中。
继续把它们作为活动链会与 Canonical Baseline 重复冲突。Gate A 将其原样归档到
`supabase/migrations-legacy/pre-canonical-baseline/`（内容哈希保留），仅供审计。

## 3. 为什么采用 CX-0193 PROVEN Baseline 作为新 Source of Truth

CX-0193 用同一候选 Baseline 在隔离 Sandbox 完成两次独立空环境重建（各 236 批次）、
两次归一化 Schema Diff（0 未解释差异）、可重复性与失败恢复验证，证明该 Baseline
可以从零重建出与 Staging 语义一致的 Schema。因此它成为权威源。

## 4. Baseline Cutoff

- Canonical Baseline 版本：`20260807120000`
- 文件：`supabase/migrations/20260807120000_pg_os_canonical_baseline.sql`
- 候选哈希：`a9f1fce5bc61c936b0c0933405b9d3222628f690b4756b16369b5eb9798a149d`
- 语义哈希：`59bfb9e7e01a6264b410c02d9614b577201a4cf1e3b79752f4bcf359428481eb`
- 截止：所有早于该版本的本地迁移均为历史参考；远程 66 条为历史参考。

## 5. 未来 Migration 规则

- 新迁移必须放入 `supabase/migrations/`，版本为 12–14 位数字且严格大于 `20260807120000`；
- 版本唯一、按序递增；Baseline 必须是链首；
- 禁止 Legacy 版本重新进入活动链；
- Baseline 文件被 `validate:migration-chain` 哈希冻结，修改即失败；
- 新迁移必须经 Sandbox 链重建 + 归一化 Diff 验证后再考虑应用。

## 6. Staging History Adoption 候选方案（Gate B，本轮仅分析）

| 维度 | OPTION_A：保留 Legacy + 标记 Baseline applied | OPTION_B：修复 Legacy History | OPTION_C：新建 Canonical Staging | OPTION_D：其他 CLI 策略 |
| --- | --- | --- | --- | --- |
| schema_write_required | false（Schema 已匹配） | false | true（新项目重建） | 视策略而定 |
| migration_history_write_required | true（1 行 marker） | true（改动 66 行） | false | 视策略而定 |
| data_loss_risk | 无 | 历史溯源丢失风险 | 低（新项目） | 视策略而定 |
| CLI_support | `migration repair --status applied <version>` | `repair --status reverted`（不删除行） | `db push` 新项目 | `db push --dry-run` 观察 |
| rollback | 移除 marker 行 | 恢复原 history（不可逆风险） | 废弃新项目 | 视策略而定 |
| 与未来 db push 兼容 | 仅通过 ADR-003 运行时 ledger adapter | 破坏历史，不采纳 | 是 | 需另行证明 |
| auditability | 高 | 低 | 高 | 中 |
| 操作复杂度 | 低 | 高 | 高 | 中 |

**修订后的推荐：OPTION_A + ADR-003 adapter**。保留 66 条 Legacy History，不把伪造的历史 SQL
加入活动迁移链；所有远程 `migration list` / `db push --dry-run` 规划通过 ADR-003 的运行时临时
ledger markers 完成。CX-0195 只证明该规划策略，不授权执行 `migration repair`、Schema 写入或
Migration History 写入。Gate B 执行前必须重新完成完整 Preflight，并单独取得写入批准。

## 7. 回滚策略

- 仓库侧：删除 Canonical Baseline 文件/Manifest 或 revert 采纳提交即可恢复 24 条 Legacy 归档路径；
- Sandbox：可随时 Reset；
- Staging：Gate B 执行前不写入；若 Gate B 已写 marker，回滚为删除该 history 行；
- 正式数据：本轮零 Schema 写入，无数据回滚需求。
