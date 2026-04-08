export type ApiError = {
  error: string;
};

export type Server = 'asia' | 'europe' | 'america';
export type Provider = 'kook' | 'discord';

export type UserContext = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    currentGameCharacterId: string | null;
    isAdmin: boolean;
    createdAt: string;
    updatedAt: string;
  };
  roleContext: GameCharacter | null;
  oauthAccounts: OauthAccount[];
  gameCharacters: GameCharacter[];
  gameAccountApplications: GameAccountApplication[];
};

export type AuthResponse = UserContext & {
  message: string;
  sessionToken: string;
};

export type OauthAccount = {
  id: string;
  userId: string;
  provider: Provider;
  providerAccountId: string | null;
  providerAccountName: string | null;
  status: 'active' | 'unbound';
  lastBoundAt: string;
  unboundAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GameCharacter = {
  id: string;
  applicationId: string;
  userId: string;
  server: Server;
  gameAccountId: string;
  characterName: string | null;
  approvedAt: string;
  createdAt: string;
};

export type GameAccountApplication = {
  id: string;
  userId: string;
  server: Server;
  gameAccountId: string;
  gameCharacterName: string | null;
  bindingToken: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuildRegistrationApplication = {
  id: string;
  applicantUserId: string;
  guildName: string;
  server: Server;
  bindingToken: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuildPermissionKey =
  | 'guild:view'
  | 'guild:manage_roles'
  | 'guild:manage_members'
  | 'guild:manage_boxes'
  | 'battle:manage_records'
  | 'reimbursement:manage_sessions'
  | 'reimbursement:view_summary';

export type GuildPermission = {
  id: string;
  guildId: string;
  permissionKey: GuildPermissionKey;
  permissionName: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
};

export type GuildRole = {
  id: string;
  guildId: string;
  roleName: string;
  isSystem: boolean;
  isDefaultAdmin: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: GuildPermission[];
  permissionKeys: GuildPermissionKey[];
};

export type GuildMember = {
  id: string;
  guildId: string;
  bindingType: 'platform_user' | 'game_character';
  platformUserId: string | null;
  gameCharacterId: string | null;
  invitedByUserId: string | null;
  status: 'active' | 'inactive';
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  roleIds: string[];
  roles: GuildRole[];
  platformUser: UserContext['user'] | null;
  gameCharacter: GameCharacter | null;
  boxCoordinate: GuildMemberBox | null;
};

export type GuildMemberBox = {
  id: string;
  guildMemberId: string;
  coordinateX: number;
  coordinateY: number;
  updatedAt: string;
};

export type GuildSnapshot = {
  guild: {
    id: string;
    applicationId: string;
    ownerUserId: string;
    guildName: string;
    server: Server;
    bindingToken: string;
    status: 'active' | 'archived';
    createdAt: string;
    updatedAt: string;
  };
  permissions: GuildPermission[];
  roles: GuildRole[];
  members: GuildMember[];
};

export type BattleEquipmentItem = {
  itemKey: string;
  itemName: string;
  slot?: string;
  tier: number;
  enchantmentLevel: number;
  quantity: number;
};

export type BattleRecord = {
  id: string;
  guildId: string;
  importedByUserId: string;
  externalRecordId: string;
  externalBattleId: string | null;
  battleName: string | null;
  source: 'albion_killboard' | 'manual' | 'custom';
  occurredAt: string;
  isDeath: boolean;
  reimbursementSessionId: string | null;
  guildMemberId: string | null;
  gameCharacterId: string | null;
  victimGameAccountId: string | null;
  victimCharacterName: string;
  totalEstimatedValue: number;
  equipmentItemsJson: string;
  tagsJson: string | null;
  createdAt: string;
  updatedAt: string;
  equipmentItems: BattleEquipmentItem[];
  tags: string[];
  linkedSession?: {
    session: ReimbursementSession | null;
    progress: ReimbursementProgress | null;
  } | null;
};

export type ReimbursementProgress = {
  total: number;
  pendingSubmission: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  completed: number;
  processed: number;
  progressPercent: number;
};

export type ReimbursementSession = {
  id: string;
  guildId: string;
  title: string;
  description: string | null;
  status: 'open' | 'completed' | 'closed';
  createdByUserId: string;
  closedByUserId: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: ReimbursementProgress;
};

export type ReimbursementRecord = {
  id: string;
  guildId: string;
  sessionId: string;
  battleRecordId: string;
  guildMemberId: string | null;
  gameCharacterId: string | null;
  applicantUserId: string | null;
  status: 'pending_submission' | 'pending_review' | 'approved' | 'rejected' | 'completed';
  autoDecision: 'none' | 'approved' | 'rejected';
  reimbursementAmount: number | null;
  latestNote: string | null;
  lastReviewedBy: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  battleRecord: BattleRecord | null;
  guildMember: GuildMember | null;
  boxCoordinate: GuildMemberBox | null;
  gameCharacter: GameCharacter | null;
  logs: ReimbursementLog[];
};

export type ReimbursementLog = {
  id: string;
  guildId: string;
  reimbursementRecordId: string;
  fromStatus: ReimbursementRecord['status'] | null;
  toStatus: ReimbursementRecord['status'];
  actionType: 'session_created' | 'manual_review' | 'auto_rule';
  operatedByUserId: string | null;
  autoApprovalRuleId: string | null;
  note: string | null;
  metadataJson: string | null;
  createdAt: string;
};

export type SessionDetail = {
  session: ReimbursementSession;
  progress: ReimbursementProgress;
  battleRecords: BattleRecord[];
  reimbursementRecords: ReimbursementRecord[];
};

export type AutoApprovalRule = {
  id: string;
  guildId: string;
  ruleName: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  matchMode: 'all' | 'any';
  action: 'approve' | 'reject';
  noteTemplate: string | null;
  conditionsJson: string;
  conditions: {
    minEstimatedValue?: number;
    maxEstimatedValue?: number;
    memberIds?: string[];
    gameCharacterIds?: string[];
    equipmentKeys?: string[];
    pLevels?: number[];
  };
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentSummary = {
  session: ReimbursementSession;
  progress: ReimbursementProgress;
  overall: Array<{
    itemKey: string;
    itemName: string;
    pLevel: number;
    pLevelLabel: string;
    totalQuantity: number;
    memberCount: number;
  }>;
  byMember: Array<{
    memberId: string | null;
    victimCharacterName: string;
    gameCharacterId: string | null;
    boxCoordinate: GuildMemberBox | null;
    items: Array<{
      itemKey: string;
      itemName: string;
      pLevel: number;
      quantity: number;
    }>;
  }>;
};
