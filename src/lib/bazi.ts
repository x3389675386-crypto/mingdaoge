/**
 * 八字 / 五行 纯前端算法（民俗娱乐版）。
 *
 * 说明：本文件所有计算均为「公历 → 四柱干支 → 五行计数 → 日主强弱 → 喜用神」的简化近似，
 * 节气分界、真太阳时、早晚子时等因素均忽略，仅用于娱乐参考，
 * 不构成任何专业命理 / 医疗 / 投资建议。页面须展示免责声明。
 *
 * 算法要点：
 *  - 年柱：天干 = (year-4)%10，地支 = (year-4)%12（以公历近似，忽略立春分界）。
 *  - 月柱：五虎遁（年干 → 正月天干），月支按公历月近似（正月寅…腊月丑）。
 *  - 日柱：以已知基准日 2000-01-01（戊午日，60 甲子序号 54）推算目标日与基准的日差，
 *          对 60 取模得日干支。
 *  - 时柱：五鼠遁（日干 → 子时天干），时支按 2 小时一支。
 *  - 五行计数：天干地支各映射五行，统计 木火土金水 出现次数。
 *  - 日主强弱：依「得令 / 得地 / 得势」简化判断（民俗近似）。
 *  - 喜用神：身弱补比劫印、身强用官杀财食伤、中和补最弱五行（简化娱乐版）。
 */

/** 五行类型 */
export type Wuxing = '木' | '火' | '土' | '金' | '水';

/** 五行固定顺序（用于计数 / 展示） */
export const WUXING_LIST: Wuxing[] = ['木', '火', '土', '金', '水'];

/** 天干（0 甲 … 9 癸） */
export const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 地支（0 子 … 11 亥） */
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 天干五行 */
const GAN_WUXING: Wuxing[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];

/** 地支五行：子水丑土寅木卯木辰土巳火午火未土申金酉金戌土亥水 */
const ZHI_WUXING: Wuxing[] = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

/** 地支所主季节五行（四季月辰戌丑未归土，民俗近似） */
const ZHI_SEASON: Wuxing[] = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

/** 五行 → 手串材质推荐（明道阁在售材质，纯展示用） */
export const WUXING_MATERIALS: Record<Wuxing, string[]> = {
  木: ['绿檀', '菩提', '沉香'],
  火: ['南红', '红玛瑙', '朱砂'],
  土: ['蜜蜡', '黄龙玉', '和田黄玉'],
  金: ['金发晶', '白水晶', '钛晶'],
  水: ['黑曜石', '海蓝宝', '砗磲'],
};

/** 五行展示配色（与暗金主题协调） */
export const WUXING_COLOR: Record<Wuxing, string> = {
  木: '#5cb85c',
  火: '#c0392b',
  土: '#c9a96e',
  金: '#e0c99a',
  水: '#4a90d9',
};

/** 基准日：2000-01-01 为 戊午日（60 甲子序号 54，由「甲子=0」按天干*10+地支 CRT 推导所得） */
const BASE_DATE = new Date(Date.UTC(2000, 0, 1));
const BASE_GANZHI_INDEX = 54;

/** 五虎遁：年干索引 → 正月（寅月）天干索引 */
const WUHU_DUN: Record<number, number> = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 };

/** 五鼠遁：日干索引 → 子时天干索引 */
const WUSHU_DUN: Record<number, number> = { 0: 0, 5: 0, 1: 2, 6: 2, 2: 4, 7: 4, 3: 6, 8: 6, 4: 8, 9: 8 };

/** 五行生克（简化） */
const SHENG_WO: Record<Wuxing, Wuxing> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }; // 谁生我（印）
const WO_SHENG: Record<Wuxing, Wuxing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // 我生（食伤）
const KE_WO: Record<Wuxing, Wuxing> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }; // 谁克我（官杀）
const WO_KE: Record<Wuxing, Wuxing> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }; // 我克（财）

/** 时辰表（用于 UI 选择） */
export const SHICHEN = [
  { name: '子时', range: '23:00-00:59', zhiIndex: 0 },
  { name: '丑时', range: '01:00-02:59', zhiIndex: 1 },
  { name: '寅时', range: '03:00-04:59', zhiIndex: 2 },
  { name: '卯时', range: '05:00-06:59', zhiIndex: 3 },
  { name: '辰时', range: '07:00-08:59', zhiIndex: 4 },
  { name: '巳时', range: '09:00-10:59', zhiIndex: 5 },
  { name: '午时', range: '11:00-12:59', zhiIndex: 6 },
  { name: '未时', range: '13:00-14:59', zhiIndex: 7 },
  { name: '申时', range: '15:00-16:59', zhiIndex: 8 },
  { name: '酉时', range: '17:00-18:59', zhiIndex: 9 },
  { name: '戌时', range: '19:00-20:59', zhiIndex: 10 },
  { name: '亥时', range: '21:00-22:59', zhiIndex: 11 },
];

/** 单柱结构 */
export interface Pillar {
  ganIndex: number;
  zhiIndex: number;
  ganzhi: string;
}

