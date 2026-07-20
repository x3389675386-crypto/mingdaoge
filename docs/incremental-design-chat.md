# 明道阁私聊系统 · 增量架构设计（设计文档）

> 作者：架构师 高见远（Gao）
> 适用范围：游客↔游客、游客↔客服 私聊（无登录体系）
> 关联文档：`docs/incremental-prd-chat.md`（PRD）、`docs/incremental-design-chat.md`（本文件）
> 状态：设计已定稿，待转交工程实现

---

## 1. 实现方案 + 框架选型

- **技术栈**：沿用现有 Vite 6 + React 19 + TS + MUI 6 + Tailwind v4；后端 **Supabase（PostgreSQL + Storage + Realtime）**。
- **实时方案**：使用已安装的 `@supabase/supabase-js` 内置 Realtime（**无需任何新依赖**）。订阅 `chat_messages` 表的 `postgres_changes` `INSERT` 事件，前端按当前 `guest_id` 过滤后并入本地状态。
- **身份方案**：**不引入登录**。游客身份 = `localStorage` 持久化的随机 `guest_id`（首次用 `crypto.randomUUID()` 生成）+ 昵称（首次弹窗填写，复用论坛 `containsProfanity`）。换设备/清缓存即新身份，用户已知晓并接受。
- **客服身份**：固定常量 `ADMIN_GUEST_ID = 'admin'`，昵称「明道阁客服」，后台 `/admin` 以此身份收发。
- **会话模型（关键选型）**：**只用 `chat_messages` 单表，不建 `conversations` 表**。`conversation_id` 由两个 `guest_id` 排序拼接（`[a,b].sort().join('__')`）**确定性生成**，任意一方发起都落入同一会话。会话列表由前端对消息按 `conversation_id` 分组派生（取最近一条消息 + 未读数）。理由：免维护第二张表及其 RLS/写入，Realtime 只需监听一张表，符合 PRD「可从 messages 派生则省略」。

---

## 2. 关键架构决策（PRD 第 6 节拍板结论）

### 2.1 RLS 权衡 → 选定【方案 A：应用层管控 + 开放 RLS】

**结论**：`chat_messages` 表 RLS 设为 `FOR ALL USING (true) WITH CHECK (true)`（开放读写）。安全性由**应用层只 `SELECT` 当前 `guest_id` 作为 sender 或 receiver 的行**保证，绝不展示/查询他人会话。

**为何不用方案 B（RPC/自定义 claim）**：
1. 游客无 Supabase Auth，`auth.uid()` 恒为 `null`，任何自定义 JWT claim 都需引入登录或 Supabase 匿名登录——与硬约束「不引入登录」冲突。
2. 现有 `forum_posts`/`forum_comments` 已是 anon key 直写 + `USING(true)` 开放策略，本系统与之同等级，保持一致降低运维认知负担。
3. RPC/策略函数开发、测试、维护成本显著高于「前端过滤 + 冗余昵称存储」的轻量方案。
4. **泄露面评估**：游客昵称本非敏感信息（论坛已公开），且无法枚举他人 `guest_id`（UUID）来拼出 `conversation_id`，实际被非授权读取的概率极低。仍须在文档与代码注释中明示「数据库层非强隔离」。

**RLS 策略 SQL**（见第 3 节 `supabase/migrations/chat.sql`）：开放 `SELECT/INSERT/UPDATE`（`UPDATE` 仅用于已读标记 `is_read`）；不开放 `DELETE`（私聊无删消息需求）。

### 2.2 客服固定身份
`ADMIN_GUEST_ID = 'admin'` 作为常量，定义于 `src/lib/chatConstants.ts`，后台 `/admin` 自动以此身份收发客服消息；不与现有 `messages`（联系留言）表混用（那是公开留言板，语义不同）。

### 2.3 用户间发起私聊入口
- **P0**：提供「输入对方昵称/guest_id 新建会话」兜底（ChatPage 顶部「新建会话」输入）。**【已拍板·方案 B】** 首版即采用此兜底路径。
- **P2-3（本次不实现）**：在论坛帖、晒图、评论处加「私聊」按钮，携带对方 `guest_id`；**前置依赖**：`forum_posts`/`forum_comments`/`reviews` 三表需新增 `guest_id` 字段并落库（当前仅存昵称）。该三表改造属库表变更、涉及既有数据回填，成本高、影响面大，**产品经理已拍板不纳入本次增量**（PRD 第 6.3 节标注「已拍板：方案 B」）。CHAT-12 降为后续独立任务，不挂本增量关键路径、不阻塞 P0/P1 交付。

