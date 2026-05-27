-- ============================================
-- 明道阁 Supabase RLS 权限修复
-- 在 Supabase → SQL Editor 中粘贴并 Run
-- ============================================

-- 1. products 表：允许匿名读写
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看产品" ON products
  FOR SELECT USING (true);

CREATE POLICY "允许所有人添加产品" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许所有人修改产品" ON products
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "允许所有人删除产品" ON products
  FOR DELETE USING (true);

-- 2. messages 表：允许匿名读写
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看留言" ON messages
  FOR SELECT USING (true);

CREATE POLICY "允许所有人添加留言" ON messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许所有人删除留言" ON messages
  FOR DELETE USING (true);

-- 3. reviews 表：允许匿名读写
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看晒图" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "允许所有人添加晒图" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许所有人删除晒图" ON reviews
  FOR DELETE USING (true);
