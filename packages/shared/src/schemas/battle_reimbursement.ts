import { z } from 'zod';

export const BattleImportSourceSchema = z.enum(['albion_killboard', 'manual', 'custom']);
export const ReimbursementSessionStatusSchema = z.enum(['open', 'completed', 'closed']);
export const ReimbursementRecordStatusSchema = z.enum([
  'pending_submission',
  'pending_review',
  'approved',
  'rejected',
  'completed',
]);
export const AutoApprovalActionSchema = z.enum(['approve', 'reject']);
export const AutoApprovalMatchModeSchema = z.enum(['all', 'any']);

const DateTimeStringSchema = z
  .string()
  .trim()
  .min(1, '时间不能为空')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), '时间格式无效');

const UniqueStringArraySchema = z
  .array(z.string().trim().min(1, 'ID 不能为空'))
  .min(1, '至少选择一条记录')
  .refine((value) => new Set(value).size === value.length, 'ID 不能重复');

const UniqueEquipmentKeyArraySchema = z
  .array(z.string().trim().min(1, '装备标识不能为空'))
  .max(200, '装备数量不能超过 200 个')
  .refine((value) => new Set(value).size === value.length, '装备标识不能重复');

export const BattleEquipmentItemSchema = z.object({
  itemKey: z.string().trim().min(1, '装备标识不能为空').max(128, '装备标识过长'),
  itemName: z.string().trim().min(1, '装备名称不能为空').max(128, '装备名称过长'),
  slot: z.string().trim().max(64, '装备槽位过长').optional(),
  tier: z.number().int('装备阶级必须为整数').min(1, '装备阶级不能小于 1').max(8, '装备阶级不能大于 8'),
  enchantmentLevel: z
    .number()
    .int('附魔等级必须为整数')
    .min(0, '附魔等级不能小于 0')
    .max(4, '附魔等级不能大于 4'),
  quantity: z.number().int('装备数量必须为整数').min(1, '装备数量至少为 1').max(999, '装备数量过大').default(1),
});

export const ImportBattleRecordItemSchema = z.object({
  externalRecordId: z.string().trim().min(1, '外部记录 ID 不能为空').max(128, '外部记录 ID 过长'),
  externalBattleId: z.string().trim().max(128, '外部战斗 ID 过长').optional(),
  battleName: z.string().trim().max(128, '战斗名称过长').optional(),
  source: BattleImportSourceSchema.default('custom'),
  occurredAt: DateTimeStringSchema,
  isDeath: z.boolean().default(true),
  gameCharacterId: z.string().trim().min(1, '游戏角色 ID 不能为空').optional(),
  victimGameAccountId: z.string().trim().max(64, '游戏账号 ID 过长').optional(),
  victimCharacterName: z.string().trim().min(1, '死亡角色名不能为空').max(64, '死亡角色名过长'),
  totalEstimatedValue: z.number().int('估值必须为整数').min(0, '估值不能小于 0').max(1_000_000_000, '估值过大').optional(),
  tags: z.array(z.string().trim().min(1, '标签不能为空').max(32, '标签过长')).max(20, '标签数量不能超过 20').optional(),
  equipmentItems: z.array(BattleEquipmentItemSchema).min(1, '至少需要一条装备数据').max(50, '装备数据过多'),
});

export const ImportBattleRecordsSchema = z.object({
  records: z
    .array(ImportBattleRecordItemSchema)
    .min(1, '至少导入一条战斗记录')
    .max(200, '单次最多导入 200 条战斗记录')
    .refine(
      (records) => new Set(records.map((record) => record.externalRecordId)).size === records.length,
      'externalRecordId 不能重复'
    ),
});

export const QueryBattleRecordsSchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId 不能为空').optional(),
  linkStatus: z.enum(['linked', 'unlinked']).optional(),
});

export const CreateReimbursementSessionSchema = z.object({
  title: z.string().trim().min(2, 'session 标题至少需要 2 个字符').max(128, 'session 标题不能超过 128 个字符'),
  description: z.string().trim().max(500, 'session 描述过长').optional(),
  battleRecordIds: UniqueStringArraySchema.max(500, '战斗记录数量不能超过 500 条'),
});

