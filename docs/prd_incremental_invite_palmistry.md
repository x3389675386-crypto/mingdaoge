# 明道阁 · 增量 PRD（邀请注册 + 论坛看手相 + 两处 UI 缺陷修复）

> 文档类型：增量 PRD（在现有 `profiles` / `reward_ledger` / `announcements` / `forum` 体系上扩展）
> 语言：简体中文
> 技术栈：Vite 6 + React 19 + TypeScript + MUI 6 + Tailwind CSS v4 + Supabase（Auth + PostgreSQL + Storage + Realtime）
> 项目目录：`bracelet-shop/`
> 关联既有资产：
> - `040_announcements.sql`：公告表（id / tag / title / content / active / sort_order）
> - `020_profiles_identity_reward.sql`：profiles 含 `user_code`（唯一，格式 `MDG-XXXXX`）、`yang_de`、`points`
> - `024_reward_rpc.sql`：`apply_reward_change(p_user_id, p_kind, p_delta, p_reason, p_operator_id)` 原子改余额 + 写流水（所有积分/阳德变动必须经此 RPC，前端不直改 `profiles`）

---

## 一、产品目标（一句话）

在不破坏"双账户 + RPC 写账"既有原则的前提下，修复两处全站可见性缺陷，并上线「邀请注册得积分」与「论坛看手相领积分」两套可由后台配置的拉新 / 促活机制。

---

## 二、缺陷根因分析（供开发定位，非需求本身）

**缺陷 A —— `/tasks` 标题被固定导航栏压住（电脑端 + 手机端）**
- `Navbar` 使用 `<AppBar position="fixed">`，脱离文档流、不占高度。
- `TaskHall` 在 `<Navbar />` 之后仅用 `py: 6`（= 48px）顶部留白，不足以抵消固定导航栏高度（约 56–64px），故「修行任务大厅」标题被压在导航栏下。
- 同类隐患存在于其它路由页（如 `/forum`、`/exchange` 等仅靠自身顶部留白的页面）。

**缺陷 B —— 公告栏全站不可见（电脑端 + 手机端）**
- 挂载位置错误：`<AnnouncementBar />` 当前仅渲染于 `FrontPage`（首页），并非全站。
- 层叠遮挡：Navbar 固定且 `z-index` 高（`theme.zIndex.appBar = 1100`），公告栏为普通流 `<Box>` 紧接其后渲染于视口顶部 `y=0`，被固定 Navbar 完全覆盖 → 首页也看不到。
- 此前 `localStorage → sessionStorage` 的「不再显示」修复只解决持久化，未解决遮挡；数据读取（Supabase `announcements` 表 + 静态兜底）本身正常。

> 两处缺陷本质同源：**固定导航栏未给下方内容预留顶部偏移，且公告栏未纳入全站固定头**。建议在全局统一处理（见需求池 P0-1 / P0-2）。

---

## 三、用户故事（按功能拆分）

**A. UI 缺陷修复**
1. 作为访客，我希望打开「任务大厅」时标题完整可见，而不是被顶部导航栏遮住，以便正常浏览与操作。
2. 作为访客，我希望无论身处首页还是论坛 / 兑换等任意页面，顶部都能看到滚动公告，以便及时获取活动与公约信息。

**B. 邀请注册（P0）**
3. 作为老用户，我希望拥有专属邀请码 / 邀请链接，以便分享给朋友并赚取积分奖励。
4. 作为被邀请人，我通过他人邀请链接注册后，我的引路人能自动获得积分，而我无需额外操作。
5. 作为管理员，我希望在后台配置「每成功邀请 1 人奖励多少积分」，以便灵活调整拉新激励力度。

**C. 论坛看手相领积分（P0 / P1）**
6. 作为登录用户，我希望在论坛参与「看手相」活动即可领取积分，且有明确的领取次数提示，以便获得参与反馈。
7. 作为管理员，我希望在后台设置「单次奖励积分」与「每人每日限领次数」，以便控制成本并防止刷分。

---

## 四、需求池

优先级说明：**P0 = 必须做（本迭代）｜P1 = 建议做（本迭代或紧接）｜P2 = 可选做（后续）**。

### P0（必须做）

