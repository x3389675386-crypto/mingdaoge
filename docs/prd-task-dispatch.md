# 简单 PRD：P2 修行任务派发系统

> 文档状态：默认档（简单 PRD）｜产品经理：许清楚（明道阁）｜关联一期：身份体系 / 双账户 / 兑换 / 论坛

## 1. 项目信息

- **Language**：中文
- **Programming Language**：Vite6 + React19 + TypeScript + MUI6 + Tailwind v4 + Supabase（Auth + Postgres + Storage + Realtime）
- **Project Name**：`cultivation_task_dispatch`
- **原始需求复述**：在明道阁（mingdaoge.top）一期基础上，新增「修行任务派发系统」，闭环为「管理员发布任务 → 用户认领 → 提交凭证（图片/文字）→ 管理员审核 → 自动发奖（阳德/积分，写入 reward_ledger）」。同时需界定用户提到的「签到 / 发帖 / 结缘得功德」等高频轻量功德获取方式，哪些走系统自动触发、哪些走管理员任务派发。

## 2. 产品定义

### 2.1 Product Goals（3 个，正交）

1. **可审计的修行任务闭环**：建立「派发 → 认领 → 凭证 → 审核 → 自动发奖」全链路，所有奖励经 RPC 写入 `reward_ledger`，与一期双账户（阳德/积分）体系完全一致，前端禁直改余额。
2. **自动与人工双轨功德获取**：将「签到 / 发帖 / 结缘」等高频轻量行为定义为系统自动触发（无凭证、无人工审核），降低运营负担、提升日活；将需核验的行为定义为管理员派发任务，保证质量与可控性。
3. **清晰的修行成长视图**：通过任务大厅 / 我的任务 / 进度看板，让用户感知「做功德 → 得奖励 → 兑换」的价值闭环，提升留存与兑换转化。

### 2.2 User Stories

**散修（sanxiu）视角**
- 作为散修，我想在任务大厅浏览并认领「抄经 / 诵咒」任务，提交手写照片凭证，以便通过审核获得阳德。
- 作为散修，我想每日签到自动获得少量阳德，以便被动积累修行资粮。

**法脉（famai）视角**
- 作为法脉，我想认领仅对法脉可见的高阶修行任务，以便获得阳德与专属认可。
- 作为法脉，我想在论坛发布功法帖，以便自动获得「发帖得功德」奖励。

**顾客（customer）视角**
- 作为顾客，我想认领仅对顾客开放的「商品体验 / 结缘」任务，以便获得积分去兑换中心消费。
- 作为顾客，我想每日签到获得少量阳德，以便保持活跃与回访。

**管理员视角**
- 作为管理员，我想在后台任务管理 Tab 配置任务（奖励类型与数量、凭证类型、身份可见范围、截止与名额）并发布，以便目标用户能在任务大厅看到。
- 作为管理员，我想在待审列表查看用户提交的凭证，批量通过/拒绝（拒绝需填原因），以便奖励自动发放且全程可审计。

### 2.3 任务分类与触发 / 发放机制（核心界定）

| 类别 | 触发方式 | 是否需要凭证 | 是否需要人工审核 | 发放机制 | 建议归属 |
|------|----------|--------------|------------------|----------|----------|
| **系统自动任务（自动功德规则）** | 由业务事件自动触发 | 否 | 否 | 事件发生时经 RPC 自动发奖，`operator_id = NULL`，写 `reward_ledger` | 不属于任务大厅，归「自动功德」 |
| ├ 每日签到 | 用户点击签到（每用户每日一次） | 否 | 否 | RPC +`reward_ledger`（reason=`每日签到`） | P1 |
| ├ 发帖得功德 | `forum_posts` 插入成功（本人） | 否 | 否 | RPC +`reward_ledger`（reason=`发帖得功德`） | P1 |
| └ 结缘 / 分享得功德 | 「结缘/分享」事件（定义见 Open Questions） | 否 | 否 | RPC +`reward_ledger`（reason=`结缘得功德`） | P1 |
| **管理员发布任务（派发闭环）** | 管理员在后台创建并发布 | 是（图片/文字） | 是（管理员审核） | 审核通过后经 RPC 发奖，`operator_id=管理员`，写 `reward_ledger`（reason=`任务奖励:<id>`） | P0 任务大厅 |

**关键约束（沿用一期）**：无论是自动任务还是派发任务，任何阳德/积分变动**只允许经 RPC（`apply_reward_change` 助手）**，且**必须**写入 `reward_ledger`；前端绝不直改 `profiles.yang_de / points`。这是与现有兑换、提现、奖励调整一致的唯一合规路径。

