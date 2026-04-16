import z from 'zod';

export const ChannelTypeSchema = z.enum(['GROUP', 'PERSON', 'BROADCAST']);

export enum MessageType {
  TEXT = 1,       // 文字消息
  IMAGE = 2,      // 图片消息
  VIDEO = 3,      // 视频消息
  FILE = 4,       // 文件消息
  AUDIO = 8,      // 音频消息
  KMARKDOWN = 9,  // KMarkdown
  CARD = 10,      // card 消息
  SYSTEM = 255    // 系统消息
}

// 2. 使用 z.nativeEnum 包装
export const MessageTypeSchema = z.nativeEnum(MessageType);

export const AuthorSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  vip_avatar: z.string().optional(),
  nickname: z.string(),
  roles: z.array(z.number()).optional(),
  bot: z.boolean().optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  type: MessageTypeSchema,
  content: z.string(),
  create_at: z.number(),
  updated_at: z.number(),
  author: AuthorSchema,
});

export const TextMessageExtraSchema = z.object({
  type: z.number(),
  guild_id: z.string(),
  channel_name: z.string(),
  mention: z.array(z.string()), // 提及到的用户 id 的列表
  mention_all: z.boolean(),
  mention_roles: z.array(z.number().or(z.string())), // mention 用户角色的数组
  mention_here: z.boolean(),
  author: AuthorSchema, // 用户信息
});

// 事件主要格式
export const EventSchema = z.object({
  channel_type: ChannelTypeSchema,
  type: MessageTypeSchema, 
  target_id: z.string(), // channel id
  author_id: z.string(), // 发送者 id，1 代表系统
  content: z.string(), // 消息内容，文件、图片、视频时，content 为 url
  msg_id: z.string(),
  msg_timestamp: z.number(), // 消息发送时间的毫秒时间戳
  nonce: z.string(), // 随机串，与用户消息发送 api 中传的 nonce 保持一致
  
  // extra 结构不一致：这里允许解析为上面定义的文字消息 Extra，或者降级为 unknown 应对系统消息等其他情况
  extra: TextMessageExtraSchema.or(z.unknown())
});

export const MessageToEventContextSchema = z.object({
  channel_type: ChannelTypeSchema.optional(),
  target_id: z.string().optional(),
  nonce: z.string().optional(),
  guild_id: z.string().optional(),
  channel_name: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;
export type Event = z.infer<typeof EventSchema>;
export type ChannelType = z.infer<typeof ChannelTypeSchema>;
export type MessageToEventContext = z.infer<typeof MessageToEventContextSchema>;
