import { RestClient } from '@kookapp/js-sdk'

export type KookRestClientLike = Pick<RestClient, 'request'>

export function createKookRestClient(params: { token: string }) {
  return new RestClient({ token: params.token })
}

export async function addKookMessageReaction(params: { client: KookRestClientLike; msgId: string; emoji: string }) {
  return params.client.request('/api/v3/message/add-reaction', 'POST', { msg_id: params.msgId, emoji: params.emoji })
}

