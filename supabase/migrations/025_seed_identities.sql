-- 025_seed_identities.sql
-- user_identities 种子数据（散修 8 项 / 法脉 12 项 / 顾客）
-- 与前端 src/lib/identities.ts 手动保持一致（本期不支持自由填写、admin 不做身份 CRUD）。
--
-- 执行顺序：020 → 021 → 022 → 023 → 024 → 025（最后执行）

INSERT INTO public.user_identities (type, key, label, description, sort_order) VALUES
  -- 顾客
  ('customer', 'customer', '顾客', '普通结缘用户', 1),
  -- 散修 8 项
  ('sanxiu', 'chuma',     '出马仙',     '', 1),
  ('sanxiu', 'yinyang',   '阴阳先生',   '', 2),
  ('sanxiu', 'fengshui',  '风水师',     '', 3),
  ('sanxiu', 'minjian',   '民间法教',   '', 4),
  ('sanxiu', 'mingli',    '命理师',     '', 5),
  ('sanxiu', 'nuo',       '傩师',       '', 6),
  ('sanxiu', 'xiangmen',  '香门香童',   '', 7),
  ('sanxiu', 'daoyi',     '道医',       '', 8),
  -- 法脉 12 项
  ('famai', 'longhushan',     '龙虎山正一道',     '', 1),
  ('famai', 'maoshan',        '茅山上清派',       '', 2),
  ('famai', 'geshan',         '阁皂山灵宝派',     '', 3),
  ('famai', 'jingming',       '西山万寿宫净明道', '', 4),
  ('famai', 'quanzhenlongmen','全真龙门派',       '', 5),
  ('famai', 'quanzhenhuashan','全真华山派',       '', 6),
  ('famai', 'wudang',         '武当道三丰派',     '', 7),
  ('famai', 'shenxiao',       '神霄派',           '', 8),
  ('famai', 'qingwei',        '清微派',           '', 9),
  ('famai', 'donghua',        '东华派',           '', 10),
  ('famai', 'lushan',         '闾山派',           '', 11),
  ('famai', 'laoshan',        '崂山派',           '', 12)
ON CONFLICT (type, key) DO NOTHING;
