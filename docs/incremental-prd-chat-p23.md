# 明道阁 · 论坛/晒图「私聊」按钮（P2-3 / 原 CHAT-12）专项增量 PRD

> 文档状态：增量需求（在已上线私聊系统上开发）
> 作者：产品经理 许清楚（Xu）
> 适用范围：论坛帖 / 帖子详情 / 评论 / 晒图 作者处「一键私聊」
> 关联文档：`docs/incremental-prd-chat.md`（私聊系统 PRD）、`docs/incremental-design-chat.md`（私聊架构设计，原 CHAT-12 即本次范围）
> 一句话定位：本 P2-3 就是原架构设计中「CHAT-12（用户间发起入口 + 三表加 guest_id）」的正式落地排期，方案 B（推迟）已撤销、本次实现。

---

## 0. 边界声明（全员必读）

- **复用现有 `chat_messages` 私聊系统，不重写聊天逻辑。** 本次只做：① 三表补 `guest_id` 字段并落库；② 在作者处暴露「私聊」入口；③ 点击后复用 `ChatProvider.openConversation` 自动建会话并跳 `/chat`。`ChatView`、Realtime、`getConversationId`、后台客服 Tab 一律复用。
- **游客身份 = 前端 localStorage 持久化的 `guest_id` + 昵称，跨设备/清缓存不同步（用户已知晓并接受）。** 不引入任何登录体系（无注册/密码/OAuth/匿名登录）。
- 论坛/评论/晒图的昵称目前是**每帖自由文本**，与聊天身份**解耦**——这是本次需决策的关键点（见第 7 节 Q3）。
- 本 PRD 只做产品分析，不含实现代码。

---

## 1. 产品目标（一句话）

让游客能**一键**与论坛帖、评论、晒图的作者发起私聊（携带作者 `guest_id` 自动建会话），免去手动复制粘贴 `guest_id`，提升同好互动与交易转化——全程复用已上线的私聊基础设施。

---

## 2. 背景与现状（关键事实，供架构师对齐）

| 项 | 现状 |
|---|---|
| 三表字段 | `forum_posts`（`author`）、`forum_comments`（`author`）、`reviews`（`nickname`）——**均只有自由文本昵称，无 `guest_id`** |
| 私聊核心 | `ChatProvider.openConversation(peerId, peerName)`；`getConversationId(a,b)=[a,b].sort().join('__')` 确定性派生；`ADMIN_GUEST_ID='admin'` |
| 现有入口模式 | 导航「联系客服」：`openConversation(ADMIN_GUEST_ID, ADMIN_NAME); navigate('/chat')`（`Navbar.tsx`） |
| 昵称前置 | `ChatPage` 渲染 `<NicknameDialog open={needsNickname} onClose={()=>{}} />`，无昵称时阻塞 |
| 昵称解耦 | 论坛/评论/晒图用各自表单的自由文本昵称，**未读聊天身份**；`getGuest()` 仅聊天侧持久化 |
| 历史数据 | 既有帖/评论/晒图无 `guest_id`，无法还原真实身份 |

---

## 3. 用户故事

1. **作为游客，我希望**在论坛帖子卡片/详情里点作者旁的「私聊」，**以便**直接给帖主发消息、就同好话题私下交流（用户↔用户）。
2. **作为游客，我希望**在评论区点评论者旁的「私聊」，**以便**就某条评论追聊、交换心得。
3. **作为游客，我希望**在晒图卡片点作者旁的「私聊」，**以便**咨询手串搭配/求购买链接。
4. **作为被私聊的作者（含客服），我希望**收到消息并能回复，**以便**维系同好关系、促成交易（复用现有 `ChatView` 与前台/后台会话）。
5. **作为游客，浏览历史老内容（无 `guest_id`）时，我希望**「私聊」按钮要么不出现、要么提示「该用户暂不支持私聊」，**以免**点到无效入口。

---

## 4. 需求池（按优先级）

> 优先级：P0 = 本次必须上线；P1 = 紧随补强；P2 = 体验增强。每条含：编号 / 功能 / 说明 / 验收标准（AC）。

### P0 核心

**P0-1 三表 ALTER ADD `guest_id`（可空 TEXT）**
- 说明：`forum_posts`、`forum_comments`、`reviews` 各加一列 `guest_id TEXT`（默认 NULL，兼容既有数据）。建议加索引（见第 6 节 SQL）。三表现有 RLS 为开放（`USING(true)`），加可空列无需改 RLS。
- AC：
  1. 三表均成功新增 `guest_id` 列；
  2. 既有行 `guest_id` 为 NULL（不报错）；
  3. 新发布行能写入非空 `guest_id`。

