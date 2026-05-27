# 明道阁手串电商网站 — Supabase 后端配置完整指南

> 按以下 4 步操作，完成后所有设备都能看到同一份数据

---

## 第一步：在 Supabase 创建数据库表

1. 打开 [supabase.com](https://supabase.com)，登录你的项目 `mingdaoge`
2. 左侧菜单点 **「SQL Editor」**（⚡ 图标）
3. 点 **「New query」**
4. **复制粘贴以下全部 SQL**，点 **「Run」** 执行：

```sql
-- ============================================
-- 明道阁 Supabase 完整建表 SQL
-- 一次性执行即可
-- ============================================

-- 1. 产品表
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  material TEXT DEFAULT '',
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gradient TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  diameter TEXT DEFAULT '10mm',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 留言表
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 晒图表
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 开启行级安全（RLS）
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 5. 产品表权限（所有人可读写）
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete products" ON products FOR DELETE USING (true);

-- 6. 留言表权限
CREATE POLICY "Public read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update messages" ON messages FOR UPDATE USING (true);
CREATE POLICY "Public delete messages" ON messages FOR DELETE USING (true);

-- 7. 晒图表权限
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update reviews" ON reviews FOR UPDATE USING (true);
CREATE POLICY "Public delete reviews" ON reviews FOR DELETE USING (true);
```

> ✅ 看到 "Success" 提示就表示建表完成

---

## 第二步：创建图片存储桶

1. 左侧菜单点 **「Storage」**
2. 点 **「New bucket」**
3. **Name** 填：`images`
4. 勾选 **「Public bucket」** ✅
5. 点 **「Create bucket」**

然后设置存储策略（让图片可以公开上传和访问）：

1. 点进刚创建的 `images` bucket
2. 点 **「Policies」** 标签
3. 点 **「New Policy」** → 选 **「For full customization」**
4. 依次创建以下 4 条策略（每条都单独 New Policy）：

**策略 1 — 读取：**
- Policy name: `Public select`
- Allowed operation: 只勾选 **SELECT** ✅
- Target roles: 留空
- WITH check expression: 留空
- 点 **Save**

**策略 2 — 上传：**
- Policy name: `Public insert`
- Allowed operation: 只勾选 **INSERT** ✅
- 其他留空
- 点 **Save**

**策略 3 — 更新：**
- Policy name: `Public update`
- Allowed operation: 只勾选 **UPDATE** ✅
- 其他留空
- 点 **Save**

**策略 4 — 删除：**
- Policy name: `Public delete`
- Allowed operation: 只勾选 **DELETE** ✅
- 其他留空
- 点 **Save**

> ✅ 最终 Policies 页面应该看到 4 条策略

---

## 第三步：在 Vercel 配置环境变量

> ⚠️ 这步很关键！`.env` 文件没推送到 GitHub，所以 Vercel 不知道 Supabase 的地址和密钥

1. 打开 [vercel.com](https://vercel.com)，进入你的 `mingdaoge` 项目
2. 点 **「Settings」** → **「Environment Variables」**
3. 添加以下 2 个变量：

**变量 1：**
| 字段 | 值 |
|------|------|
| Key | `VITE_SUPABASE_URL` |
| Value | `https://exhvhpgilclvlcasyuqy.supabase.co` |
| Environment | 勾选 Production / Preview / Development ✅ |

**变量 2：**
| 字段 | 值 |
|------|------|
| Key | `VITE_SUPABASE_ANON_KEY` |
| Value | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4aHZocGdpbGNsdmxjYXN5dXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDkzMTQsImV4cCI6MjA5NTQyNTMxNH0.jlkjLkFKH5nSZE24x_yeK6D7zqUaPpqaZCfRLMQU6JU` |
| Environment | 勾选 Production / Preview / Development ✅ |

4. 点 **「Save」**

5. **触发重新部署**（因为环境变量改了，需要重新构建）：
   - 点 **「Deployments」** 标签
   - 找到最近一次部署，点右侧 **⋯** → **「Redeploy」**
   - 点 **「Redeploy」** 确认

---

## 第四步：验证

等 Vercel 重新部署完成（约 1-2 分钟）后：

1. 打开 [mingdaoge.top](https://mingdaoge.top)
2. 应该能看到 8 款手串产品
3. 手机打开同一网址，应该看到同样的内容
4. 后台 [mingdaoge.top/admin](https://mingdaoge.top/admin) 修改图片，前台刷新后所有设备都能看到

---

## 如果之前建表时缺少字段

如果你之前只跑了我给的简化版 SQL（缺少 material/origin/diameter/gradient 字段），在 SQL Editor 里补跑：

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS diameter TEXT DEFAULT '10mm';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gradient TEXT DEFAULT '';
```

---

## 如果之前重复创建了策略导致报错

可以删除多余策略后重建。在 SQL Editor 里：

```sql
-- 查看现有策略
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('products', 'messages', 'reviews');
```

如果看到重复的策略名，可以删除后重建：

```sql
DROP POLICY IF EXISTS "重复的策略名" ON 表名;
```

---

## 关键信息汇总

| 项目 | 值 |
|------|------|
| Supabase URL | https://exhvhpgilclvlcasyuqy.supabase.co |
| 数据库表 | products / messages / reviews |
| 存储桶 | images (public) |
| 网站域名 | mingdaoge.top |
| 后台地址 | mingdaoge.top/admin |
| 后台密码 | mingdao2026 |
| GitHub 仓库 | https://github.com/x3389675386-crypto/mingdaoge |
