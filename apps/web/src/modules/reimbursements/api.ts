import type { AutoApprovalRule, BattleRecord, EquipmentSummary, SessionDetail, ReimbursementRecord, ReimbursementSession } from '../../types/domain';
import { apiClient } from '../../lib/api-client';

export const reimbursementsApi = {
  getBattleRecords(guildId: string, query?: { sessionId?: string; linkStatus?: 'linked' | 'unlinked' }) {
    return apiClient.get<{ battleRecords: BattleRecord[] }>(`/battle_reimbursements/${guildId}/battle_records`, query);
  },
  importBattleRecords(
    guildId: string,
    payload: {
      records: Array<{
        externalRecordId: string;
        externalBattleId?: string;
        battleName?: string;
        source: 'albion_killboard' | 'manual' | 'custom';
        occurredAt: string;
        isDeath: boolean;
        gameCharacterId?: string;
        victimGameAccountId?: string;
        victimCharacterName: string;
        totalEstimatedValue?: number;
        tags?: string[];
        equipmentItems: Array<{
          itemKey: string;
          itemName: string;
          slot?: string;
          tier: number;
          enchantmentLevel: number;
          quantity: number;
        }>;
      }>;
    }
  ) {
    return apiClient.post<{ message: string; summary: { createdCount: number; updatedCount: number }; battleRecords: BattleRecord[] }>(
      `/battle_reimbursements/${guildId}/battle_records/import`,
      payload
    );
  },
  getSessions(guildId: string, status?: 'open' | 'completed' | 'closed') {
    return apiClient.get<{ reimbursementSessions: ReimbursementSession[] }>(
      `/battle_reimbursements/${guildId}/reimbursement_sessions`,
      status ? { status } : undefined
    );
  },
  createSession(guildId: string, payload: { title: string; description?: string; battleRecordIds: string[] }) {
    return apiClient.post<{ message: string; reimbursementSession: SessionDetail | null }>(
      `/battle_reimbursements/${guildId}/reimbursement_sessions`,
      payload
    );
  },
  getSessionDetail(guildId: string, sessionId: string) {
    return apiClient.get<{ reimbursementSession: SessionDetail }>(`/battle_reimbursements/${guildId}/reimbursement_sessions/${sessionId}`);
  },
  updateSession(
    guildId: string,
    sessionId: string,
    payload: { title?: string; description?: string; status?: 'open' | 'completed' | 'closed'; battleRecordIds?: string[] }
  ) {
    return apiClient.patch<{ message: string; reimbursementSession: SessionDetail | null }>(
      `/battle_reimbursements/${guildId}/reimbursement_sessions/${sessionId}`,
      payload
    );
  },
  updateRecordStatus(
    guildId: string,
    recordId: string,
    payload: { status: ReimbursementRecord['status']; reimbursementAmount?: number; note?: string }
  ) {
    return apiClient.patch<{ message: string; reimbursementRecord: ReimbursementRecord; logs: ReimbursementRecord['logs'] }>(
      `/battle_reimbursements/${guildId}/reimbursement_records/${recordId}/status`,
      payload
    );
  },
  getRules(guildId: string) {
    return apiClient.get<{ autoApprovalRules: AutoApprovalRule[] }>(`/battle_reimbursements/${guildId}/auto_approval_rules`);
  },
  createRule(
    guildId: string,
    payload: {
      ruleName: string;
      description?: string;
      enabled: boolean;
      priority: number;
      matchMode: 'all' | 'any';
      action: 'approve' | 'reject';
      noteTemplate?: string;
      conditions: AutoApprovalRule['conditions'];
    }
  ) {
    return apiClient.post<{ message: string; autoApprovalRule: AutoApprovalRule | null }>(
      `/battle_reimbursements/${guildId}/auto_approval_rules`,
      payload
    );
  },
  updateRule(
    guildId: string,
    ruleId: string,
    payload: Partial<{
      ruleName: string;
      description?: string;
      enabled: boolean;
      priority: number;
      matchMode: 'all' | 'any';
      action: 'approve' | 'reject';
      noteTemplate?: string;
      conditions: AutoApprovalRule['conditions'];
    }>
  ) {
    return apiClient.patch<{ message: string; autoApprovalRule: AutoApprovalRule | null }>(
      `/battle_reimbursements/${guildId}/auto_approval_rules/${ruleId}`,
      payload
    );
  },
  getEquipmentSummary(guildId: string, sessionId: string, includeRejected = false) {
    return apiClient.get<EquipmentSummary>(`/battle_reimbursements/${guildId}/equipment_summary`, {
      sessionId,
      includeRejected,
    });
  },
};
