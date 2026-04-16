import { RegearRecord, RegearConfig } from '../types';
import { calculatePLevel } from '../utils';

export interface ApprovalContext {
  record: RegearRecord;
  config: RegearConfig;
  options: Record<string, any>;
  t: (key: string, options?: any) => string;
}

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
}

export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  evaluate: (ctx: ApprovalContext) => ApprovalResult;
}

// 自动审批模块核心引擎
export class AutoApprovalEngine {
  private rules: Map<string, ApprovalRule> = new Map();

  registerRule(rule: ApprovalRule) {
    this.rules.set(rule.id, rule);
  }

  getAvailableRules(): ApprovalRule[] {
    return Array.from(this.rules.values());
  }

  getRule(id: string): ApprovalRule | undefined {
    return this.rules.get(id);
  }

  evaluate(record: RegearRecord, config: RegearConfig, ruleId: string, options: Record<string, any>, t: (key: string, options?: any) => string): ApprovalResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return { approved: false, reason: t('guild_dashboard.regear_tab.auto_approval.rule_not_found', { defaultValue: `Rule ${ruleId} not found` }) };
    }
    return rule.evaluate({ record, config, options, t });
  }
}

export const engine = new AutoApprovalEngine();

// ==========================================
// 具体规则实现：最大P级规则 (max_plevel)
// ==========================================

export const maxPLevelRule: ApprovalRule = {
  id: 'max_plevel',
  name: 'Maximum P-Level',
  description: 'Auto-approve if all allowed equipment P-Levels are <= N',
  evaluate: (ctx: ApprovalContext) => {
    const maxAllowedPLevel = ctx.options.maxPLevel as number;
    if (maxAllowedPLevel === undefined || maxAllowedPLevel === null) {
      return { approved: false, reason: ctx.t('guild_dashboard.regear_tab.auto_approval.max_plevel_not_configured', { defaultValue: 'maxPLevel not configured' }) };
    }

    const { record, config, t } = ctx;
    
    // Check if any required/allowed equipment exceeds the max P-Level
    for (const eq of record.equipment) {
      if (config.allowedSlots.includes(eq.slot)) {
        const pLevel = calculatePLevel(eq.type);
        if (pLevel > maxAllowedPLevel) {
          return { 
            approved: false, 
            reason: t('guild_dashboard.regear_tab.auto_approval.max_plevel_exceeded', { 
              defaultValue: `Equipment in ${eq.slot} has P-Level ${pLevel} > ${maxAllowedPLevel}`,
              slot: t(`guild_dashboard.regear_tab.slots.${eq.slot}`, { defaultValue: eq.slot }),
              pLevel,
              maxAllowedPLevel
            })
          };
        }
      }
    }

    return { 
      approved: true, 
      reason: t('guild_dashboard.regear_tab.auto_approval.max_plevel_success', { 
        defaultValue: `Auto-approved by max_plevel rule: all equipment P-Level <= ${maxAllowedPLevel}`,
        maxAllowedPLevel
      })
    };
  }
};

// 注册规则
engine.registerRule(maxPLevelRule);