**P0-1 全站固定顶栏统一（修复缺陷 A + B 的层叠根因）**
- 将 `AnnouncementBar` 从 `FrontPage` 移至 `App` 根层、置于 `<Routes>` 之上，使公告栏全站可见（满足"全站顶部公告栏"诉求）。
- 将「公告栏 + Navbar」整合为统一的顶部固定区（建议：公告栏在上、Navbar 在下，整体 `position: fixed` 或二者共享固定头）。
- 所有路由页内容必须预留顶部偏移 = 公告栏高度 + Navbar 高度（公告显示时）；建议抽一个全局布局令牌（如 `TopOffset`），各页 `pt` 引用之，`/tasks` 等页删除硬编码不足的 `py`。
- 验收：电脑端（≥1280px）与移动端（≤375px）下，任务大厅标题完整不被遮挡；首页与论坛页顶部公告可见且不被导航栏覆盖；公告关闭后内容自动上移、无空洞。

**P0-2 公告栏可见性兜底（修复缺陷 B 的挂载根因）**
- 移除"仅首页挂载"限制，公告栏在全部路由生效。
- 保留既有 `sessionStorage`「不再显示」逻辑与静态数据兜底（Supabase 未配置/拉取失败时回退）。
- 验收：后台 `announcements` 有 `active=true` 数据时，全站可见对应条数；多条可左右切换；单条「不再显示」仅当前会话隐藏。

**P0-3 邀请码与邀请链接（数据 + 前端展示）**
- 复用既有 `profiles.user_code`（`MDG-XXXXX`，唯一）作为邀请码，避免新增列与生成逻辑（若决定另立 `invite_code` 见待确认 Q1）。
- 邀请链接格式：`/register?invite=<user_code>`（大小写不敏感，后端按 `upper()` 解析，与 `resolve_guest_by_code` 一致）。
- 「个人中心 /profile」展示当前用户邀请码 + 一键复制邀请链接按钮。
- 验收：每个登录用户可见自己唯一邀请码；点击复制得到形如 `https://域名/register?invite=MDG-AB12C` 的链接。

**P0-4 邀请关系落库（inviter_id / invitee_id）**
- 新增 `invitations` 表（建议字段）：`id`、`inviter_id`（uuid，FK profiles.id）、`invitee_id`（uuid，FK profiles.id）、`invite_code`（text）、`reward_points`（int，发放时快照）、`reward_granted`（boolean，默认 false）、`created_at`。
- 唯一约束：同一 `invitee_id` 至多一条（一人只认首个邀请人）；`(inviter_id, invitee_id)` 唯一。
- 验收：被邀请人注册成功后，`invitations` 生成一条 `inviter_id / invitee_id` 记录，`reward_granted` 初始由发奖流程置 true。

**P0-5 邀请注册发奖（服务端，防篡改）**
- 扩展注册触发器（或新增触发器，复用 `handle_new_user` 的 `SECURITY DEFINER + SET search_path` 模式）：读取 `raw_user_meta_data->>'invite_code'`，按 `user_code` 解析邀请人；若合法且非自邀（inviter ≠ 新用户），调用 `apply_reward_change(inviter_id, 'points', <奖励值>, '邀请注册奖励', NULL)` 写入积分与流水，并写 `invitations`。
- 奖励值来自后台配置（见 P0-7）；非法 / 空 / 自邀邀请码**静默忽略**，不影响注册成功。
- 验收：被邀请人经有效链接注册 → 邀请人积分按配置增加、`reward_ledger` 有对应流水、`invitations.reward_granted=true`；无效码注册无任何发奖。

**P0-6 注册页携带邀请码**
- `Register` 页读取 URL `?invite=` 参数；扩展 `useAuth().signUp(...)` 将邀请码写入 `raw_user_meta_data.invite_code`（当前 `signUp` 仅写 nickname / identity，需加参）。
- 携带无效码时不影响注册流程（正常走完，仅不发奖）。
- 验收：带 `?invite=MDG-XXXX` 打开注册页并注册成功 → 触发 P0-5 发奖；不带参注册 → 不发奖。

