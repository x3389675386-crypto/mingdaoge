/**
 * 身份细分常量（前端镜像 user_identities 种子，与 025_seed_identities.sql 手动一致）。
 *
 * 本期规则：
 * - 顾客（customer）、散修 8 项、法脉 12 项，共 21 个细分。
 * - 不支持自由填写，admin 不做身份 CRUD（锁定决策 2）。
 * - 注册时由 IdentitySelector 选取，写入 auth.users.raw_user_meta_data，落库 profiles。
 */

import type { IdentityType } from '../types';

/** 单个身份细分选项 */
export interface IdentityOption {
  /** 细分 key（与 user_identities.key 一致） */
  key: string;
  /** 展示名 */
  label: string;
  /** 说明（可选） */
  description?: string;
}

/** 身份大类分组（用于注册选择器三选一 + 二级细分） */
export interface IdentityGroup {
  type: IdentityType;
  /** 大类展示名 */
  label: string;
  /** 二级细分列表 */
  subtypes: IdentityOption[];
}

/** 顾客（无二级细分，single 形态） */
export const CUSTOMER_OPTION: IdentityOption = { key: 'customer', label: '顾客' };

/** 身份分组（顺序：顾客 / 散修 / 法脉） */
export const IDENTITY_GROUPS: IdentityGroup[] = [
  {
    type: 'customer',
    label: '顾客',
    subtypes: [CUSTOMER_OPTION],
  },
  {
    type: 'sanxiu',
    label: '散修',
    subtypes: [
      { key: 'chuma', label: '出马仙' },
      { key: 'yinyang', label: '阴阳先生' },
      { key: 'fengshui', label: '风水师' },
      { key: 'minjian', label: '民间法教' },
      { key: 'mingli', label: '命理师' },
      { key: 'nuo', label: '傩师' },
      { key: 'xiangmen', label: '香门香童' },
      { key: 'daoyi', label: '道医' },
    ],
  },
  {
    type: 'famai',
    label: '法脉',
    subtypes: [
      { key: 'longhushan', label: '龙虎山正一道' },
      { key: 'maoshan', label: '茅山上清派' },
      { key: 'geshan', label: '阁皂山灵宝派' },
      { key: 'jingming', label: '西山万寿宫净明道' },
      { key: 'quanzhenlongmen', label: '全真龙门派' },
      { key: 'quanzhenhuashan', label: '全真华山派' },
      { key: 'wudang', label: '武当道三丰派' },
      { key: 'shenxiao', label: '神霄派' },
      { key: 'qingwei', label: '清微派' },
      { key: 'donghua', label: '东华派' },
      { key: 'lushan', label: '闾山派' },
      { key: 'laoshan', label: '崂山派' },
    ],
  },
];

/** 大类展示名映射 */
export const IDENTITY_TYPE_LABEL: Record<IdentityType, string> = {
  customer: '顾客',
  sanxiu: '散修',
  famai: '法脉',
};

/**
 * 解析身份展示标签（如「散修·风水师」「法脉·茅山上清派」「顾客」）。
 *
 * @param type 身份大类
 * @param subtype 二级细分 key
 */
export function getIdentityLabel(type: IdentityType | undefined, subtype: string | null | undefined): string {
  if (!type) return '';
  const group = IDENTITY_GROUPS.find((g) => g.type === type);
  if (!group) return type;
  if (group.subtypes.length === 1) return group.label; // 顾客
  const sub = group.subtypes.find((s) => s.key === subtype);
  if (sub) return `${group.label}·${sub.label}`;
  return group.label;
}