## 3. 技术规范

### 3.1 Requirements Pool

**P0（Must · 任务发派闭环）**
- **P0-1 任务定义与发布**：管理员在 `/admin` 新增「任务管理」Tab 创建任务，字段含标题、描述、奖励类型（阳德/积分）与数量、凭证类型（图片/文字/两者）、身份可见范围（顾客/散修/法脉，可多选，空=全可见）、截止时间、名额上限；状态 `draft → published`。
- **P0-2 任务大厅**：`/tasks` 展示已发布任务，按当前用户 `identity_type` 过滤可见性；支持按奖励类型（阳德/积分）、状态筛选；每张卡片含奖励徽标、截止时间、已认领人数、认领按钮（满额/截止/已认领则禁用）。
- **P0-3 认领**：用户认领后生成 `task_claims`（status=`claimed`）；同一用户对同一任务仅一次有效认领；满额或截止后禁止认领。
- **P0-4 凭证提交**：已认领用户提交凭证（图片经 Supabase Storage 上传 + 文字说明），status → `submitted`。
- **P0-5 审核**：管理员在后台待审列表查看凭证（图片预览 + 文字），操作「通过 / 拒绝」（拒绝必须填原因），status → `approved` / `rejected`。
- **P0-6 自动发奖**：审核通过后**仅经 RPC** 发放奖励并写 `reward_ledger`（reason=`任务奖励:<task_id>`，operator_id=管理员），status → `completed`；前端无直改余额接口。
- **P0-7 我的任务**：`/tasks/mine` 展示「进行中」（claimed/submitted 待审）与「已完成」（approved/completed），可提交凭证、查看审核结果与到账奖励。
- **P0-8 数据模型与权限**：新建 `cultivation_tasks` / `task_claims` / `checkin_logs` 三表；RLS 策略——任务公开读、认领本人+admin 读写、余额仅 RPC 写；复用一期 `is_admin()` 与 `AdminRoute` 鉴权。

**P1（Should · 自动功德获取）**
- **P1-1 每日签到**：首页/个人页签到入口；`checkin_logs` 按（user_id, checkin_date）去重，每用户每日一次；经 RPC 自动发阳德并写 `reward_ledger`（reason=`每日签到`，operator_id=NULL）。
- **P1-2 发帖得功德**：`forum_posts` 插入成功后经 RPC 自动发奖（reason=`发帖得功德`）；需确认是否限每日次数/防刷（见 Open Questions）。
- **P1-3 结缘 / 分享得功德**：定义「结缘/分享」事件（如分享商品或帖子到站外、添加私聊好友），触发自动发奖；事件边界待确认（见 Open Questions）。
- **P1-4 双轨解耦与统一明细**：自动类走事件触发器（无凭证无审核），派发类走闭环；二者奖励均入 `reward_ledger`，在「功德明细」中可统一查看来源。

**P2（Nice to have）**
- **P2-1 任务进度看板**：用户维度统计已领/已完成/累计奖励；管理员维度统计发布数/参与率/发放总量。
- **P2-2 任务推荐**：基于身份与历史参与推荐任务（如散修优先修行类）。
- **P2-3 勋章 / 成就**：连续签到 N 天、完成 N 个任务解锁勋章，展示于个人主页。
- **P2-4 签到连击（streak）与月度日历视图**。
- **P2-5 任务模板**：管理员可保存常用任务模板，快速发布。

### 3.2 UI 设计稿（文字描述）

**① 任务大厅页 `/tasks`**（新增路由，Navbar 增加「修行任务」入口）
- 顶部筛选条：奖励类型（全部/阳德/积分）、状态（全部/进行中/已结束）、身份可见（跟随当前身份自动过滤）。
- 卡片列表：标题、奖励徽标（如「阳德 +20」金标 / 「积分 +50」）、截止时间、已认领 X/名额、凭证类型图标；右侧「认领」按钮（已认领显示「去提交」、满额显示「已满额」、截止显示「已结束」）。
- 与现有路由关系：奖励为「积分」的任务卡片可加「去兑换中心」链接跳转 `/exchange`；「发帖类」任务可链到 `/forum` 引导发帖。

**② 我的任务 `/tasks/mine`**（任务大厅子路由或 Tab）
- 两个分区：「进行中」（claimed 待提交 / submitted 待审，显示状态 chip）与「已完成」（approved/completed，显示已得奖励）。
- 进行中卡片含「提交凭证」按钮 → 弹窗：图片上传（Storage）+ 文字说明 → 提交；已提交显示「审核中」与（若驳回）审核原因与「重新提交」入口。
- 完成后展示对应 `reward_ledger` 到账记录摘要。

