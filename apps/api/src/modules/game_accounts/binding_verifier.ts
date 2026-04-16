export interface BindingVerifier {
  verify(token: string, gameId: string): Promise<boolean>
}

// 第一阶段：由管理员人工核实，永远返回 false（admin API 手动触发通过）
export class ManualVerifier implements BindingVerifier {
  async verify(_token: string, _gameId: string): Promise<boolean> {
    return false
  }
}