### 2.4 Realtime 订阅范围与断线补拉
- **订阅表**：`chat_messages`；**事件**：`INSERT`；**通道常量**：`CHAT_REALTIME_CHANNEL = 'chat_messages_changes'`。
- **过滤**：因 RLS 开放，前端订阅全表 INSERT，在 `on('postgres_changes')` 回调中按 `conversation_id` / `sender_id` / `receiver_id` 是否含当前 `guest_id` 过滤后并入状态（方案 A 既定）。
- **断线重连 + 补拉**：`@supabase/supabase-js` 客户端自动重连通道；额外在 ChatPage 挂载时执行初始 `SELECT`（拉历史），并在 `document visibilitychange → visible` 时重新 `SELECT` 当前会话，补拉断线期间遗漏消息。

### 2.5 未配置 Supabase 时的降级
`if (!isSupabaseConfigured)`：导航「私聊」入口与「联系客服」按钮**照常显示但进入 `/chat` 后给出「未连接云端，消息仅本机」灰色提示条**；ChatContext 退化为内存 + `localStorage` 缓存（同设备本次会话内可见，不崩溃、不实时）。

### 2.6 昵称重名区分
展示对方昵称时附**简短 `guest_id` 后缀**（取 UUID 末 4 位，如「匿名道友#a1b2」）+ 头像色块（由 `guest_id` 哈希到固定色）。自己消息与对方消息用左右气泡区分，色块前置。

---

## 3. SQL 迁移文件：`supabase/migrations/chat.sql`

```sql
-- =============================================
-- 明道阁私聊消息表 (chat_messages) 建表 + RLS
-- 在 Supabase SQL Editor 中执行
-- 说明：游客无 Auth 身份，采用应用层管控 + 开放 RLS（方案 A）
--       数据库层非强隔离，安全性依赖前端只查询本人 guest_id 相关行
-- =============================================

-- 1. 创建私聊消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id TEXT NOT NULL,                 -- 两 guest_id 排序拼接，确定性生成
  sender_id TEXT NOT NULL,                        -- 发送方 guest_id
  sender_name TEXT NOT NULL DEFAULT '匿名道友',   -- 发送方昵称（冗余，改昵称不影响历史）
  receiver_id TEXT NOT NULL,                      -- 接收方 guest_id
  receiver_name TEXT NOT NULL DEFAULT '匿名道友', -- 接收方昵称（冗余）
  content TEXT NOT NULL,                          -- 文本内容
  type TEXT NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'image')),            -- 消息类型
  image_url TEXT,                                 -- 图片消息 URL（base64 或 Storage）
  is_read BOOLEAN NOT NULL DEFAULT false,         -- 已读标记（P1-2）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);

-- 3. 启用 RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：开放读（应用层过滤本人会话）
CREATE POLICY "chat_messages_select_policy" ON chat_messages
  FOR SELECT USING (true);

-- 5. RLS 策略：开放写（游客无 Auth，WITH CHECK(true)）
CREATE POLICY "chat_messages_insert_policy" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- 6. RLS 策略：开放更新（仅用于 is_read 已读标记）
CREATE POLICY "chat_messages_update_policy" ON chat_messages
  FOR UPDATE USING (true) WITH CHECK (true);

-- 7. 将表加入 Realtime 发布（实时推送 INSERT）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
```

> 备注：若 `supabase_realtime` 发布不存在（极少数老项目），需先 `CREATE PUBLICATION supabase_realtime FOR ALL TABLES;`（按项目实际情况调整）。

---

## 4. 文件清单（相对路径 + 职责）

### 新增文件
| 路径 | 职责 |
|---|---|
| `src/lib/guestIdentity.ts` | 生成/读取 `localStorage` 的 `guest_id` + 昵称（`getGuest()`、`setNickname()`、`ensureGuest()`、`hasGuest()`）；key=`mingdao_guest`，结构 `{guest_id, nickname}` |
| `src/lib/chatConstants.ts` | 常量：`ADMIN_GUEST_ID='admin'`、`ADMIN_NAME='明道阁客服'`、`CHAT_REALTIME_CHANNEL='chat_messages_changes'`、`CHAT_STORAGE_KEY`；工具 `getConversationId(a,b)` |
| `src/context/ChatContext.tsx` | 私聊核心：会话列表（派生）、消息、发消息、Realtime 订阅、未读；暴露 `useChat()`（接口见第 5 节） |
| `src/components/ChatPage.tsx` | `/chat` 页：左侧会话列表 + 右侧对话窗口（移动端全屏切换）；顶部「新建会话」输入；降级提示条 |
| `src/components/NicknameDialog.tsx` | 首次填昵称 MUI `Dialog`；复用 `containsProfanity` 过滤 |
| `supabase/migrations/chat.sql` | 建表 + 索引 + 开放 RLS + Realtime 发布（第 3 节） |

