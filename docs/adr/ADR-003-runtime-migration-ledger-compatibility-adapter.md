# ADR-003：Runtime Migration Ledger Compatibility Adapter

- 状态：`ACCEPTED`
- 日期：2026-08-08
- 关联：CX-0194 Gate B Preflight、CX-0195、ADR-002
- 适用 CLI：Supabase CLI `2.110.0`

## Context

远程 Staging 保留 `000` 至 `065` 共 66 个 Migration History 版本，但原始 SQL 已无法恢复。
仓库活动迁移链只有冻结的 Canonical Baseline `20260807120000`。Supabase CLI 会在远程存在、
本地缺失这些版本时拒绝 `db push --dry-run`，而把 66 个版本标记为 reverted 会破坏已接受的
历史保留决策。

## Decision

1. `supabase/migrations/` 继续只包含 Canonical Baseline 及其之后的新迁移。
2. `000` 至 `065` 不进入活动链，也不冒充可重放的原始历史 SQL。
3. 远程规划时，在调用方拥有的临时 Supabase workdir 中生成 66 个只含 `select 1;` 的 ledger
   markers，并复制冻结的 Canonical Baseline。
4. 临时目录仅用于 `migration list` 与 `db push --dry-run` 规划，使用后删除。
5. 原始 `supabase db push` 继续 fail-closed。任何实际远程写入必须由独立任务卡和显式 Gate B
   批准，不得因本 ADR 自动获得授权。

## Proof

- 对现有 Staging 的只读 `migration list` 精确对齐 66 个 Legacy 版本。
- 默认与 `--include-all` 两种 `db push --dry-run` 都只计划
  `20260807120000_pg_os_canonical_baseline.sql`。
- 独立 Sandbox 从临时 67 文件链重建成功：301 批次，账本精确为 `000-065` 加 Canonical。
- 重建后归一化 Schema Diff：178 张表匹配，0 缺失，0 额外，0 未解释差异。
- Sandbox 随后恢复 canonical-only：235 批次成功，临时历史标记清理后只剩
  `20260807120000`；最终 Schema Diff 仍为 0 差异。
- Staging Schema、数据和 Migration History 写入均为 0。

## Consequences

- 历史可审计性与仓库可重放性被明确分离。
- 所有未来远程迁移规划必须通过受测 adapter；直接 CLI 不被视为安全路径。
- Adapter 只解决 CLI ledger 对齐，不证明 Gate B 已授权，也不证明生产迁移安全。

## Rollback

删除 compatibility manifest、adapter/cleanup 脚本、命令和本 ADR；仓库活动迁移链无需回滚。
Sandbox 可重建；Staging 无需数据库回滚，因为 CX-0195 未对其执行任何写入。
