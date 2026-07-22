/** 公告条目接口 */
export interface Announcement {
  /** 公告唯一 ID（用于「不再显示」记忆） */
  id: string;
  /** 短标签，如「新功能」「活动」 */
  tag: string;
  /** 公告标题 */
  title: string;
  /** 公告正文 */
  content: string;
  /** 可选跳转链接 */
  href?: string;
}

/**
 * 首页公告栏数据（示例 2-3 条，文案贴合明道阁国风调性）。
 * 如需新增公告，直接在此数组追加条目即可，AnnouncementBar 会自动渲染。
 */
export const announcements: Announcement[] = [
  {
    id: 'a2025-gongfa',
    tag: '新功能',
    title: '功法阁上线',
    content:
      '明道阁新增「功法」板块，道友可分享修行心得与手作笔记，结缘以文会友，共参菩提。',
  },
  {
    id: 'a2025-qixi',
    tag: '活动',
    title: '七夕结缘礼',
    content:
      '七夕将至，活动期间结缘手串即赠开光祈福卡，数量有限，先到先得，愿有情人皆成眷属。',
  },
  {
    id: 'a2025-exchange',
    tag: '公告',
    title: '兑换中心升级',
    content:
      '阳德与积分体系已接入云端，兑换、提现记录实时同步，修行之路更安心，随心兑换好物。',
  },
];