**P0-7 邀请奖励后台可配置**
- 新增通用配置表 `site_settings`（`key` text PK，`value` int / jsonb），预置键 `invite_reward_points`（默认建议 50，单位：积分）。
- 后台新增「邀请设置」面板：输入奖励积分，保存即写 `site_settings`；发奖触发器实时读取。
- 验收：管理员改 `invite_reward_points` 并保存后，后续新邀请注册按新值发奖；非数字 / 负数被校验拦截。

**P0-8 论坛看手相领积分（领取 + 防刷 + 配置）**
- 论坛页提供「看手相」入口（按钮 / 活动卡片），点击即向 RPC 发起领取。
- 新增 `claim_palmistry_reward()` RPC（`SECURITY DEFINER`）：校验登录 → 校验当日已领次数 < 限额 → 调用 `apply_reward_change(auth.uid(), 'points', <单次奖励>, '看手相奖励', NULL)` → 写 `palmistry_claims` → 返回本次获得积分与剩余次数。
- 新增 `palmistry_claims` 表：`id`、`user_id`（uuid）、`claimed_at`（timestamptz）。
- 防刷主规则：**每人每日限领 N 次**（后台可配，默认建议 1）；服务端按"当日该用户行数"计数，前端仅展示，不可信任。
- 验收：登录用户当日首次点击得积分、`reward_ledger` 有流水；达当日上限后再点被拒并提示"今日已领完"；未登录点击引导登录；刷新 / 重进不重置当日计数。

**P0-9 看手相奖励后台可配置**
- `site_settings` 预置键：`palmistry_reward_points`（单次奖励，默认建议 10）、`palmistry_daily_limit`（每日限领次数 N，默认建议 1）。
- 后台新增「看手相奖励设置」面板：配置单次积分与每日上限，保存即写 `site_settings`；RPC 实时读取。
- 验收：管理员调高/调低两项后，用户领取按新规则生效；N≤0 视为关闭该功能并提示。

### P1（建议做）

**P1-1 邀请进度可视化**
- 「个人中心」展示：我的邀请人数、已发放奖励积分合计（来自 `invitations` 聚合）。
- 验收：数据与实际发奖一致。

**P1-2 看手相"按帖子限领一次"变体**
- 在 P0-8 每日限额之外，可选支持"对同一看手相帖子仅可领一次"（需 `palmistry_claims` 增加 `post_id` 与唯一约束）。
- 验收：同一帖子不可重复领取（若启用）。

**P1-3 公告栏管理与本次需求联动**
- 公告 `AnnouncementBar` 在修复后，支持在公告中插入邀请活动 / 看手相活动入口链接（复用现有 `tag/title/content` 字段，内容可含跳转）。
- 验收：点击公告可跳转到对应活动页。

### P2（可选做）

**P2-1 邀请裂变二级奖励**
- 被邀请人后续首单 / 首充，邀请人再得奖励（需定义触发事件，扩展性较强）。
- 验收：按既定事件二次发奖（如采纳）。

**P2-2 看手相内容沉淀**
- "看手相"作为论坛正式活动分类（如新增 `forum_categories` 项"看手相"），用户发手相帖参与，与积分领取解耦。
- 验收：活动帖可正常发布与展示。

**P2-3 防刷增强**
- 设备/IP 维度限频、风控阈值告警，应对批量小号刷分。
- 验收：异常频次被限流。

---

## 五、UI / UX 设计稿描述

### 页面 1：全站统一顶部固定头（修复后）
- 结构（自上而下）：
  1. **公告栏**（暗金风格，沿用现有 `AnnouncementBar` 视觉）：左侧切换箭头（多条时）、标签 Chip、居中正文、右侧「不再显示」×。高度约 46px。
  2. **Navbar**（现有导航）：Logo、导航链接、右侧操作区（客服 / 私聊 / 管理 / 头像 / 购物车）。高度约 56–64px。
- 二者合并为同一个 `position: fixed` 顶部容器，整站常驻；页面内容统一 `padding-top` = 公告栏 + Navbar 高度（公告隐藏时自动减高）。
- 移动端：公告栏文字缩小、箭头保留；Navbar 折叠为汉堡抽屉（现有逻辑不变）。