**P0-2 发帖 / 评论 / 晒图落 `guest_id`**
- 说明：发布前**确保聊天身份**（`ensureGuestId()` 确保 `guest_id`，且昵称已填；缺失则弹 `NicknameDialog` 前置校验，类比私聊）。以当前 `guest_id` 写入对应表。展示昵称的处理见待确认 Q3（推荐：保留发布时填写的昵称作展示，仅附加 `guest_id`）。
- AC：
  1. 新帖/新评论/新晒图行含非空 `guest_id`（= 当前游客身份）；
  2. 未设昵称时阻止发布并引导先设昵称；
  3. 发布后数据刷新，他人可见该内容且作者带 `guest_id`。

**P0-3 四处加「私聊」按钮**
- 说明：在以下作者处加「私聊」图标按钮（复用 MUI `ChatIcon`/`SmsIcon` 风格，金色 `#c9a96e`）：
  - 论坛帖卡片（`ForumPage` 底部信息行，作者旁）；
  - 帖子详情（`PostDetailDialog` 作者行）；
  - 评论项（`PostDetailDialog` 每条评论作者旁）；
  - 晒图卡片（`ReviewSection` 昵称行旁）。
- AC：上述四处均在作者附近出现「私聊」按钮；按钮可点击并触发起聊。

**P0-4 点击自动建会话并打开 `ChatView`**
- 说明：点击 → 复用 `ChatProvider.openConversation(authorGuestId, authorNickname)`（自动 `conversation_id = getConversationId(myId, authorGuestId)`）→ 跳 `/chat`。打开后聚焦输入框，对方昵称正确显示。打开方式二选一，见待确认 Q1（推荐 URL 参数方案）。
- AC：
  1. 点击后跳转 `/chat` 并打开与作者的会话；
  2. 会话确定性（双方互点落入同一会话）；
  3. 对方昵称显示为作者昵称。

**P0-5 旧内容（无 `guest_id`）按钮降级**
- 说明：行 `guest_id` 为 NULL/空时，「私聊」按钮**隐藏**，或显示为**禁用态**并 tooltip「该用户暂不支持私聊」。点击不产生任何会话。
- AC：
  1. 历史老内容不出现可用「私聊」按钮（隐藏或禁用）；
  2. 禁用态 hover 提示文案正确；
  3. 点击降级按钮不建会话、不报错。

**P0-6 未配置 Supabase 降级**
- 说明：`isSupabaseConfigured=false` 时，「私聊」按钮仍可点击；跳 `/chat` 后走现有本地降级（NicknameDialog + `localStorage` 本机消息，不实时）。不崩溃。
- AC：未配置云端时点击私聊不报错，进入 `/chat` 显示「未连接云端」提示并退化为本机自娱。

### P1 增强

**P1-1 「作者是自己」时隐藏按钮**
- 说明：`myId === 行.guest_id` 时不渲染「私聊」按钮（不能和自己聊）。`myId` 取自 `useChat().guest.guest_id`。
- AC：浏览自己发的帖/评论/晒图时无「私聊」入口；他人内容正常显示。

**P1-2 未读角标联动**
- 说明：点击私聊打开会话后，触发 `openConversation`→`markRead`，该会话未读清零；导航栏角标复用现有 `unreadTotal`（`Navbar`），无需新逻辑。
- AC：打开会话后该会话未读清零，导航「私聊」角标实时更新。

### P2 体验增强

**P2-1 悬停 tooltip 显示作者昵称**
- 说明：按钮 hover 显示「与 {nickname} 私聊」（`Tooltip`）。
- AC：hover 出现作者昵称提示。

**P2-2 私聊前置昵称校验**
- 说明：若自己尚未设昵称，点「私聊」先弹 `NicknameDialog`，设完后再自动打开与作者的会话（pending peer 流转，见 Q2）。
- AC：无昵称用户点私聊先被引导设昵称；设完后自动进入对应会话。

---

## 5. UI / 交互要点

### 5.1 按钮位置
| 位置 | 文件 | 落点 |
|---|---|---|
| 论坛帖卡片 | `ForumPage` | 底部信息行（`PersonIcon` 作者旁，与点赞并列） |
| 帖子详情作者 | `PostDetailDialog` | 顶部作者行（`post.author` 旁） |
| 评论项 | `PostDetailDialog` | 每条评论作者行（`comment.author` 旁） |
| 晒图卡片 | `ReviewSection` | 昵称行（`review.nickname` 旁） |

按钮样式：小号 `IconButton` + 文字「私聊」，金色 `#c9a96e`，hover 加深；遵循现有深色金主色系。

### 5.2 点击行为（两种方案，推荐 B）
- **方案 A（贴合现有联系客服）**：调用方直接 `openConversation(authorGuestId, authorNickname); navigate('/chat')`。优点：与 `Navbar`「联系客服」同构；缺点：每个调用方需自行处理昵称前置（Q2）。
- **方案 B（推荐，URL 参数）**：`navigate('/chat?peer=guest_id&name= authorNickname')`；`ChatPage` 挂载读参 → 若已设昵称则 `openConversation` 并清参；若未设昵称则 `NicknameDialog` 阻塞，设完后由 `useEffect` 监听 `guest` 变化自动打开 pending 会话。优点：可深链、昵称前置集中在一处、与现有 `ChatPage` 职责一致。