### 修改文件
| 路径 | 改动 |
|---|---|
| `src/App.tsx` | ① 用 `<ChatProvider>` 包裹路由树（置于 `CartProvider` 内）；② `Routes` 新增 `<Route path="/chat" element={<ChatPage />} />` |
| `src/components/Navbar.tsx` | `navLinks` 增加「私聊」(`/chat` 路由)；右侧加「联系客服」按钮 → 直接打开与 `admin` 会话；导航入口挂未读角标（P1-1，复用 `useChat().unreadTotal`） |
| `src/components/admin/AdminPanel.tsx` | 新增「客服私信」Tab（复用 `Tabs`/`TabPanel`），内部渲染 `ChatPage` 的客服视图（以 `admin` 身份）；Tab 标签挂未读角标 |
| `src/components/admin/MessagePanel.tsx`（可选） | 保持现状，客服私信独立 Tab，不混用「客户留言」 |

> 图片上传逻辑（P2-1）复用 `ForumPage` 现有 Storage `images` 桶 + base64 兜底，抽到 `src/lib/chatImage.ts` 复用，避免重复。

---

## 5. 数据结构与接口

### 5.1 数据库表 `chat_messages`（字段）
见第 3 节 DDL。要点：`conversation_id` 确定性派生；`sender/receiver` 昵称冗余存储；`is_read` 供 P1-2；`type`/`image_url` 供 P2-1。

### 5.2 前端类型（建议加 `src/types.ts`）
```ts
export interface ChatMessage {
  id: number;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  type: 'text' | 'image';
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}
export interface ChatConversation {
  conversationId: string;
  peerId: string;
  peerName: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}
```

### 5.3 `useChat()` Context 接口（方法签名）
```ts
interface ChatContextValue {
  guest: { guest_id: string; nickname: string } | null;
  conversations: ChatConversation[];        // 当前 guest 参与的会话（派生）
  messages: ChatMessage[];                   // 当前打开会话的消息
  loading: boolean;
  unreadTotal: number;                       // 导航角标用（P1-1）
  activeConversationId: string | null;
  ensureIdentity: () => boolean;             // 无昵称返回 false（触发 NicknameDialog）
  getConversations: () => Promise<void>;     // 拉取/派生会话列表
  openConversation: (peerId: string, peerName: string) => Promise<void>; // 打开/新建会话并拉历史
  getMessages: (convId: string) => Promise<void>;
  sendMessage: (peerId: string, peerName: string, content: string, type?: 'text' | 'image', imageUrl?: string) => Promise<void>;
  subscribeRealtime: () => () => void;       // 订阅，返回取消订阅函数
  markRead: (convId: string) => Promise<void>;
  setNickname: (name: string) => void;       // P1-3
}
```

---

## 6. 程序调用流程

### ① 游客首次填昵称
进入 `/chat` → `ChatPage` 调 `useChat().guest`，若为 `null` → 渲染 `NicknameDialog` → 用户填写（含违规过滤）→ `setNickname()` 写 `localStorage`（`mingdao_guest`）。之后不再弹窗。

### ② 发送消息时序（写 messages + Realtime 推送）
用户输入 → `sendMessage(peerId, peerName, content)` → 计算 `conversation_id = getConversationId(myId, peerId)` → `supabase.from('chat_messages').insert({conversation_id, sender_id:myId, sender_name:myName, receiver_id:peerId, receiver_name:peerName, content, type})` → 本地乐观上屏（插入 `messages` state，不等回包）→ Supabase 广播 `INSERT` → 对方 Realtime 收到。

### ③ 接收端 Realtime 刷新
`subscribeRealtime()` 在 `ChatProvider` 挂载时建立 → `supabase.channel(CHAT_REALTIME_CHANNEL).on('postgres_changes', {event:'INSERT', schema:'public', table:'chat_messages'}, cb)` → `cb` 中判断新行 `sender_id/receiver_id` 是否含 `myId` → 是则并入 `messages`（若当前会话命中）并更新 `conversations` 置顶、未读 +1。延迟目标 <1s。

### ④ 后台客服回复时序
`/admin` 客服 Tab 以 `ADMIN_GUEST_ID='admin'` 身份调用同一 `useChat()`（Provider 内 `guest` 被强制设为 admin 常量）→ 看到所有 `receiver_id='admin' OR sender_id='admin'` 的会话 → 回复 `sendMessage(userGuestId, userName, content)`，`receiver_id=userGuestId` → 用户端 Realtime 收到。

### ⑤ 降级路径（未配置 Supabase）
`isSupabaseConfigured===false` → `getConversations/sendMessage` 改走 `localStorage` 内存缓存；`subscribeRealtime` 直接返回空函数（无订阅）；UI 显示灰色「未连接云端」提示条；不实时、不崩溃。

---

## 7. 任务列表（有序 + 依赖 + PRD 编号）

