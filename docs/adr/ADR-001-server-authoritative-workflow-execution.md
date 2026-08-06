# ADR-001：服务端权威的工作流执行架构

- 状态：`PROPOSED`（建议在 CX-0201 批次采纳；首个服务端执行并通过验证的 Transition 后正式生效）
- 日期：2026-08-06
- 决策人：PG OS Codex 执行
- 关联任务：CX-0201、CX-0202、CX-0401
- 关联规范：V1.8 INV-006、INV-007、INV-042、INV-047；V2.5 Workflow Machine 15.3-15.5、15.7-15.8、15.20；Backlog CX-0201/CX-0202/CX-0401

## 1. 问题

当前 Workflow 受控状态的写路径是浏览器直接调用 Supabase 表接口，由
`src/repositories/supabaseWorkflowRepository.ts` 对每个模块的表快照执行
`upsert(rows, { onConflict: "id" })`（仓库证据：`supabaseWorkflowRepository.ts:1818-1826`）。

该路径无法满足 V2.5 工作流机器的核心合同：

- 无事务边界：多个表快照的 upsert 互不原子；
- 无幂等记录：重复提交会重复写入；
- 无乐观锁/版本谓词：最后写入者覆盖；
- Guard 仅在客户端执行（`src/services/guardService.ts:46-382`），浏览器可绕过；
- 无 after-commit 事件与 durable outbox；
- 审计依赖应用层回调，缺少与服务端状态变更同一事务的保证。

规范要求（INV-006、INV-042）：所有阶段迁移必须由后端状态机验证；所有权限校验必须在服务端执行。
因此必须选择并落地一个服务端权威的执行边界。

## 2. 仓库现状证据

| 证据点 | 位置 |
| --- | --- |
| 浏览器 Supabase 客户端 | `src/lib/supabase.ts` |
| 仓库工厂在 Supabase 与内存仓库之间选择 | `src/repositories/workflowRepositoryFactory.ts:6-13` |
| 逐表 upsert 写路径 | `src/repositories/supabaseWorkflowRepository.ts:1818-1826` |
| 客户端 GuardService（含批准/确认/守卫方法） | `src/services/guardService.ts:46-382` |
| RLS 策略版本化（66 策略/静态、125 策略/远程） | `supabase/migrations/202606290002_rls_policies.sql`、`supabase/policies/rls_policies.sql` |
| 已有服务端执行先例：媒体 onboarding 阶段门触发器 | `supabase/migrations/202607260001_media_onboarding_stage_gates.sql` |
| 本地迁移中声明的函数（9 处 create function） | `supabase/migrations/*.sql` |
| 无 `supabase/functions` 目录、无独立 Node 服务端 | `supabase/` 目录清单、`package.json` 依赖 |
| 部署形态为纯 SPA（Vite 构建 + 全路由 rewrite） | `vercel.json` |
| Edge Runtime 已在 CLI 配置中启用 | `supabase/config.toml` `[edge_runtime]` |
| 审计仓库与直接审计写 | `src/repositories/auditLogRepository.ts`、`src/services/businessAuditCoverage.ts` |
| 无 durable outbox、无定时器实现 | `.codex/repo-map.md`、`.codex/spec-gap-matrix.yaml` CAP-AUDIT-OUTBOX-TIMERS |

## 3. 候选方案

### 方案 1：浏览器直接 Supabase 写入（现状）

浏览器保持 anon/authenticated 会话，直接对表执行 insert/update/upsert，由 RLS 约束。

### 方案 2：PostgreSQL RPC

将 Transition 执行实现为 `security definer`（或带显式权限）的 PL/pgSQL 函数，浏览器调用
`rpc("workflow_transition_execute", ...)`；事务、幂等、版本检查、审计、outbox 写入全部在函数内完成。

### 方案 3：Supabase Edge Function + PostgreSQL RPC

Edge Function 提供 HTTP API 合同（稳定错误码、请求/响应信封、JWT 角色解析），内部调用方案 2 的 RPC；
浏览器只调用 Edge Function。

### 方案 4：独立 Node API

新增一个独立的 Node.js 服务（Vercel Serverless 或独立主机），承载 Transition 执行与 API 合同，
浏览器通过 HTTP 调用该服务。

## 4. 对比

| 维度 | 方案 1：浏览器直写 | 方案 2：PostgreSQL RPC | 方案 3：Edge Function + RPC | 方案 4：独立 Node API |
| --- | --- | --- | --- | --- |
| 事务 | 无；逐表 upsert 非原子 | 强；PL/pgSQL 函数内单事务 | 强；事务由 RPC 持有 | 强；应用层事务/补偿 |
| 幂等 | 无 | 可内建（唯一约束 + 幂等表） | 同方案 2，由 RPC 保证 | 需自建幂等存储与重试 |
| 乐观锁 | 无；last-write-wins | 可内建（version 谓词 + 冲突返回） | 同方案 2 | 需自建版本比较 |
| RLS | 依赖 RLS，浏览器可构造任意写 | `security definer` 需显式授权；普通表接口仍受 RLS | 同方案 2；Edge 验证 JWT 后再调用 | 服务持有强凭据，需自建授权映射 |
| Guard | 仅客户端，可绕过 | 服务端强制；机器定义需导入/生成 | 同方案 2 | 服务端强制 |
| Outbox | 无 | 可在同一事务写入 outbox 表 | 同方案 2；Edge 可作为消费者 | 可在同一事务写入，但多服务时需共享 DB |
| 可测试性 | 高（Vitest mock），但无服务端证据 | 高（SQL 单测 + 本地 DB + 只读探针） | 中高（RPC 单测 + Edge 本地运行） | 高，但需新增服务测试栈 |
| 部署复杂度 | 最低 | 低（迁移 + RPC） | 中（RPC + Edge Function 部署/权限） | 高（新增服务、鉴权、运维、监控） |
| 迁移风险 | 不涉及（但持久化本身风险高） | 依赖迁移管线；当前 CX-0190 阻塞需先解决 | 同方案 2，另加函数部署 | 同方案 2，另加服务配置 |
| 与现有代码兼容性 | 现状 | 兼容：仓库接口不变，仅写实现换为 RPC 调用 | 兼容：仓库接口不变，新增 HTTP 适配器 | 兼容：仓库接口不变，但新增服务边界 |
| 回滚方式 | — | 特性开关切回兼容仓库；函数可版本化 | 开关切回；Edge 路由可停用 | 开关切回；服务可下线 |
| 稳定错误码（INV-047） | 无 | 可返回码，但无 HTTP 合同 | 好：HTTP 状态 + 稳定错误码 | 好 |
| 服务端权威（INV-006/042） | 否 | 是 | 是 | 是 |

