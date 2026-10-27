-- ============================================================
-- 明道阁 · 商品表恢复脚本（一键修复）
-- 症状：products 表报 PGRST205 "Could not find the table"，
--       网站商品区显示"此分类暂无产品"。
-- 用法：登录 Supabase → 左侧 SQL Editor → New query → 粘贴全文 → Run
-- 特性：幂等安全。若表其实存在（只是缓存陈旧）→ NOTIFY 刷缓存，
--       CREATE IF NOT EXISTS 跳过，INSERT ON CONFLICT 不覆盖已有商品。
-- ============================================================

-- 0) 强制 PostgREST 重载 schema 缓存（应对“表其实在、只是缓存没刷新”的情况）
NOTIFY pgrst, 'reload schema';

-- 1) 建表（结构与 SETUP_GUIDE 原始定义完全一致；已存在则跳过，不动原字段/数据）
CREATE TABLE IF NOT EXISTS public.products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  material    TEXT DEFAULT '',
  category    TEXT NOT NULL,
  price       NUMERIC(10, 2) NOT NULL,
  description TEXT,
  image_url   TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gradient    TEXT DEFAULT '',
  origin      TEXT DEFAULT '',
  diameter    TEXT DEFAULT '10mm',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2) RLS + 公开策略（幂等：先 DROP IF EXISTS 再建，避免重复报错）
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read products"   ON public.products;
DROP POLICY IF EXISTS "Public insert products" ON public.products;
DROP POLICY IF EXISTS "Public update products" ON public.products;
DROP POLICY IF EXISTS "Public delete products" ON public.products;
DROP POLICY IF EXISTS "允许所有人查看产品" ON public.products;
DROP POLICY IF EXISTS "允许所有人添加产品" ON public.products;
DROP POLICY IF EXISTS "允许所有人修改产品" ON public.products;
DROP POLICY IF EXISTS "允许所有人删除产品" ON public.products;

CREATE POLICY "Public read products"   ON public.products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete products" ON public.products FOR DELETE USING (true);

-- 3) 灌入 8 个原始种子商品（已存在同 id 则跳过，绝不覆盖线上已有商品）
INSERT INTO public.products (id, name, material, category, price, description, image_url, status, gradient, origin, diameter) VALUES
  (1, '小叶紫檀·如意', '小叶紫檀', 'wood', 1280,
   '精选印度小叶紫檀老料，色泽深沉如墨，油性充足，盘玩后呈琥珀光泽。十八颗圆珠匀称饱满，每一颗都经匠人手工打磨，触感温润细腻。紫檀自古为帝王之木，佩戴可安神定志，彰显沉稳气度。',
   NULL, 'active', 'linear-gradient(135deg, #5D4037 0%, #3E2723 50%, #4E342E 100%)', '印度迈索尔', '10mm'),

  (2, '沉香·禅心', '海南沉香', 'agarwood', 3680,
   '选用海南芽庄沉香，油脂线清晰，香气幽远绵长。佩戴时体温激发香韵，若有若无间沁人心脾。古人云“沉檀龙麝”，沉香居首，此串助您于繁忙中觅得一方清净。配手工编织朱红流苏，雅致非凡。',
   NULL, 'active', 'linear-gradient(135deg, #4E342E 0%, #1B0000 50%, #3E2723 100%)', '海南芽庄', '8mm'),

  (3, '黄花梨·云纹', '海南黄花梨', 'wood', 5880,
   '极品海南黄花梨，鬼脸纹路天然成趣，行云流水般的纹理令人叹为观止。木质金黄温润，触之如玉。黄花梨百年成材，此串选用陈年老料，纹理瑰丽，乃木中黄金，极具收藏价值。',
   NULL, 'active', 'linear-gradient(135deg, #A1887F 0%, #6D4C41 50%, #8D6E63 100%)', '海南霸王岭', '12mm'),

  (4, '崖柏·山居', '太行崖柏', 'wood', 980,
   '采自太行山脉悬崖峭壁之上的陈化崖柏，历经风霜雨雪百年不朽。柏香浓郁持久，有安神醒脑之效。色泽从浅黄到深褐自然过渡，每一颗珠子都承载着山野之息。适合静心品茗时佩戴，意趣悠然。',
   NULL, 'active', 'linear-gradient(135deg, #8D6E63 0%, #5D4037 50%, #6D4C41 100%)', '太行山脉', '10mm'),

  (5, '金刚菩提·无畏', '尼泊尔金刚菩提', 'bodhi', 680,
   '精选尼泊尔五瓣金刚菩提，纹路深刻有力，瓣线清晰分明。象征无畏与坚毅，寓意破除一切烦恼障碍。每颗籽都经人工精挑细选，品相上佳。配以手工编织金刚结，兼具修持与佩戴之美。',
   NULL, 'active', 'linear-gradient(135deg, #795548 0%, #4E342E 50%, #5D4037 100%)', '尼泊尔', '20mm'),

  (6, '星月菩提·清辉', '海南星月菩提', 'bodhi', 580,
   '海南元宝籽星月菩提，月眼端正居中，星点细密均匀。经正月精选，阴皮少，色白如雪，密度极高。盘玩后由白转黄再转红，见证时光之痕。星月寓意福慧双修，是修行者与雅士的至爱之物。',
   NULL, 'active', 'linear-gradient(135deg, #D7CCC8 0%, #BCAAA4 50%, #A1887F 100%)', '海南', '9mm'),

  (7, '沉香·听雨', '芽庄沉香', 'agarwood', 4280,
   '越南芽庄顶级沉香，奇楠种，香韵层次丰富，初闻花香馥郁，继而生凉意，尾韵甘甜悠长。珠体油线密布，沉水级密度。配银质莲花隔珠与手编流苏，于寂静处听雨闻香，人生一大雅事也。',
   NULL, 'active', 'linear-gradient(135deg, #3E2723 0%, #1A0000 50%, #4E342E 100%)', '越南芽庄', '8mm'),

  (8, '凤眼菩提·自在', '尼泊尔凤眼菩提', 'bodhi', 880,
   '尼泊尔原籽凤眼菩提，眼形饱满如凤目，纹理古朴自然。凤眼在藏传佛教中地位崇高，象征智慧之眼。此串选籽严苛，眼纹清晰端正，皮质细腻。佩戴修行两相宜，自在随心，步步生莲。',
   NULL, 'active', 'linear-gradient(135deg, #6D4C41 0%, #3E2723 50%, #5D4037 100%)', '尼泊尔', '11mm')
ON CONFLICT (id) DO NOTHING;

-- 4) 再次刷新 schema 缓存，让新表/新数据立刻对 PostgREST 可见
NOTIFY pgrst, 'reload schema';

-- 5) 自检：应返回 8 行
SELECT id, name, category, price, status FROM public.products ORDER BY id;