/** 完整八字分析结果 */
export interface BaziResult {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  /** 日干字（如「戊」） */
  dayMasterChar: string;
  /** 日主五行 */
  dayMaster: Wuxing;
  /** 强弱：强 / 弱 / 中和 */
  strength: '强' | '弱' | '中和';
  /** 五行计数 */
  counts: Record<Wuxing, number>;
  /** 缺失五行（计数为 0） */
  missing: Wuxing[];
  /** 最弱五行（计数最小） */
  weakest: Wuxing;
  /** 喜用五行（推荐补充的五行） */
  xiyong: Wuxing[];
  /** 喜用神文案 */
  xiyongText: string;
  /** 简版判语 */
  summary: string;
}

/** 取年柱 */
export function getYearGanZhi(date: Date): Pillar {
  const year = date.getUTCFullYear();
  const ganIndex = ((year - 4) % 10 + 10) % 10;
  const zhiIndex = ((year - 4) % 12 + 12) % 12;
  return { ganIndex, zhiIndex, ganzhi: TIANGAN[ganIndex] + DIZHI[zhiIndex] };
}

/** 取月柱（公历月近似，忽略节气） */
export function getMonthGanZhi(date: Date): Pillar {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-12
  const yearGan = ((year - 4) % 10 + 10) % 10;
  const zhiIndex = (month + 1) % 12; // 正月寅(2) … 腊月丑(1)
  const firstMonthGan = WUHU_DUN[yearGan];
  const ganIndex = (firstMonthGan + (month - 1)) % 10;
  return { ganIndex, zhiIndex, ganzhi: TIANGAN[ganIndex] + DIZHI[zhiIndex] };
}

/** 取日柱（以基准日推算，公历日差对 60 取模） */
export function getDayGanZhi(date: Date): Pillar {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diffDays = Math.round((d.getTime() - BASE_DATE.getTime()) / 86400000);
  const idx = (((BASE_GANZHI_INDEX + diffDays) % 60) + 60) % 60;
  const ganIndex = idx % 10;
  const zhiIndex = idx % 12;
  return { ganIndex, zhiIndex, ganzhi: TIANGAN[ganIndex] + DIZHI[zhiIndex] };
}

/** 取时柱（需传入日干索引；忽略时辰则传 withHour=false） */
export function getHourGanZhi(date: Date, dayGanIndex: number): Pillar | null {
  const hour = date.getUTCHours();
  const zhiIndex = Math.floor((hour + 1) / 2) % 12; // 子(0)…亥(11)
  const firstGan = WUSHU_DUN[dayGanIndex];
  const ganIndex = (firstGan + zhiIndex) % 10;
  return { ganIndex, zhiIndex, ganzhi: TIANGAN[ganIndex] + DIZHI[zhiIndex] };
}

/** 统计一组柱的五行出现次数（天干 + 地支各算一次） */
function countWuxing(pillars: Pillar[]): Record<Wuxing, number> {
  const counts: Record<Wuxing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    counts[GAN_WUXING[p.ganIndex]] += 1;
    counts[ZHI_WUXING[p.zhiIndex]] += 1;
  }
  return counts;
}

/** 简化去重 */
function uniqueWuxing(arr: Wuxing[]): Wuxing[] {
  return Array.from(new Set(arr));
}

/**
 * 八字分析主函数。
 * @param date 出生日期（含可选小时）；用 UTC 解析避免时区漂移。
 * @param withHour 是否纳入时柱（未知时辰则 false）。
 */
export function analyzeBazi(date: Date, withHour: boolean): BaziResult {
  const year = getYearGanZhi(date);
  const month = getMonthGanZhi(date);
  const day = getDayGanZhi(date);
  const hour = withHour ? getHourGanZhi(date, day.ganIndex) : null;

  const pillars = [year, month, day, ...(hour ? [hour] : [])];
  const counts = countWuxing(pillars);

  // 日主
  const dayMaster: Wuxing = GAN_WUXING[day.ganIndex];
  const dayMasterChar = TIANGAN[day.ganIndex];

  // 得令：日主五行是否匹配当月旺季五行
  const deLing = dayMaster === ZHI_SEASON[month.zhiIndex];
  // 得地：日主五行在地支中出现次数（含日支）
  const branches = pillars.map((p) => p.zhiIndex);
  const deDi = branches.filter((z) => ZHI_WUXING[z] === dayMaster).length >= 2;
  // 得势：日主五行在天干中出现次数（不含日干）
  const otherGans = pillars.filter((_, i) => i !== 2).map((p) => p.ganIndex);
  const deShi = otherGans.filter((g) => GAN_WUXING[g] === dayMaster).length >= 1;

  const score = (deLing ? 2 : 0) + (deDi ? 1 : 0) + (deShi ? 1 : 0);
  const strength: BaziResult['strength'] = score >= 3 ? '强' : score <= 1 ? '弱' : '中和';

  // 缺失 / 最弱
  const missing = WUXING_LIST.filter((w) => counts[w] === 0);
  const weakest = WUXING_LIST.reduce((a, b) => (counts[a] <= counts[b] ? a : b));

  // 喜用五行
  let xiyong: Wuxing[];
  if (missing.length > 0) {
    xiyong = missing; // 缺什么补什么（民俗常见说法）
  } else if (strength === '弱') {
    xiyong = uniqueWuxing([dayMaster, SHENG_WO[dayMaster]]); // 比劫 + 印
  } else if (strength === '强') {
    const cands = uniqueWuxing([KE_WO[dayMaster], WO_KE[dayMaster], WO_SHENG[dayMaster]]);
    xiyong = cands.sort((a, b) => counts[a] - counts[b]).slice(0, 2); // 取偏弱者
  } else {
    xiyong = [weakest];
  }

  const xiyongText = `日主${dayMasterChar}${dayMaster}，身${strength}，喜用五行：${xiyong.join('、')}`;
  const summary = missing.length
    ? `五行缺${missing.join('、')}，宜补其对应材质以增平衡。`
    : `五行俱全，日主偏${strength}，可借喜用五行调和。`;

  return {
    year,
    month,
    day,
    hour,
    dayMasterChar,
    dayMaster,
    strength,
    counts,
    missing,
    weakest,
    xiyong,
    xiyongText,
    summary,
  };
}