### 页面 2：任务大厅 `/tasks`（修复后）
- 顶部偏移修复后，标题「修行任务大厅」+ 副标题「结缘善缘，积功累德」完整显示于导航栏下方。
- 任务卡片网格（md 两列 / xs 一列）、认领按钮等布局不变，仅顶部不再被遮挡。

### 页面 3：个人中心 `/profile` —— 邀请码卡片（新增）
- 位置：身份信息区下方，新增「我的邀请」卡片。
- 内容：
  - 标题「邀请好友 · 同修善缘」
  - 邀请码：`MDG-XXXXX`（等宽字体、可点选复制）
  - 邀请链接：完整 URL +「复制链接」按钮（Toast 提示"已复制"）
  - （P1）我的邀请人数 / 已得奖励积分
- 交互：复制成功后 Snackbar 反馈；未登录不展示邀请区。

### 页面 4：注册页 `/register` —— 邀请码携带（新增）
- 顶部增加一行弱提示（仅当 URL 带 `?invite=` 且码合法时显示）：「你正通过 <昵称/用户> 的邀请加入明道阁 🎉」。
- 不新增输入框；邀请码随注册请求经 `raw_user_meta_data` 上报。
- 无效邀请码：不显示提示、不影响注册。

### 页面 5：论坛 `ForumPage` —— 看手相入口（新增）
- 论坛列表/顶部新增「看手相」活动入口（金色描边卡片或按钮，置于发帖入口旁）。
- 点击交互：
  - 未登录 → 跳 `/login` 并携带回跳。
  - 已登录且当日未达上限 → 调用 `claim_palmistry_reward()`，成功后 Toast：「看手相 +N 积分（今日剩 M 次）」。
  - 已达上限 → Toast：「今日看手相次数已用完，明日再来」。
- 入口常态可见；若后台将 `palmistry_daily_limit` 设为 0，则入口置灰提示"活动暂未开启"。

---

## 六、待确认问题（需用户拍板的需求歧义点）

1. **邀请码是否复用 `user_code`？** 建议直接复用 `MDG-XXXXX` 作邀请码（唯一、已有、零成本）；或另立更易传播的 `invite_code`（如短码）。请确认。
2. **邀请奖励用什么账户？** 建议仅奖励**积分（points）**；是否也需要给阳德（yang_de）？默认仅积分。
3. **邀请发奖时机/粒度？** 建议"被邀请人完成注册即一次性发奖"；是否扩展为"被邀请人首单/首充再发"（即 P2-1）？
4. **「看手相」的交互模型？** 方案 A（推荐，简单防刷）：论坛内「看手相」按钮，点击即领，按每日限额。方案 B：用户发布"手相帖/评论"才算参与再领。二者防刷与后台配置不同，请确认主模型。
5. **看手相防刷主规则？** 建议"每人每日限领 N 次"为主；是否需要叠加"每帖限领一次"（P1-2）？
6. **公告栏范围？** 需求描述为"全站顶部公告栏"，但现状仅首页。确认改为**全站常驻**（本 PRD 按全站设计）；或仍仅首页（则只需修遮挡，不移动挂载）。
7. **后台奖励配置存储方式？** 本 PRD 建议新增 `site_settings` 键值表统一承载 `invite_reward_points` / `palmistry_reward_points` / `palmistry_daily_limit`；是否接受新建该表，或倾向其它配置方案？
8. **邀请奖励默认值 & 看手相默认值？** 建议邀请 50 积分、看手相单次 10 积分、每日 1 次；请确认初始数值（上线后可后台改）。

---

### 附：与既有原则的约束对照（开发必须遵守）
- 所有 `points` / `yang_de` 变动**必须经 `apply_reward_change` RPC**，前端禁止直改 `profiles`。
- 发奖逻辑放在**服务端触发器 / RPC（`SECURITY DEFINER`）**，前端仅发起、不计算，防止篡改（尤其邀请自刷、看手相刷分）。
- 新增表 / RPC 需配套 RLS：`invitations`、`palmistry_claims` 仅本人可读自己的行；`site_settings` 仅管理员可写、公开可读配置项。
- 保持现有暗金 + 衬线（`var(--font-serif)` / `var(--font-calligraphy)`）视觉语言一致。
