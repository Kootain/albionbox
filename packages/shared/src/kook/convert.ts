import { Event, Message, MessageToEventContext } from './types';

/**
 * 将获取到的 Message 对象转换为 WebSocket 下发的 Event 对象格式
 * 由于 Message 对象中不包含 channel_id(target_id) 等上下文信息，
 * 可通过 context 参数补充。
 */
export function messageToEvent(
  message: Message & Record<string, any>,
  context?: MessageToEventContext
): Event {
  return {
    channel_type: context?.channel_type || 'GROUP',
    type: message.type,
    target_id: context?.target_id || '',
    author_id: message.author.id,
    content: message.content,
    msg_id: message.id,
    msg_timestamp: message.create_at,
    nonce: context?.nonce || '',
    extra: {
      type: message.type,
      guild_id: context?.guild_id || '',
      channel_name: context?.channel_name || '',
      mention: message.mention || [],
      mention_all: message.mention_all || false,
      mention_roles: message.mention_roles || [],
      mention_here: message.mention_here || false,
      author: message.author,
    },
  };
}