| # | 任务 | 依赖 | PRD |
|---|---|---|---|
| CHAT-01 | 编写并执行 `supabase/migrations/chat.sql`（建表+RLS+发布） | 无 | 6.1 |
| CHAT-02 | 新增 `src/lib/guestIdentity.ts` | 无 | P0-1 |
| CHAT-03 | 新增 `src/lib/chatConstants.ts` | 无 | P0-6/6.2 |
| CHAT-04 | 新增 `src/context/ChatContext.tsx`（含 Realtime、派生会话、降级） | CHAT-01(云端),02,03 | P0-2/3/4 |
| CHAT-05 | 新增 `src/components/NicknameDialog.tsx` | CHAT-02 | P0-1 |
| CHAT-06 | 新增 `src/components/ChatPage.tsx`（会话列表+对话窗+新建兜底） | CHAT-04,05 | P0-2/3/5 |
| CHAT-07 | 修改 `src/App.tsx`（加 `/chat` 路由 + `ChatProvider` 包裹） | CHAT-04 | P0-2 |
| CHAT-08 | 修改 `src/components/Navbar.tsx`（私聊入口+联系客服+角标） | CHAT-07 | P0-6/P1-1 |
| CHAT-09 | 修改 `src/components/admin/AdminPanel.tsx`（客服 Tab，admin 身份） | CHAT-03,04 | P0-7 |
| CHAT-10 | `src/types.ts` 增 ChatMessage/ChatConversation 类型 | 无 | — |
| CHAT-11 | 图片/表情消息：抽 `src/lib/chatImage.ts` + ChatPage 集成 | CHAT-04,06 | P2-1 |
| CHAT-12 | **【本次不实现·后续独立任务】** 论坛/晒图「私聊」按钮；其前置「三表加 `guest_id` 字段迁移 + 落库」已由产品拍板方案 B 不纳入本次，故 CHAT-12 不挂本增量关键路径，不阻塞 P0/P1 | —（独立后续） | P2-3 |
| CHAT-13 | 未读角标接入导航 + 已读标记 `markRead` 集成 | CHAT-04,08 | P1-1/2 |
| CHAT-14 | 昵称修改入口（P1-3） | CHAT-02,04 | P1-3 |

> 实现顺序遵循：CHAT-01/02/03/10（地基）→ CHAT-04（核心）→ CHAT-05/06 → CHAT-07/08 → CHAT-09 → P1/P2 增强（CHAT-11/13/14）。**CHAT-12 及其三表字段改造移出本次，列为后续独立增量。**

---

## 8. 依赖包

- **无新增依赖**。复用现有 `@supabase/supabase-js`（Realtime 内置）、MUI 6、`react-router-dom`、`crypto.randomUUID()`（浏览器原生）。
- 图片上传复用 Storage `images` 桶 + `FileReader` base64 兜底（同 `ForumPage`）。

---

## 9. 共享知识（跨文件约定）

- **`guest_id` 生成规则**：`crypto.randomUUID()`，存 `localStorage['mingdao_guest'] = {guest_id, nickname}`；首次缺失则视为新游客。
- **`ADMIN_GUEST_ID` 常量位置**：`src/lib/chatConstants.ts` 导出 `'admin'`；全项目禁止硬编码 `'admin'`，统一引用。
- **`getConversationId(a,b)`**：`[a,b].sort().join('__')`，位于 `chatConstants.ts`，前后台共用，保证会话确定性。
- **Realtime 通道名**：`CHAT_REALTIME_CHANNEL='chat_messages_changes'`，位于 `chatConstants.ts`。
- **降级判断函数**：统一用 `src/lib/supabase.ts` 的 `isSupabaseConfigured`，各层先判后分支。
- **昵称过滤**：复用 `src/utils/profanityFilter.ts` 的 `containsProfanity`。
- **应用层隔离铁律**：任何 `SELECT` 必须带 `sender_id` 或 `receiver_id` = 当前 `guest_id` 过滤，不得查询全表展示。

---

## 10. 待明确事项（转回产品或用户）

> 注：原「待明确 1（P2-3 三表加 guest_id）」已由产品经理拍板方案 B 不纳入本次，详见第 2.3 节。

1. **消息持久上限**：历史消息是否分页（建议最近 200 条），超量清理策略是否需后台定时任务？
2. **客服身份区分**：「系统客服」与「真实店主」是否需要区分昵称/头像？当前统一为「明道阁客服」。
3. **降级模式持久化**：未配置 Supabase 时是否允许 `localStorage` 长期留存本机消息（跨刷新可见），还是仅内存会话级？当前设计选「localStorage 留存本机」。
4. **删除消息**：PRD 无删消息需求，RLS 未开 `DELETE`；若后续需要，需补充策略与确认权限。

---

_设计人：高见远（Gao）｜ 仅做设计，不含实现代码。_
