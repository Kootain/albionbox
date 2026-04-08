import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import app from '../src/index.ts'

class MockD1PreparedStatement {
  constructor(database, statement, params = []) {
    this.database = database
    this.statement = statement
    this.params = params
  }

  bind(...params) {
    return new MockD1PreparedStatement(this.database, this.statement, params)
  }

  async all() {
    return {
      results: this.database.prepare(this.statement).all(...this.params),
      success: true,
      meta: {
        changes: 0,
      },
    }
  }

  async raw() {
    const statement = this.database.prepare(this.statement)
    statement.setReturnArrays(true)
    return statement.all(...this.params)
  }

  async run() {
    const result = this.database.prepare(this.statement).run(...this.params)
    return {
      success: true,
      meta: result,
      results: [],
    }
  }
}

class MockD1Database {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:')
    this.sqlite.exec('PRAGMA foreign_keys = ON;')
  }

  prepare(statement) {
    return new MockD1PreparedStatement(this.sqlite, statement)
  }

  async batch(statements) {
    const results = []

    for (const statement of statements) {
      results.push(await statement.all())
    }

    return results
  }
}

class MockKVNamespace {
  constructor() {
    this.storage = new Map()
  }

  async put(key, value) {
    this.storage.set(key, value)
  }

  async get(key, type) {
    const value = this.storage.get(key)

    if (value === undefined) {
      return null
    }

    if (type === 'json') {
      return JSON.parse(value)
    }

    return value
  }

  async delete(key) {
    this.storage.delete(key)
  }
}

const projectRoot = resolve(import.meta.dirname, '../../..')
const migrationsDir = join(projectRoot, 'packages/db/migrations')

const applyMigrations = (database) => {
  const migrationFiles = readdirSync(migrationsDir)
    .filter((fileName) => /^\d+.*\.sql$/.test(fileName))
    .sort()

  for (const fileName of migrationFiles) {
    const migrationSql = readFileSync(join(migrationsDir, fileName), 'utf8')
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean)

    for (const statement of statements) {
      database.sqlite.exec(statement)
    }
  }
}

const createTestEnv = () => {
  const DB = new MockD1Database()
  const KV = new MockKVNamespace()
  applyMigrations(DB)

  return {
    DB,
    KV,
  }
}

const createJsonRequest = (path, init = {}) =>
  new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
    },
  })

const requestJson = async (env, path, init = {}) => {
  const response = await app.fetch(createJsonRequest(path, init), env)
  const body = await response.json()

  return {
    status: response.status,
    body,
  }
}

const requestJsonWithSession = async (env, sessionToken, path, init = {}) =>
  requestJson(env, path, {
    ...init,
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      ...(init.headers ?? {}),
    },
  })

const createRegisterCodeKey = (email) => `email_code:register:${email.toLowerCase()}`
const createResetCodeKey = (email) => `email_code:reset:${email.toLowerCase()}`
const getStoredCode = (kv, key) => JSON.parse(kv.storage.get(key)).code

const registerUser = async (env, email, password) => {
  const sendCodeResult = await requestJson(env, '/api/users/auth/send_register_code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  assert.equal(sendCodeResult.status, 200)

  const registerResult = await requestJson(env, '/api/users/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      code: getStoredCode(env.KV, createRegisterCodeKey(email)),
      password,
    }),
  })

  assert.equal(registerResult.status, 200)

  return registerResult.body
}

const createGameAccountApplication = async (env, sessionToken, payload) => {
  const response = await requestJsonWithSession(env, sessionToken, '/api/users/game_account_applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  assert.equal(response.status, 200)

  return response.body.application
}

const reviewGameAccountApplication = async (env, adminSessionToken, applicationId, status = 'approved') => {
  const response = await requestJsonWithSession(
    env,
    adminSessionToken,
    `/api/users/admin/game_account_applications/${applicationId}/review`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    }
  )

  assert.equal(response.status, 200)

  return response.body
}