## 5. 推荐结论

**推荐方案 3：Supabase Edge Function + PostgreSQL RPC 作为最终服务端权威边界；方案 2 作为其事务内核。**

理由（基于仓库证据）：

1. 仓库没有任何独立 Node 服务端、也没有服务端框架依赖（`package.json` 仅含 React/Vite/Supabase JS 等），
   方案 4 会引入新的部署面、鉴权桥与运维成本，与“复用现有模块与约定”的 AGENTS.md 架构规则冲突。
2. Supabase 平台已具备两段现成能力：RLS/触发器（服务端执行先例：`202607260001` 阶段门触发器）与
   `[edge_runtime]` 配置（`supabase/config.toml`）。RPC 承载事务/幂等/乐观锁/审计/outbox，
   Edge Function 承载 CX-0401 要求的 HTTP API 合同与稳定错误码。
3. 浏览器直写（方案 1）必须退役：它不能证明原子性、幂等、版本冲突与 after-commit 事件，
   也无法满足 INV-006/INV-042。
4. RPC 作为单一事务内核可测试（SQL 级测试 + 只读远程验证），Edge Function 仅做契约转发，
   业务不变量不会散落两处。

**必须明确的边界**：

> Workflow 受控状态不得继续由浏览器逐表 upsert 直接修改。

即：任何受控状态表（五维状态向量、版本、历史、执行记录、审批快照、审计/outbox 关联行）的变更，
只能通过服务端执行路径（RPC/Edge Function）完成。浏览器仓库只保留读取（RLS 控制）与
通过受控 API 提交变更的能力；当服务端路径不可用时，执行失败而不是退化为浏览器直写。

## 6. 后续任务职责边界

### CX-0201 — Align workflow persistence

- 通过 expand/contract 迁移增加五维状态字段/表、`version` 乐观锁列、执行历史与幂等记录；
- 迁移由版本化 SQL 承载，先加后删，禁止破坏性首迁移；
- 兼容仓库（`WorkflowRepository`）的读接口保留；写接口改造为调用服务端执行路径（在 CX-0202 落地前
  不得放宽：受控写不得回退为浏览器逐表 upsert）；
- 完成远程 Schema 只读对账（CX-0192）并解决 CX-0190 迁移安全契约后方可执行迁移写。

### CX-0202 — Implement transition execution

- 在 PostgreSQL RPC 内实现 evaluate/execute：事务、幂等键、版本冲突、guard 求值、审计行与 outbox 行同事务写入；
- guard 求值使用 V2.5 机器定义的注册表（确定性算子），禁止任意代码执行；
- 失败时零副作用；重复执行返回同一结果；
- Edge Function 可先不做，RPC 即 CX-0202 的服务端执行证据；
- 通过 CX-0102 的默认关闭特性开关切换执行路径，Legacy 读兼容保留。

### CX-0401 — Implement workflow APIs

- 在 Edge Function 上暴露状态、可用转换、gate 结果、evaluate、execute 的 HTTP 合同；
- JWT 解析 + 角色解析（复用 `authSessionRepository` 语义）在 Edge 层完成，RPC 内再做权威校验；
- 稳定错误码信封（INV-047），版本冲突返回可补救信息，禁止 generic workflow PATCH；
- 浏览器仓库新增 Edge 适配器，通过特性开关接入；服务端路径不可用时明确失败，不静默回退。

## 7. 回滚

- 方案切换由 CX-0102 的 `workflow_machine_v25_provider` 等默认关闭开关控制；异常时激活 kill switch 恢复 Legacy 读兼容；
- RPC 函数按版本命名、可停用；Edge Function 路由可整体停用；
- 数据库变更遵循 expand/contract，首批不删除旧字段；回滚只撤销可逆增量；
- 任何迁移执行前必须通过 CX-0190/0192 的只读对账、dry-run 与 rollback 演练。

## 8. 待决策/开放问题

- CX-0190 的 no-production-project denylist 契约仍需用户决策；
- Edge Function 的部署与密钥管理（是否引入 `functions` 目录并纳入 CI）需在 CX-0401 批次批准；
- 定时/outbox 消费者（CX-0204）采用 `pg_cron` 或外部调度器需单独评估；
- 首个验证切片建议选择媒体 onboarding 或 publisher 技术交接中最小的单一 Transition。
