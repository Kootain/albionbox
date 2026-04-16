import { RestClient } from '@kookapp/js-sdk'

export type KookRestClientLike = Pick<RestClient, 'request'>

export function createKookRestClient(params: { token: string }) {
  return new RestClient({ token: params.token })
}
