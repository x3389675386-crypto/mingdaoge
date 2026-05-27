/**
 * 文明用词过滤模块
 * 维护中国互联网常见违规词汇列表，对文本进行过滤校验。
 *
 * - 违规词替换为等长度的 ***
 * - badWordCount > 3 时判定为 clean: false（拒绝发布）
 */

/** 违规词汇列表（涵盖政治敏感、色情低俗、暴力恐怖、歧视侮辱、诈骗违法等类别） */
const PROFANITY_LIST: string[] = [
  // ---- 政治敏感词 ----
  '法轮功',
  '反华',
  '颠覆政权',
  '分裂国家',
  '政治避难',
  '民运',
  '邪教',
  '暴动',
  '煽动颠覆',
  '境外势力',

  // ---- 色情低俗词 ----
  '色情',
  '淫秽',
  '裸聊',
  '卖淫',
  '嫖娼',
  '妓女',
  '强奸',
  '猥亵',
  '性侵',
  '援交',
  '一夜情',
  '约炮',

  // ---- 暴力恐怖词 ----
  '恐怖袭击',
  '炸弹制作',
  '杀人方法',
  '自杀指南',
  '恐怖组织',
  '爆炸装置',
  '极端主义',
  '圣战',

  // ---- 歧视侮辱词 ----
  '傻逼',
  '脑残',
  '白痴',
  '弱智',
  '贱人',
  '滚蛋',
  '去死',
  '畜生',
  '狗日的',
  '王八蛋',
  '混蛋',
  '乌龟王八',

  // ---- 诈骗违法词 ----
  '代开发票',
  '办假证',
  '贩卖枪支',
  '贩卖毒品',
  '洗钱',
  '黑客攻击',
  '网络诈骗',
  '赌博网站',
  '博彩平台',
  '高利贷',
  '非法集资',
  '传销组织',

  // ---- 其他常见违规词 ----
  '翻墙',
  'VPN代理',
  '假药',
  '违禁品',
];

/** 预编译的正则表达式（不区分大小写，全局匹配） */
const PROFANITY_REGEX: RegExp[] = PROFANITY_LIST.map(
  (word) => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
);

/**
 * 校验文本是否包含违规词汇，并返回过滤后的文本
 *
 * @param text - 待校验的文本
 * @returns clean 是否通过校验（badWordCount <= 3），filteredText 过滤后文本，badWordCount 违规词数量
 */
export function containsProfanity(text: string): {
  clean: boolean;
  filteredText: string;
  badWordCount: number;
} {
  let filteredText = text;
  let badWordCount = 0;

  for (let i = 0; i < PROFANITY_LIST.length; i++) {
    const regex = PROFANITY_REGEX[i];
    const matches = filteredText.match(regex);
    if (matches) {
      badWordCount += matches.length;
      filteredText = filteredText.replace(regex, (match) => '*'.repeat(match.length));
    }
  }

  return {
    clean: badWordCount <= 3,
    filteredText,
    badWordCount,
  };
}

/**
 * 获取违规词详情提示（用于用户反馈）
 *
 * @param text - 待校验的文本
 * @returns 若有违规词返回提示消息，否则返回 null
 */
export function getProfanityWarning(text: string): string | null {
  const result = containsProfanity(text);
  if (result.badWordCount === 0) return null;
  if (!result.clean) {
    return `内容包含过多违规词汇（${result.badWordCount}处），请修改后重新发布`;
  }
  return `内容包含${result.badWordCount}处敏感词汇，已自动替换为 ***`;
}