export const UpdateReimbursementSessionSchema = z
  .object({
    title: z.string().trim().min(2, 'session 标题至少需要 2 个字符').max(128, 'session 标题不能超过 128 个字符').optional(),
    description: z.string().trim().max(500, 'session 描述过长').optional(),
    status: ReimbursementSessionStatusSchema.optional(),
    battleRecordIds: UniqueStringArraySchema.max(500, '战斗记录数量不能超过 500 条').optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.description !== undefined || value.status !== undefined || value.battleRecordIds !== undefined,
    '至少提供一个更新字段'
  );

export const QueryReimbursementSessionsSchema = z.object({
  status: ReimbursementSessionStatusSchema.optional(),
});

export const UpdateReimbursementRecordStatusSchema = z.object({
  status: ReimbursementRecordStatusSchema,
  reimbursementAmount: z.number().int('补装金额必须为整数').min(0, '补装金额不能小于 0').max(1_000_000_000, '补装金额过大').optional(),
  note: z.string().trim().max(500, '审批备注过长').optional(),
});

export const AutoApprovalConditionSchema = z
  .object({
    minEstimatedValue: z.number().int('最小估值必须为整数').min(0, '最小估值不能小于 0').optional(),
    maxEstimatedValue: z.number().int('最大估值必须为整数').min(0, '最大估值不能小于 0').optional(),
    memberIds: z
      .array(z.string().trim().min(1, '成员 ID 不能为空'))
      .max(200, '成员 ID 数量不能超过 200 个')
      .refine((value) => new Set(value).size === value.length, '成员 ID 不能重复')
      .optional(),
    gameCharacterIds: z
      .array(z.string().trim().min(1, '游戏角色 ID 不能为空'))
      .max(200, '游戏角色 ID 数量不能超过 200 个')
      .refine((value) => new Set(value).size === value.length, '游戏角色 ID 不能重复')
      .optional(),
    equipmentKeys: UniqueEquipmentKeyArraySchema.optional(),
    pLevels: z
      .array(z.number().int('P 级必须为整数').min(1, 'P 级不能小于 1').max(12, 'P 级不能大于 12'))
      .max(50, 'P 级数量不能超过 50 个')
      .refine((value) => new Set(value).size === value.length, 'P 级不能重复')
      .optional(),
  })
  .refine(
    (value) =>
      value.minEstimatedValue === undefined ||
      value.maxEstimatedValue === undefined ||
      value.minEstimatedValue <= value.maxEstimatedValue,
    '最小估值不能大于最大估值'
  );

export const CreateAutoApprovalRuleSchema = z.object({
  ruleName: z.string().trim().min(2, '规则名称至少需要 2 个字符').max(64, '规则名称不能超过 64 个字符'),
  description: z.string().trim().max(500, '规则描述过长').optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int('优先级必须为整数').min(1, '优先级不能小于 1').max(9999, '优先级过大').default(100),
  matchMode: AutoApprovalMatchModeSchema.default('all'),
  action: AutoApprovalActionSchema,
  noteTemplate: z.string().trim().max(500, '规则备注模板过长').optional(),
  conditions: AutoApprovalConditionSchema,
});

export const UpdateAutoApprovalRuleSchema = z
  .object({
    ruleName: z.string().trim().min(2, '规则名称至少需要 2 个字符').max(64, '规则名称不能超过 64 个字符').optional(),
    description: z.string().trim().max(500, '规则描述过长').optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int('优先级必须为整数').min(1, '优先级不能小于 1').max(9999, '优先级过大').optional(),
    matchMode: AutoApprovalMatchModeSchema.optional(),
    action: AutoApprovalActionSchema.optional(),
    noteTemplate: z.string().trim().max(500, '规则备注模板过长').optional(),
    conditions: AutoApprovalConditionSchema.optional(),
  })
  .refine(
    (value) =>
      value.ruleName !== undefined ||
      value.description !== undefined ||
      value.enabled !== undefined ||
      value.priority !== undefined ||
      value.matchMode !== undefined ||
      value.action !== undefined ||
      value.noteTemplate !== undefined ||
      value.conditions !== undefined,
    '至少提供一个更新字段'
  );

export const QueryEquipmentSummarySchema = z.object({
  sessionId: z.string().trim().min(1, 'sessionId 不能为空'),
  includeRejected: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
