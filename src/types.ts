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
  /** 关联的产品 */
  product: Product;
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

/** 晒图/评价接口 */
export interface Review {
  /** 晒图唯一ID */
  id: number;
  /** 昵称 */
  nickname: string;
  /** 评论内容 */
  content: string;
  /** 晒图 base64 */
  imageUrl?: string;
  /** 关联产品ID */
  productId?: number;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 聊天身份 guest_id（用于作者「私聊」入口，历史内容为空） */
  guest_id?: string;
}

/** 晒图状态接口 */
export interface ReviewState {
  reviews: Review[];
}

/** 晒图动作类型 */
export type ReviewAction =
  | { type: 'ADD_REVIEW'; payload: Review }
  | { type: 'DELETE_REVIEW'; payload: number };

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
  /** 聊天身份 guest_id（用于作者「私聊」入口，历史内容为空） */
  guest_id?: string;
}

/** 论坛分类 */
export const FORUM_CATEGORIES = [
  { value: 'paranormal', label: '灵异事件大全', icon: '👻' },
  { value: 'handcraft', label: '手串手作', icon: '📿' },
  { value: 'culture', label: '国风文化', icon: '🏯' },
  { value: 'chat', label: '闲聊灌水', icon: '💬' },
] as const;

export type ForumCategory = typeof FORUM_CATEGORIES[number]['value'];

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
