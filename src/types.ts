/** 产品分类类型 */
export type Category =
  | 'all'
  | 'wood'
  | 'bodhi'
  | 'agarwood'
  | 'handcard'
  | 'perfume'
  | 'talisman'
  | 'bone'
  | 'craft'
  | 'ivory';

/** 产品分类（不含 all） */
export type ProductCategory =
  | 'wood'
  | 'bodhi'
  | 'agarwood'
  | 'handcard'
  | 'perfume'
  | 'talisman'
  | 'bone'
  | 'craft'
  | 'ivory';

/** 产品接口 */
export interface Product {
  /** 产品唯一ID */
  id: number;
  /** 产品名称 */
  name: string;
  /** 材质名称 */
  material: string;
  /** 产品分类 */
  category: ProductCategory;
  /** 价格（元） */
  price: number;
  /** 产品详细描述 */
  description: string;
  /** 图片占位渐变色 */
  gradient: string;
  /** 产品图片 URL（base64 或外部链接） */
  imageUrl?: string;
  /** 产地 */
  origin: string;
  /** 珠径 */
  diameter: string;
  /** 上架状态 */
  status: 'active' | 'inactive';
}

/** 购物车项接口 */
export interface CartItem {
  /** 关联产品ID（引用，渲染时从 ProductProvider 解析实时数据） */
  productId: number;
  /** 购买数量 */
  quantity: number;
}

/** 购物车状态接口 */
export interface CartState {
  /** 购物车商品列表 */
  items: CartItem[];
  /** 购物车抽屉是否打开 */
  isOpen: boolean;
}

/** 购物车动作类型联合 */
export type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QTY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' };

/** 客户留言接口 */
export interface Message {
  /** 留言唯一ID */
  id: number;
  /** 称呼 */
  name: string;
  /** 联系方式 */
  contact: string;
  /** 留言内容 */
  message: string;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 是否已读 */
  read: boolean;
}

/** 留言状态接口 */
export interface MessageState {
  messages: Message[];
}

/** 留言动作类型 */
export type MessageAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'MARK_READ'; payload: number }
  | { type: 'MARK_UNREAD'; payload: number }
  | { type: 'DELETE_MESSAGE'; payload: number };

/** 论坛帖子接口 */
export interface ForumPost {
  /** 帖子唯一ID */
  id: number;
  /** 作者昵称 */
  author: string;
  /** 帖子标题 */
  title: string;
  /** 帖子内容 */
  content: string;
  /** 分类 */
  category: string;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 帖子图片URL */
  imageUrl?: string;
  /** 点赞数 */
  likes?: number;
  /** 当前用户是否已点赞（前端维护，后端以 forum_post_likes 为准） */
  isLiked?: boolean;
  /** 聊天身份 guest_id（用于作者「私聊」入口，历史内容为空） */
  guest_id?: string;
}

/**
 * 论坛分类（前端硬编码兜底，已废弃）。
 * @deprecated 一期起分类改为从 forum_categories 表动态加载（见 ForumCategoryDB）。
 * 仅在前端未连 Supabase 或动态分类加载失败时作降级兜底使用。
 */
export const FORUM_CATEGORIES = [
  { value: 'paranormal', label: '灵异事件大全', icon: '👻' },
  { value: 'handcraft', label: '手串手作', icon: '📿' },
  { value: 'culture', label: '国风文化', icon: '🏯' },
  { value: 'chat', label: '闲聊灌水', icon: '💬' },
  { value: 'gongfa', label: '功法', icon: '📜' },
] as const;

export type ForumCategory = typeof FORUM_CATEGORIES[number]['value'];

// =================== 一期新增类型（身份 / 双账户 / 兑换 / 论坛功法）===================

/** 身份大类 */
export type IdentityType = 'customer' | 'sanxiu' | 'famai';

/** 费用 / 余额种类 */
export type CostKind = 'yang_de' | 'points';

/** 兑换项类型 */
export type ItemType = 'bracelet' | 'cash' | 'magic_tool' | 'retreat_card';

/** 兑换 / 提现订单状态 */
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

/** 论坛分类（DB 行，动态加载，替代硬编码 FORUM_CATEGORIES） */
export interface ForumCategoryDB {
  id: number;
  value: string;
  label: string;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
}

/** 功法电子书 */
export interface GongfaMaterial {
  id: number;
  post_id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string | null;
  created_at?: string;
}

/** 兑换项（admin CRUD） */
export interface ExchangeItem {
  id: number;
  title: string;
  description: string | null;
  cost_kind: CostKind;
  cost_amount: number;
  stock: number | null;
  item_type: ItemType;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** 兑换 / 提现订单 */
export interface ExchangeOrder {
  id: number;
  user_id: string;
  item_id: number | null;
  kind: 'redeem' | 'cashout';
  cost_kind: CostKind;
  amount: number;
  status: OrderStatus;
  note: string | null;
  operator_id: string | null;
  created_at: string;
  updated_at?: string;
}

/** 余额变动流水（所有阳德 / 积分变动均经此表） */
export interface RewardLedger {
  id: number;
  user_id: string;
  kind: CostKind;
  delta: number;
  balance_after: number;
  reason: string | null;
  operator_id: string | null;
  created_at: string;
}

/** 身份细分种子（user_identities 镜像，前端 src/lib/identities.ts 保持一致） */
export interface UserIdentity {
  id: number;
  type: IdentityType;
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

/** 论坛点赞记录 */
export interface ForumPostLike {
  post_id: number;
  user_id: string;
  created_at?: string;
}

/** 私聊消息接口（对应 chat_messages 表） */
export interface ChatMessage {
  /** 消息唯一ID */
  id: number;
  /** 会话ID（两 guest_id 排序拼接，确定性派生） */
  conversationId: string;
  /** 发送方 guest_id */
  senderId: string;
  /** 发送方昵称（冗余存储，改昵称不影响历史） */
  senderName: string;
  /** 接收方 guest_id */
  receiverId: string;
  /** 接收方昵称（冗余存储） */
  receiverName: string;
  /** 文本内容 */
  content: string;
  /** 消息类型 */
  type: 'text' | 'image';
  /** 图片消息 URL（base64 或 Storage） */
  imageUrl?: string;
  /** 是否已读 */
  isRead: boolean;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
}

/** 私聊会话接口（由消息派生的视图） */
export interface ChatConversation {
  /** 会话ID */
  conversationId: string;
  /** 对方 guest_id */
  peerId: string;
  /** 对方昵称 */
  peerName: string;
  /** 最后一条消息预览 */
  lastMessage: string;
  /** 最后消息时间 */
  lastAt: string;
  /** 未读消息数 */
  unreadCount: number;
}