test('任务5核心模块烟雾验证', async () => {
  const env = createTestEnv()

  const adminUser = await registerUser(env, 'admin@example.com', 'Password123')
  env.DB.sqlite.prepare('update users set is_admin = 1 where id = ?').run(adminUser.user.id)
  const adminSessionToken = adminUser.sessionToken

  const playerUser = await registerUser(env, 'player@example.com', 'Password123')
  const playerSessionToken = playerUser.sessionToken

  const oauthBindResult = await requestJsonWithSession(env, playerSessionToken, '/api/users/oauth_accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'discord',
      providerAccountId: 'discord-player-1',
      providerAccountName: 'Player One',
    }),
  })

  assert.equal(oauthBindResult.status, 200)
  assert.equal(oauthBindResult.body.oauthAccounts.length, 1)

  const oauthUnbindResult = await requestJsonWithSession(env, playerSessionToken, '/api/users/oauth_accounts/discord', {
    method: 'DELETE',
  })

  assert.equal(oauthUnbindResult.status, 200)
  assert.equal(oauthUnbindResult.body.oauthAccounts[0].status, 'unbound')

  const sendResetCodeResult = await requestJson(env, '/api/users/auth/send_reset_code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'player@example.com' }),
  })

  assert.equal(sendResetCodeResult.status, 200)

  const resetPasswordResult = await requestJson(env, '/api/users/auth/reset_password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'player@example.com',
      code: getStoredCode(env.KV, createResetCodeKey('player@example.com')),
      newPassword: 'Password456',
    }),
  })

  assert.equal(resetPasswordResult.status, 200)

  const loginResult = await requestJson(env, '/api/users/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'player@example.com',
      password: 'Password456',
    }),
  })

  assert.equal(loginResult.status, 200)
  const playerSessionTokenAfterReset = loginResult.body.sessionToken

  const playerApplicationA = await createGameAccountApplication(env, playerSessionTokenAfterReset, {
    server: 'europe',
    gameAccountId: 'acct-player-1',
    gameCharacterName: 'PlayerMain',
  })
  const playerApplicationB = await createGameAccountApplication(env, playerSessionTokenAfterReset, {
    server: 'europe',
    gameAccountId: 'acct-player-2',
    gameCharacterName: 'PlayerAlt',
  })

  await reviewGameAccountApplication(env, adminSessionToken, playerApplicationA.id)
  await reviewGameAccountApplication(env, adminSessionToken, playerApplicationB.id)

  const gameCharactersResult = await requestJsonWithSession(env, playerSessionTokenAfterReset, '/api/users/game_characters')
  assert.equal(gameCharactersResult.status, 200)
  assert.equal(gameCharactersResult.body.gameCharacters.length, 2)

  const altCharacter = gameCharactersResult.body.gameCharacters.find(
    (gameCharacter) => gameCharacter.gameAccountId === 'acct-player-2'
  )

  const switchCharacterResult = await requestJsonWithSession(env, playerSessionTokenAfterReset, '/api/users/game_characters/switch_current', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gameCharacterId: altCharacter.id,
    }),
  })

  assert.equal(switchCharacterResult.status, 200)
  assert.equal(switchCharacterResult.body.user.currentGameCharacterId, altCharacter.id)

  const guildApplicationResult = await requestJsonWithSession(env, playerSessionTokenAfterReset, '/api/guilds/registration_applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      guildName: 'Albion Box',
      server: 'europe',
    }),
  })

  assert.equal(guildApplicationResult.status, 200)

  const guildReviewResult = await requestJsonWithSession(
    env,
    adminSessionToken,
    `/api/guilds/admin/registration_applications/${guildApplicationResult.body.application.id}/review`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'approved' }),
    }
  )

  assert.equal(guildReviewResult.status, 200)
  const guildId = guildReviewResult.body.guild.id

  const createRoleResult = await requestJsonWithSession(env, playerSessionTokenAfterReset, `/api/guilds/${guildId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roleName: '补装查看',
      permissionKeys: ['reimbursement:view_summary', 'guild:view'],
    }),
  })

  assert.equal(createRoleResult.status, 200)
  const viewerRoleId = createRoleResult.body.role.id

  const memberUser = await registerUser(env, 'member@example.com', 'Password123')
  const memberApplication = await createGameAccountApplication(env, memberUser.sessionToken, {
    server: 'europe',
    gameAccountId: 'acct-member-1',
    gameCharacterName: 'MemberOne',
  })

  await reviewGameAccountApplication(env, adminSessionToken, memberApplication.id)

  const memberCharactersResult = await requestJsonWithSession(env, memberUser.sessionToken, '/api/users/game_characters')
  assert.equal(memberCharactersResult.status, 200)
  const memberCharacterId = memberCharactersResult.body.gameCharacters[0].id

  const addMemberResult = await requestJsonWithSession(env, playerSessionTokenAfterReset, `/api/guilds/${guildId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bindingType: 'game_character',
      gameCharacterId: memberCharacterId,
      roleIds: [viewerRoleId],
    }),
  })

  assert.equal(addMemberResult.status, 200)
  const guildMemberId = addMemberResult.body.member.id

  const updateBoxResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/guilds/${guildId}/members/${guildMemberId}/box_coordinate`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinateX: 7,
        coordinateY: 12,
      }),
    }
  )

  assert.equal(updateBoxResult.status, 200)

  const importBattleRecordsResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/battle_reimbursements/${guildId}/battle_records/import`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            externalRecordId: 'kill-1',
            battleName: 'Red Zone Fight',
            source: 'manual',
            occurredAt: '2026-04-05T10:00:00.000Z',
            isDeath: true,
            gameCharacterId: memberCharacterId,
            victimCharacterName: 'MemberOne',
            totalEstimatedValue: 500000,
            equipmentItems: [
              {
                itemKey: 'T8_BAG',
                itemName: 'T8 Bag',
                tier: 8,
                enchantmentLevel: 0,
                quantity: 1,
              },
            ],
          },
          {
            externalRecordId: 'kill-2',
            battleName: 'Black Zone Fight',
            source: 'manual',
            occurredAt: '2026-04-05T11:00:00.000Z',
            isDeath: true,
            gameCharacterId: memberCharacterId,
            victimCharacterName: 'MemberOne',
            totalEstimatedValue: 800000,
            equipmentItems: [
              {
                itemKey: 'T6_CAPE',
                itemName: 'T6 Cape',
                tier: 6,
                enchantmentLevel: 1,
                quantity: 2,
              },
            ],
          },
        ],
      }),
    }
  )

  assert.equal(importBattleRecordsResult.status, 200)
  assert.equal(importBattleRecordsResult.body.summary.createdCount, 2)

  const createRuleResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/battle_reimbursements/${guildId}/auto_approval_rules`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ruleName: '拒绝背包补装',
        enabled: true,
        priority: 1,
        matchMode: 'all',
        action: 'reject',
        noteTemplate: '背包装备不补装',
        conditions: {
          equipmentKeys: ['T8_BAG'],
        },
      }),
    }
  )

  assert.equal(createRuleResult.status, 200)

  const createSessionResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/battle_reimbursements/${guildId}/reimbursement_sessions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '4月5日补装',
        description: '任务5自动化验证',
        battleRecordIds: importBattleRecordsResult.body.battleRecords.map((battleRecord) => battleRecord.id),
      }),
    }
  )

  assert.equal(createSessionResult.status, 200)

  const sessionDetail = createSessionResult.body.reimbursementSession
  const rejectedRecord = sessionDetail.reimbursementRecords.find((record) => record.autoDecision === 'rejected')
  const pendingRecord = sessionDetail.reimbursementRecords.find((record) => record.status === 'pending_submission')

  assert.ok(rejectedRecord)
  assert.ok(pendingRecord)
  assert.equal(rejectedRecord.status, 'rejected')
  assert.ok(rejectedRecord.logs.some((log) => log.actionType === 'auto_rule'))

  const updateRecordStatusResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/battle_reimbursements/${guildId}/reimbursement_records/${pendingRecord.id}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'approved',
        reimbursementAmount: 600000,
        note: '人工审批通过',
      }),
    }
  )

  assert.equal(updateRecordStatusResult.status, 200)
  assert.equal(updateRecordStatusResult.body.reimbursementRecord.status, 'approved')
  assert.ok(updateRecordStatusResult.body.logs.some((log) => log.actionType === 'manual_review'))

  const summaryResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/battle_reimbursements/${guildId}/equipment_summary?sessionId=${sessionDetail.session.id}&includeRejected=false`
  )

  assert.equal(summaryResult.status, 200)
  assert.equal(summaryResult.body.overall.length, 1)
  assert.equal(summaryResult.body.overall[0].itemKey, 'T6_CAPE')
  assert.equal(summaryResult.body.overall[0].totalQuantity, 2)
  assert.equal(summaryResult.body.byMember[0].boxCoordinate.coordinateX, 7)

  const guildSnapshotResult = await requestJsonWithSession(env, playerSessionTokenAfterReset, `/api/guilds/${guildId}`)
  assert.equal(guildSnapshotResult.status, 200)
  assert.equal(guildSnapshotResult.body.members.length, 2)

  const reimbursementSessionsResult = await requestJsonWithSession(
    env,
    playerSessionTokenAfterReset,
    `/api/battle_reimbursements/${guildId}/reimbursement_sessions`
  )

  assert.equal(reimbursementSessionsResult.status, 200)
  assert.equal(reimbursementSessionsResult.body.reimbursementSessions.length, 1)
  assert.equal(reimbursementSessionsResult.body.reimbursementSessions[0].progress.processed, 2)
})