### 5.3 旧内容降级文案
- 隐藏模式：直接不渲染按钮。
- 禁用+tooltip 模式：按钮置灰，hover「该用户暂不支持私聊」。

### 5.4 昵称前置校验流程（P0-2 / P2-2）
发布时：读 `getGuest()` → 无 `guest_id` 则 `ensureGuestId()`；无昵称则弹 `NicknameDialog`（建议预填发布表单所填昵称，见 Q3）→ 确认后写 `guest_id` + 展示昵称。点击私聊时（方案 B）：无昵称则 `ChatPage` 先弹 `NicknameDialog`，设完后自动开 pending 会话。

---

## 6. 数据模型变更

### 6.1 前端类型（`src/types.ts`）
- `ForumPost` 增 `guest_id?: string`
- `ForumComment`（`CommentContext.tsx` 内）增 `guest_id?: string`
- `Review` 增 `guest_id?: string`
- 三处 `mapDbToX` 增加 `guest_id` 映射；`addPost`/`addComment`/`addReview` 入参增 `guest_id`。

### 6.2 SQL 思路（Supabase SQL Editor 执行）
```sql
-- 论坛帖
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_forum_posts_guest_id ON forum_posts(guest_id);

-- 论坛评论
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_forum_comments_guest_id ON forum_comments(guest_id);

-- 晒图
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS guest_id TEXT;
CREATE INDEX IF NOT EXISTS idx_reviews_guest_id ON reviews(guest_id);
```
> 索引为可选（P2-3 不按 guest_id 反查这三表，仅随行读取）；开放 RLS 表加可空列无需改策略。

### 6.3 历史数据回填策略（建议：不回填）
既有行 `guest_id` 恒为 NULL，**不跑回填脚本**——历史内容无身份关联，无法还原真实 `guest_id`；即使分配合成 id 也无人持有，私聊不可达（见 Q4）。老内容走 P0-5 降级。

---

## 7. 待确认问题清单 / 技术权衡（转交架构师 / 用户决策）

- **Q1 打开方式**：方案 A（`openConversation`+`navigate`）vs 方案 B（URL 参数，推荐）。影响昵称前置代码落点。
- **Q2 pending 流转**：无昵称用户点私聊后的衔接——`ChatPage` 当前 `NicknameDialog onClose` 为 no-op，需改为「设昵称后若 URL 带 pending peer 则自动 `openConversation`」。
- **Q3 昵称与身份是否统一**：(a) 保留自由文本昵称作展示、仅附加 `guest_id`（最小改动，推荐）；(b) 强制作者昵称=聊天昵称（统一身份，但改变既有「每帖独立昵称」行为，且历史昵称与身份不一致）。另：发布时若无聊天身份，是否用表单所填昵称预填 `NicknameDialog`（推荐）。
- **Q4 历史回填**：确认不回填（推荐），老数据 `guest_id=NULL` 走降级。
- **Q5 匿名发布是否保留**：P2-3 要求发布必须落 `guest_id`（=当前身份），即论坛/评论/晒图不再允许「纯匿名无身份」发布。是否接受该行为变更，或保留「匿名展示」但后台仍落已设 `guest_id`。
- **Q6 交互形态**：本次「私聊」采用整页跳 `/chat`（与现有私聊一致，推荐），还是要求原地开抽屉/弹窗（需额外 UI，超出 P0 范围）。

---

## 8. 验收总览（非功能）

- **复用性**：零改动 `chat_messages` 表、`ChatView`、Realtime、`getConversationId`、后台客服 Tab。
- **兼容性**：未配置 Supabase 时不崩溃，私聊降级本机（同 P0-6）。
- **一致性**：会话确定性（双方互点同一会话）；按钮在「自己内容」「无 guest_id 老内容」正确降级。
- **安全**：沿用应用层只查本人会话铁律；`guest_id` 为 UUID，无法被枚举拼出他人会话。

---

_附录：现状参考文件_
- 私聊核心：`src/context/ChatContext.tsx`、`src/components/ChatView.tsx`、`src/components/ChatPage.tsx`、`src/components/NicknameDialog.tsx`
- 身份：`src/lib/guestIdentity.ts`、`src/lib/chatConstants.ts`
- 内容源：`src/context/ForumContext.tsx`、`src/context/CommentContext.tsx`、`src/context/ReviewContext.tsx`、`src/components/ForumPage.tsx`、`src/components/PostDetailDialog.tsx`、`src/components/ReviewSection.tsx`、`src/components/ReviewForm.tsx`、`src/components/Navbar.tsx`