**③ 后台「任务管理」Tab（位于 `/admin`）**
- 复用现有 `AdminPanel` 的 Tabs 模式，新增一个 Tab（置于「兑换项」附近），仅 `is_admin()` 可见。
- 三个区域：
  - **发布任务表单**：标题、描述、奖励类型与数量、凭证类型、身份可见范围（多选）、截止时间、名额；「保存草稿 / 发布」按钮。
  - **待审列表**：列出 `task_claims.status='submitted'`，展示用户、任务、凭证图片预览+文字、提交时间；每行「通过 / 拒绝」按钮，拒绝需填原因。
  - **已审记录**：历史审核流水（通过/拒绝、审核人、时间）。
- 与现有 `/admin` 关系：复用 `AdminRoute` 鉴权、`RewardPanel` 同级；发奖动作走与「奖励调整」一致的 RPC 路径。

**④ 签到入口**
- 形态待拍板（见 Open Questions）：建议**个人主页 `/profile` 常驻签到组件 + 首页 Hero 区下方签到卡**二选一或并存。
- 交互：点击「签到」→ 调用 RPC → 立即 +X 阳德 → Toast「今日签到 +X 阳德」；已签到当天按钮置灰显示「今日已签到」。
- 与现有路由关系：复用 `/profile` 与首页组件，不新增独立页（除非主理人决定独立 `/checkin`）。

### 3.3 数据模型建议（供架构师参考，非代码）

```
cultivation_tasks
  id BIGINT PK
  title TEXT
  description TEXT
  reward_kind TEXT CHECK IN ('yang_de','points')   -- 若需混合见 Open Questions
  reward_amount INT
  identity_scope TEXT[] NULL                        -- NULL=全可见；否则限定 customer/sanxiu/famai
  proof_type TEXT CHECK IN ('image','text','both')
  deadline TIMESTAMPTZ NULL
  max_claims INT NULL
  status TEXT CHECK IN ('draft','published','closed') DEFAULT 'draft'
  created_by UUID
  created_at / updated_at

task_claims
  id BIGINT PK
  task_id BIGINT FK -> cultivation_tasks
  user_id UUID FK -> auth.users
  status TEXT CHECK IN ('claimed','submitted','approved','rejected','completed')
  proof_text TEXT
  proof_image_url TEXT                              -- Supabase Storage
  submitted_at TIMESTAMPTZ NULL
  reviewed_at TIMESTAMPTZ NULL
  reviewer_id UUID NULL
  review_note TEXT NULL
  created_at
  UNIQUE(task_id, user_id)                           -- 每用户每任务一次有效认领

checkin_logs
  id BIGINT PK
  user_id UUID FK -> auth.users
  checkin_date DATE
  created_at
  UNIQUE(user_id, checkin_date)                      -- 每用户每日一次
```
- 奖励发放统一调用一期已有的 `apply_reward_change(p_user_id, p_kind, p_delta, p_reason, p_operator_id)`，由新增公开 RPC（如 `claim_task_reward` / `daily_checkin` / `grant_post_merit`）包装并写入 `reward_ledger`。
- `reward_ledger.reason` 约定：`任务奖励:<task_id>` / `每日签到` / `发帖得功德` / `结缘得功德`；系统自动类 `operator_id = NULL`。

### 3.4 Open Questions（待主理人 / 站长拍板）

1. **签到入口形态**：独立页 `/checkin`、首页弹窗，还是个人主页常驻组件？影响路由与组件设计（PR1 默认建议：个人主页常驻 + 首页签到卡）。
2. **发帖得功德是否算「任务」**：建议归为自动功德规则（不进任务大厅），但需确认：发帖奖励是否与「发帖任务」互斥？是否设每日/每次上限防刷？
3. **凭证审核驳回后能否重交**：驳回是允许用户修改凭证再次提交（status 回 `submitted`），还是直接结束该任务参与（status=`rejected` 终态）？影响 `task_claims` 状态机。
4. **奖励是否支持阳德 + 积分混合发放**：当前 `reward_kind` 为单值；若需混合，需改为 `reward_yang_de` + `reward_points` 两列。`cultivation_tasks` 表结构需据此定稿。
5. **任务是否限定身份可见**：`identity_scope` 为空是「全可见」还是「默认仅散修/法脉」？顾客能否参与修行类任务？需明确各身份的任务边界。

> 附：「结缘 / 分享得功德」中的「结缘」具体指代（加好友？分享商品？分享帖子？）亦需在 Q2/Q5 讨论中一并明确事件边界。
