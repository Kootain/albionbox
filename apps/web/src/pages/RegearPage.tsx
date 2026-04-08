import { useCallback, useEffect, useState } from 'react';
import { EmptyState, Field, PageHeader, Panel, StatusBadge } from '../components/ui';
import { useActiveGuild } from '../hooks/useActiveGuild';
import { reimbursementsApi } from '../modules/reimbursements/api';
import type { AutoApprovalRule, BattleRecord, EquipmentSummary, SessionDetail, ReimbursementSession } from '../types/domain';

export const RegearPage = () => {
  const { guildId, setGuildId } = useActiveGuild();
  const [battleRecords, setBattleRecords] = useState<BattleRecord[]>([]);
  const [sessions, setSessions] = useState<ReimbursementSession[]>([]);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [rules, setRules] = useState<AutoApprovalRule[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedBattleRecordIds, setSelectedBattleRecordIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async (nextGuildId = guildId) => {
    if (!nextGuildId) {
      setBattleRecords([]);
      setSessions([]);
      setSessionDetail(null);
      setRules([]);
      setSummary(null);
      return;
    }

    const [battleResponse, sessionResponse, ruleResponse] = await Promise.all([
      reimbursementsApi.getBattleRecords(nextGuildId),
      reimbursementsApi.getSessions(nextGuildId),
      reimbursementsApi.getRules(nextGuildId),
    ]);

    setBattleRecords(battleResponse.battleRecords);
    setSessions(sessionResponse.reimbursementSessions);
    setRules(ruleResponse.autoApprovalRules);
  }, [guildId]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        await loadData();
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : '补装数据加载失败');
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [guildId, loadData]);

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      await loadData();
      if (selectedSessionId && guildId) {
        const [detailResponse, summaryResponse] = await Promise.all([
          reimbursementsApi.getSessionDetail(guildId, selectedSessionId),
          reimbursementsApi.getEquipmentSummary(guildId, selectedSessionId),
        ]);
        setSessionDetail(detailResponse.reimbursementSession);
        setSummary(summaryResponse);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader description="导入战斗记录、创建补装 session、审批补装记录并管理自动审批规则。" title="补装管理" />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <Panel description="输入活跃工会 ID 后，即可加载工会下的战斗与补装数据。" title="工作区">
        <div className="inline-form">
          <input onChange={(event) => setGuildId(event.target.value)} placeholder="输入 guild_id" value={guildId} />
          <button className="button button-secondary" onClick={() => void loadData(guildId)} type="button">
            刷新数据
          </button>
          <button
            className="button button-primary"
            onClick={() =>
              void runAction(async () => {
                if (!guildId) {
                  throw new Error('请先输入 guild_id');
                }

                await reimbursementsApi.importBattleRecords(guildId, {
                  records: [
                    {
                      externalRecordId: `demo-${Date.now()}`,
                      battleName: 'Sample Battle',
                      source: 'manual',
                      occurredAt: new Date().toISOString(),
                      isDeath: true,
                      victimCharacterName: 'Unknown',
                      totalEstimatedValue: 120000,
                      equipmentItems: [
                        {
                          itemKey: 't8_broadsword',
                          itemName: 'T8 Broadsword',
                          tier: 8,
                          enchantmentLevel: 1,
                          quantity: 1,
                        },
                      ],
                    },
                  ],
                });

                setMessage('已导入一条示例战斗记录');
              })
            }
            type="button"
          >
            导入示例战斗
          </button>
        </div>
      </Panel>

      <div className="two-column">
        <Panel description="勾选战斗记录后可快速生成补装 session。" title="战斗记录">
          {battleRecords.length ? (
            <>
              <div className="list-stack">
                {battleRecords.map((record) => (
                  <label className="select-card" key={record.id}>
                    <input
                      checked={selectedBattleRecordIds.includes(record.id)}
                      onChange={(event) =>
                        setSelectedBattleRecordIds((current) =>
                          event.target.checked ? [...current, record.id] : current.filter((item) => item !== record.id)
                        )
                      }
                      type="checkbox"
                    />
                    <div>
                      <strong>{record.battleName ?? record.externalRecordId}</strong>
                      <p className="muted">
                        {record.victimCharacterName} · {record.totalEstimatedValue.toLocaleString()} 银币
                      </p>
                    </div>
                    <StatusBadge status={record.reimbursementSessionId ? 'approved' : 'pending'} />
                  </label>
                ))}
              </div>
              <button
                className="button button-primary button-block"
                onClick={() =>
                  void runAction(async () => {
                    if (!guildId) {
                      throw new Error('请先输入 guild_id');
                    }
                    if (selectedBattleRecordIds.length === 0) {
                      throw new Error('请至少选择一条战斗记录');
                    }
                    const response = await reimbursementsApi.createSession(guildId, {
                      title: `Session ${new Date().toLocaleTimeString()}`,
                      description: '由前端快速创建',
                      battleRecordIds: selectedBattleRecordIds,
                    });
                    setMessage(response.message);
                    setSelectedBattleRecordIds([]);
                  })
                }
                type="button"
              >
                创建补装 Session
              </button>
            </>
          ) : (
            <EmptyState description="先导入战斗记录，或在后端已有数据时直接刷新。" title="暂无战斗记录" />
          )}
        </Panel>

        <Panel description="选择一个 Session 查看详情、汇总和审批记录。" title="补装 Session">
          {sessions.length ? (
            <>
              <Field label="选择 Session">
                <select
                  onChange={async (event) => {
                    const nextSessionId = event.target.value;
                    setSelectedSessionId(nextSessionId);

                    if (!guildId || !nextSessionId) {
                      setSessionDetail(null);
                      setSummary(null);
                      return;
                    }

                    const [detailResponse, summaryResponse] = await Promise.all([
                      reimbursementsApi.getSessionDetail(guildId, nextSessionId),
                      reimbursementsApi.getEquipmentSummary(guildId, nextSessionId),
                    ]);
                    setSessionDetail(detailResponse.reimbursementSession);
                    setSummary(summaryResponse);
                  }}
                  value={selectedSessionId}
                >
                  <option value="">请选择</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </select>
              </Field>

              {sessionDetail ? (
                <div className="list-stack">
                  <article className="list-card">
                    <div>
                      <strong>{sessionDetail.session.title}</strong>
                      <p className="muted">{sessionDetail.session.description ?? '暂无描述'}</p>
                    </div>
                    <div className="list-card-meta">
                      <StatusBadge status={sessionDetail.session.status} />
                      <small>{sessionDetail.progress.progressPercent}%</small>
                    </div>
                  </article>

                  {sessionDetail.reimbursementRecords.map((record) => (
                    <article className="list-card" key={record.id}>
                      <div>
                        <strong>{record.gameCharacter?.characterName ?? record.battleRecord?.victimCharacterName ?? record.id}</strong>
                        <p className="muted">{record.latestNote ?? '暂无备注'}</p>
                      </div>
                      <div className="list-card-meta">
                        <StatusBadge status={record.status} />
                        <button
                          className="button button-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              if (!guildId) {
                                throw new Error('请先输入 guild_id');
                              }
                              const response = await reimbursementsApi.updateRecordStatus(guildId, record.id, {
                                status: record.status === 'approved' ? 'completed' : 'approved',
                                reimbursementAmount: record.reimbursementAmount ?? record.battleRecord?.totalEstimatedValue ?? 0,
                                note: '由前端快捷审批',
                              });
                              setMessage(response.message);
                            })
                          }
                          type="button"
                        >
                          {record.status === 'approved' ? '标记完成' : '批准'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState description="选择一个 session 后会显示补装记录详情。" title="未选择 Session" />
              )}
            </>
          ) : (
            <EmptyState description="创建补装 session 后会在这里出现。" title="暂无补装 Session" />
          )}
        </Panel>
      </div>

      <div className="two-column">
        <Panel description="创建或查看自动审批规则。" title="自动审批规则">
          {rules.length ? (
            <div className="list-stack">
              {rules.map((rule) => (
                <article className="list-card" key={rule.id}>
                  <div>
                    <strong>{rule.ruleName}</strong>
                    <p className="muted">
                      {rule.action} · priority {rule.priority}
                    </p>
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={rule.enabled ? 'approved' : 'rejected'} />
                    <button
                      className="button button-ghost"
                      onClick={() =>
                        void runAction(async () => {
                          if (!guildId) {
                            throw new Error('请先输入 guild_id');
                          }
                          const response = await reimbursementsApi.updateRule(guildId, rule.id, { enabled: !rule.enabled });
                          setMessage(response.message);
                        })
                      }
                      type="button"
                    >
                      切换启用
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState description="你可以在有权限的工会中创建自动审批规则。" title="暂无自动审批规则" />
          )}

          <button
            className="button button-secondary button-block"
            onClick={() =>
              void runAction(async () => {
                if (!guildId) {
                  throw new Error('请先输入 guild_id');
                }
                const response = await reimbursementsApi.createRule(guildId, {
                  ruleName: `规则 ${Date.now()}`,
                  enabled: true,
                  priority: 100,
                  matchMode: 'all',
                  action: 'approve',
                  noteTemplate: '自动审批：低估值',
                  conditions: { maxEstimatedValue: 200000 },
                });
                setMessage(response.message);
              })
            }
            type="button"
          >
            创建示例规则
          </button>
        </Panel>

        <Panel description="按照 P 级与成员视角展示装备补装需求。" title="装备汇总">
          {summary ? (
            <div className="list-stack">
              {summary.overall.map((item) => (
                <article className="list-card" key={`${item.itemKey}-${item.pLevel}`}>
                  <div>
                    <strong>
                      {item.itemName} · {item.pLevelLabel}
                    </strong>
                    <p className="muted">
                      数量 {item.totalQuantity} · 涉及 {item.memberCount} 人
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState description="选择 session 后会展示整体装备统计与按成员分组的需求。" title="暂无汇总" />
          )}
        </Panel>
      </div>
    </div>
  );
};