// =================== 十二建除（黄历宜忌，民俗近似）===================

/** 建除十二神顺序 */
const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

/** 建除 → 宜忌（民俗简化） */
const JIANCHU_YIJI: Record<string, { yi: string[]; ji: string[] }> = {
  建: { yi: ['出行', '祈福', '动土', '开业'], ji: ['安门', '结婚', '安葬'] },
  除: { yi: ['祭祀', '解除', '沐浴', '疗病'], ji: ['求官', '远行'] },
  满: { yi: ['祭祀', '开市', '交易', '立券'], ji: ['动土', '安葬', '移徙'] },
  平: { yi: ['修造', '嫁娶', '安床', '出行'], ji: ['词讼', '栽种'] },
  定: { yi: ['祭祀', '祈福', '嫁娶', '上任'], ji: ['词讼', '出行', '医疗'] },
  执: { yi: ['捕捉', '修造', '嫁娶', '收购'], ji: ['开市', '移徙', '入宅'] },
  破: { yi: ['破屋', '坏垣', '求医'], ji: ['嫁娶', '出行', '签约', '动工'] },
  危: { yi: ['安床', '祭祀', '祈福'], ji: ['登高', '行船', '迁徙'] },
  成: { yi: ['结婚', '开市', '入学', '动土', '交易'], ji: ['词讼', '出行'] },
  收: { yi: ['收纳', '嫁娶', '收购', '入仓'], ji: ['放债', '出行', '安葬'] },
  开: { yi: ['祭祀', '祈福', '入学', '开市', '动土'], ji: ['安葬', '放债'] },
  闭: { yi: ['筑堤', '补垣', '埋穴'], ji: ['开市', '出行', '手术'] },
};

/** 根据日期取当日建除神（按 日支 - 月支 定「建」位，民俗近似） */
export function getJianChu(date: Date): { term: string; yi: string[]; ji: string[] } {
  const monthZhi = getMonthGanZhi(date).zhiIndex;
  const dayZhi = getDayGanZhi(date).zhiIndex;
  const offset = ((dayZhi - monthZhi) % 12 + 12) % 12;
  const term = JIANCHU[offset];
  const yiji = JIANCHU_YIJI[term];
  return { term, yi: yiji.yi, ji: yiji.ji };
}

// =================== 生肖今日运势（纯娱乐）===================

/** 十二生肖 */
export const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

/** 单个生肖运势 */
export interface ZodiacFortune {
  zodiac: string;
  level: '吉' | '平' | '凶';
  text: string;
}

/** 生肖短评模板（按 level 取，确定性） */
const ZODIAC_TEXT: Record<'吉' | '平' | '凶', string[]> = {
  吉: ['诸事顺遂，宜把握机遇', '贵人相助，谋事易成', '心境开朗，宜结善缘', '财气流转，小有进益'],
  平: ['平稳无波，按部就班', '宜守不宜攻，静待时机', '小事纠缠，勿急勿躁', '平淡是真，养精蓄锐'],
  凶: ['宜谨言慎行，避是非', '诸事稍滞，宜缓不宜急', '防口舌小人，少管闲事', '宜静养身心，避风险'],
};

/**
 * 计算指定日期的 12 生肖运势（纯娱乐，按日期序号 + 生肖索引哈希，确定性）。
 */
export function getZodiacFortunes(date: Date): ZodiacFortune[] {
  const seed = date.getUTCFullYear() * 372 + (date.getUTCMonth() + 1) * 31 + date.getUTCDate();
  return ZODIAC.map((zodiac, i) => {
    const h = (seed * 7 + i * 13) % 3; // 0 吉 / 1 平 / 2 凶
    const level: '吉' | '平' | '凶' = h === 0 ? '吉' : h === 1 ? '平' : '凶';
    const textIdx = (seed + i) % ZODIAC_TEXT[level].length;
    return { zodiac, level, text: ZODIAC_TEXT[level][textIdx] };
  });
}
