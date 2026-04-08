import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AddGuildMemberSchema, CreateGuildRegistrationApplicationSchema, CreateGuildRoleSchema } from '@albionbox/shared';
import { EmptyState, Field, PageHeader, Panel, StatusBadge } from '../components/ui';
import { useActiveGuild } from '../hooks/useActiveGuild';
import { formatDateTime, formatPermissionLabel } from '../lib/utils';
import { guildsApi } from '../modules/guilds/api';
import type { GuildSnapshot } from '../types/domain';

type GuildApplicationValues = { guildName: string; server: 'asia' | 'europe' | 'america' };
type GuildRoleValues = {
  roleName: string;
  permissionKeys: Array<
    | 'guild:view'
    | 'guild:manage_roles'
    | 'guild:manage_members'
    | 'guild:manage_boxes'
    | 'battle:manage_records'
    | 'reimbursement:manage_sessions'
    | 'reimbursement:view_summary'
  >;
};
type GuildMemberValues = {
  bindingType: 'platform_user' | 'game_character';
  userId?: string;
  gameCharacterId?: string;
  roleIds?: string[];
};

export const GuildsPage = () => {
  const { guildId, setGuildId } = useActiveGuild();
  const [applications, setApplications] = useState<Awaited<ReturnType<typeof guildsApi.getMyApplications>>['guildRegistrationApplications']>([]);
  const [guildSnapshot, setGuildSnapshot] = useState<GuildSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<GuildRoleValues['permissionKeys']>(['guild:view']);
  const [memberBindingType, setMemberBindingType] = useState<GuildMemberValues['bindingType']>('platform_user');

  const applicationForm = useForm<GuildApplicationValues>({
    resolver: zodResolver(CreateGuildRegistrationApplicationSchema),
    defaultValues: { guildName: '', server: 'asia' },
  });
  const roleForm = useForm<GuildRoleValues>({
    resolver: zodResolver(CreateGuildRoleSchema),
    defaultValues: { roleName: '', permissionKeys: ['guild:view'] },
  });
  const memberForm = useForm<GuildMemberValues>({
    resolver: zodResolver(AddGuildMemberSchema),
    defaultValues: { bindingType: 'platform_user', userId: '', gameCharacterId: '', roleIds: [] },
  });

  const loadApplications = useCallback(async () => {
    const response = await guildsApi.getMyApplications();
    setApplications(response.guildRegistrationApplications);
  }, []);

  const loadGuild = useCallback(async (nextGuildId = guildId) => {
    if (!nextGuildId) {
      setGuildSnapshot(null);
      return;
    }

    const response = await guildsApi.getGuild(nextGuildId);
    setGuildSnapshot(response);
    setGuildId(nextGuildId);
  }, [guildId, setGuildId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await loadApplications();
      } catch {
        if (!cancelled) {
          setApplications([]);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadApplications]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        await loadGuild();
      } catch {
        if (!cancelled) {
          setGuildSnapshot(null);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [guildId, loadGuild]);

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      await loadApplications();
      if (guildId) {
        await loadGuild();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        description="管理工会申请、加载指定工会详情，并在一个页面内维护角色、成员与箱子坐标。"
        title="工会管理"
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="two-column">
        <Panel description="提交工会注册申请，审核通过后可在下方输入工会 ID 加载详情。" title="工会注册申请">
          <form
            className="form-grid"
            onSubmit={applicationForm.handleSubmit(async (values) => {
              await runAction(async () => {
                const response = await guildsApi.createApplication(values);
                setMessage(response.message);
                applicationForm.reset({ guildName: '', server: values.server });
              });
            })}
          >
            <Field error={applicationForm.formState.errors.guildName?.message} label="工会名称">
              <input {...applicationForm.register('guildName')} placeholder="输入工会全称" />
            </Field>
            <Field error={applicationForm.formState.errors.server?.message} label="服务器">
              <select {...applicationForm.register('server')}>
                <option value="asia">亚服</option>
                <option value="europe">欧服</option>
                <option value="america">美服</option>
              </select>
            </Field>
            <button className="button button-primary" type="submit">
              提交申请
            </button>
          </form>

          <div className="list-stack">
            {applications.length ? (
              applications.map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>{item.guildName}</strong>
                    <p className="muted">
                      {item.server} · Token：{item.bindingToken}
                    </p>
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={item.status} />
                    <small>{formatDateTime(item.createdAt)}</small>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState description="提交后可在这里跟踪审核状态。" title="暂无工会申请" />
            )}
          </div>
        </Panel>

        <Panel description="由于当前后端尚未提供按用户列出工会入口，可先粘贴一个工会 ID 加载详情。" title="加载工会详情">
          <div className="inline-form">
            <input onChange={(event) => setGuildId(event.target.value)} placeholder="输入 guild_id" value={guildId} />
            <button className="button button-secondary" onClick={() => void loadGuild(guildId)} type="button">
              读取工会
            </button>
          </div>

          {guildSnapshot ? (
            <div className="definition-list">
              <div>
                <span>工会名称</span>
                <strong>{guildSnapshot.guild.guildName}</strong>
              </div>
              <div>
                <span>服务器</span>
                <strong>{guildSnapshot.guild.server}</strong>
              </div>
              <div>
                <span>成员数量</span>
                <strong>{guildSnapshot.members.length}</strong>
              </div>
              <div>
                <span>角色数量</span>
                <strong>{guildSnapshot.roles.length}</strong>
              </div>
            </div>
          ) : (
            <EmptyState description="加载后可继续管理角色、成员和箱子坐标。" title="尚未加载工会" />
          )}
        </Panel>
      </div>

      <div className="two-column">
        <Panel description="创建工会角色并绑定权限。" title="角色与权限">
          {guildSnapshot ? (
            <>
              <form
                className="form-grid"
                onSubmit={roleForm.handleSubmit(async (values) => {
                  await runAction(async () => {
                    const response = await guildsApi.createRole(guildSnapshot.guild.id, {
                      ...values,
                      permissionKeys: selectedPermissionKeys,
                    });
                    setMessage(response.message);
                    roleForm.reset({ roleName: '', permissionKeys: ['guild:view'] });
                    setSelectedPermissionKeys(['guild:view']);
                  });
                })}
              >
                <Field error={roleForm.formState.errors.roleName?.message} label="角色名称">
                  <input {...roleForm.register('roleName')} placeholder="例如 战斗官" />
                </Field>
                <Field error={roleForm.formState.errors.permissionKeys?.message?.toString()} label="权限">
                  <select
                    multiple
                    onChange={(event) =>
                      setSelectedPermissionKeys(
                        Array.from(event.currentTarget.selectedOptions).map((option) => option.value) as GuildRoleValues['permissionKeys']
                      )
                    }
                    value={selectedPermissionKeys}
                  >
                    {guildSnapshot.permissions.map((permission) => (
                      <option key={permission.id} value={permission.permissionKey}>
                        {formatPermissionLabel(permission.permissionKey)}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="button button-primary" type="submit">
                  新建角色
                </button>
              </form>

              <div className="list-stack">
                {guildSnapshot.roles.map((role) => (
                  <article className="list-card" key={role.id}>
                    <div>
                      <strong>{role.roleName}</strong>
                      <p className="muted">{role.permissionKeys.map(formatPermissionLabel).join(' · ')}</p>
                    </div>
                    <div className="list-card-meta">
                      {role.isDefaultAdmin ? <StatusBadge status="approved" /> : null}
                      {!role.isDefaultAdmin && role.canDelete ? (
                        <button
                          className="button button-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              const response = await guildsApi.deleteRole(guildSnapshot.guild.id, role.id);
                              setMessage(response.message);
                            })
                          }
                          type="button"
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState description="先加载工会，再创建角色与分配权限。" title="请先加载工会" />
          )}
        </Panel>

        <Panel description="支持按平台账号或游戏角色添加成员，并为成员维护箱子坐标。" title="成员管理">
          {guildSnapshot ? (
            <>
              <form
                className="form-grid"
                onSubmit={memberForm.handleSubmit(async (values) => {
                  await runAction(async () => {
                    const response = await guildsApi.addMember(guildSnapshot.guild.id, values);
                    setMessage(response.message);
                    memberForm.reset({ bindingType: values.bindingType, userId: '', gameCharacterId: '', roleIds: [] });
                    setMemberBindingType(values.bindingType);
                  });
                })}
              >
                <Field error={memberForm.formState.errors.bindingType?.message} label="绑定方式">
                  <select
                    {...memberForm.register('bindingType')}
                    onChange={(event) => {
                      memberForm.setValue('bindingType', event.target.value as GuildMemberValues['bindingType']);
                      setMemberBindingType(event.target.value as GuildMemberValues['bindingType']);
                    }}
                  >
                    <option value="platform_user">平台用户</option>
                    <option value="game_character">游戏角色</option>
                  </select>
                </Field>
                {memberBindingType === 'platform_user' ? (
                  <Field error={memberForm.formState.errors.userId?.message} label="平台用户 ID">
                    <input {...memberForm.register('userId')} placeholder="输入 user_id" />
                  </Field>
                ) : (
                  <Field error={memberForm.formState.errors.gameCharacterId?.message} label="游戏角色 ID">
                    <input {...memberForm.register('gameCharacterId')} placeholder="输入 game_character_id" />
                  </Field>
                )}
                <Field label="角色 ID 列表（逗号分隔）">
                  <input
                    onChange={(event) =>
                      memberForm.setValue(
                        'roleIds',
                        event.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="guild_role_id_1,guild_role_id_2"
                  />
                </Field>
                <button className="button button-primary" type="submit">
                  添加成员
                </button>
              </form>

              <div className="list-stack">
                {guildSnapshot.members.map((member) => (
                  <article className="list-card" key={member.id}>
                    <div>
                      <strong>{member.platformUser?.email ?? member.gameCharacter?.characterName ?? member.id}</strong>
                      <p className="muted">
                        {member.bindingType} · 角色：{member.roles.map((role) => role.roleName).join('、') || '未分配'}
                      </p>
                      <p className="muted">
                        箱子：{member.boxCoordinate ? `${member.boxCoordinate.coordinateX}, ${member.boxCoordinate.coordinateY}` : '未设置'}
                      </p>
                    </div>
                    <div className="list-card-meta">
                      <button
                        className="button button-ghost"
                        onClick={() =>
                          void runAction(async () => {
                            const response = await guildsApi.updateMemberBox(guildSnapshot.guild.id, member.id, { coordinateX: 1, coordinateY: 1 });
                            setMessage(response.message);
                          })
                        }
                        type="button"
                      >
                        设为 1,1
                      </button>
                      <button
                        className="button button-ghost"
                        onClick={() =>
                          void runAction(async () => {
                            const response = await guildsApi.removeMember(guildSnapshot.guild.id, member.id);
                            setMessage(response.message);
                          })
                        }
                        type="button"
                      >
                        移除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <EmptyState description="加载工会后，可继续维护成员与箱子。" title="请先加载工会" />
          )}
        </Panel>
      </div>
    </div>
  );
};
