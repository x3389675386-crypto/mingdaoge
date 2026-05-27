import type { Product } from '../types';

/** 手串产品模拟数据 */
export const products: Product[] = [
  {
    id: 1,
    name: '小叶紫檀·如意',
    material: '小叶紫檀',
    category: 'wood',
    price: 1280,
    description:
      '精选印度小叶紫檀老料，色泽深沉如墨，油性充足，盘玩后呈琥珀光泽。十八颗圆珠匀称饱满，每一颗都经匠人手工打磨，触感温润细腻。紫檀自古为帝王之木，佩戴可安神定志，彰显沉稳气度。',
    gradient: 'linear-gradient(135deg, #5D4037 0%, #3E2723 50%, #4E342E 100%)',
    origin: '印度迈索尔',
    diameter: '10mm',
    status: 'active',
  },
  {
    id: 2,
    name: '沉香·禅心',
    material: '海南沉香',
    category: 'agarwood',
    price: 3680,
    description:
      '选用海南芽庄沉香，油脂线清晰，香气幽远绵长。佩戴时体温激发香韵，若有若无间沁人心脾。古人云"沉檀龙麝"，沉香居首，此串助您于繁忙中觅得一方清净。配手工编织朱红流苏，雅致非凡。',
    gradient: 'linear-gradient(135deg, #4E342E 0%, #1B0000 50%, #3E2723 100%)',
    origin: '海南芽庄',
    diameter: '8mm',
    status: 'active',
  },
  {
    id: 3,
    name: '黄花梨·云纹',
    material: '海南黄花梨',
    category: 'wood',
    price: 5880,
    description:
      '极品海南黄花梨，鬼脸纹路天然成趣，行云流水般的纹理令人叹为观止。木质金黄温润，触之如玉。黄花梨百年成材，此串选用陈年老料，纹理瑰丽，乃木中黄金，极具收藏价值。',
    gradient: 'linear-gradient(135deg, #A1887F 0%, #6D4C41 50%, #8D6E63 100%)',
    origin: '海南霸王岭',
    diameter: '12mm',
    status: 'active',
  },
  {
    id: 4,
    name: '崖柏·山居',
    material: '太行崖柏',
    category: 'wood',
    price: 980,
    description:
      '采自太行山脉悬崖峭壁之上的陈化崖柏，历经风霜雨雪百年不朽。柏香浓郁持久，有安神醒脑之效。色泽从浅黄到深褐自然过渡，每一颗珠子都承载着山野之息。适合静心品茗时佩戴，意趣悠然。',
    gradient: 'linear-gradient(135deg, #8D6E63 0%, #5D4037 50%, #6D4C41 100%)',
    origin: '太行山脉',
    diameter: '10mm',
    status: 'active',
  },
  {
    id: 5,
    name: '金刚菩提·无畏',
    material: '尼泊尔金刚菩提',
    category: 'bodhi',
    price: 680,
    description:
      '精选尼泊尔五瓣金刚菩提，纹路深刻有力，瓣线清晰分明。象征无畏与坚毅，寓意破除一切烦恼障碍。每颗籽都经人工精挑细选，品相上佳。配以手工编织金刚结，兼具修持与佩戴之美。',
    gradient: 'linear-gradient(135deg, #795548 0%, #4E342E 50%, #5D4037 100%)',
    origin: '尼泊尔',
    diameter: '20mm',
    status: 'active',
  },
  {
    id: 6,
    name: '星月菩提·清辉',
    material: '海南星月菩提',
    category: 'bodhi',
    price: 580,
    description:
      '海南元宝籽星月菩提，月眼端正居中，星点细密均匀。经正月精选，阴皮少，色白如雪，密度极高。盘玩后由白转黄再转红，见证时光之痕。星月寓意福慧双修，是修行者与雅士的至爱之物。',
    gradient: 'linear-gradient(135deg, #D7CCC8 0%, #BCAAA4 50%, #A1887F 100%)',
    origin: '海南',
    diameter: '9mm',
    status: 'active',
  },
  {
    id: 7,
    name: '沉香·听雨',
    material: '芽庄沉香',
    category: 'agarwood',
    price: 4280,
    description:
      '越南芽庄顶级沉香，奇楠种，香韵层次丰富，初闻花香馥郁，继而生凉意，尾韵甘甜悠长。珠体油线密布，沉水级密度。配银质莲花隔珠与手编流苏，于寂静处听雨闻香，人生一大雅事也。',
    gradient: 'linear-gradient(135deg, #3E2723 0%, #1A0000 50%, #4E342E 100%)',
    origin: '越南芽庄',
    diameter: '8mm',
    status: 'active',
  },
  {
    id: 8,
    name: '凤眼菩提·自在',
    material: '尼泊尔凤眼菩提',
    category: 'bodhi',
    price: 880,
    description:
      '尼泊尔原籽凤眼菩提，眼形饱满如凤目，纹理古朴自然。凤眼在藏传佛教中地位崇高，象征智慧之眼。此串选籽严苛，眼纹清晰端正，皮质细腻。佩戴修行两相宜，自在随心，步步生莲。',
    gradient: 'linear-gradient(135deg, #6D4C41 0%, #3E2723 50%, #5D4037 100%)',
    origin: '尼泊尔',
    diameter: '11mm',
    status: 'active',
  },
];

/** 产品分类选项 */
export const categoryLabels: Record<string, string> = {
  all: '全部',
  wood: '木质',
  bodhi: '菩提',
  agarwood: '沉香',
  handcard: '手牌',
  perfume: '香水',
  talisman: '符卡',
};
