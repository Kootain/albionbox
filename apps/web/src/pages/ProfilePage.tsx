import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BindOauthAccountSchema,
  CreateGameAccountBindingApplicationSchema,
  SwitchCurrentGameCharacterSchema,
} from '@albionbox/shared';
import { EmptyState, Field, PageHeader, Panel, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../lib/utils';
import { usersApi } from '../modules/users/api';

type OauthFormValues = { provider: 'kook' | 'discord'; providerAccountId: string; providerAccountName?: string };
type GameApplicationValues = { server: 'asia' | 'europe' | 'america'; gameAccountId: string; gameCharacterName?: string };
type SwitchRoleValues = { gameCharacterId: string };

export const ProfilePage = () => {
  const { userContext, refresh } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const oauthForm = useForm<OauthFormValues>({
    resolver: zodResolver(BindOauthAccountSchema),
    defaultValues: { provider: 'discord', providerAccountId: '', providerAccountName: '' },
  });
  const gameApplicationForm = useForm<GameApplicationValues>({
    resolver: zodResolver(CreateGameAccountBindingApplicationSchema),
    defaultValues: { server: 'asia', gameAccountId: '', gameCharacterName: '' },
  });
  const switchForm = useForm<SwitchRoleValues>({
    resolver: zodResolver(SwitchCurrentGameCharacterSchema),
    defaultValues: { gameCharacterId: userContext?.roleContext?.id ?? '' },
  });

  const handleAction = async (action: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader description="管理当前角色、第三方绑定和游戏账号绑定申请。" title="个人中心" />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="two-column">
        <Panel description="展示用户在后端上下文中的核心状态。" title="账号信息">
          <div className="definition-list">
            <div>
              <span>邮箱</span>
              <strong>{userContext?.user.email ?? '—'}</strong>
            </div>
            <div>
              <span>当前角色</span>
              <strong>{userContext?.roleContext?.characterName ?? '未选择角色'}</strong>
            </div>
            <div>
              <span>创建时间</span>
              <strong>{formatDateTime(userContext?.user.createdAt)}</strong>
            </div>
            <div>
              <span>管理员</span>
              <strong>{userContext?.user.isAdmin ? '是' : '否'}</strong>
            </div>
          </div>
        </Panel>

        <Panel description="切换当前登录上下文中的游戏角色。" title="角色切换">
          <form
            className="form-grid"
            onSubmit={switchForm.handleSubmit(async (values) => {
              await handleAction(async () => {
                await usersApi.switchCurrentGameCharacter(values.gameCharacterId);
                setMessage('当前角色已切换');
              });
            })}
          >
            <Field error={switchForm.formState.errors.gameCharacterId?.message} label="选择角色">
              <select {...switchForm.register('gameCharacterId')}>
                <option value="">请选择角色</option>
                {userContext?.gameCharacters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.characterName ?? item.gameAccountId}
                  </option>
                ))}
              </select>
            </Field>
            <button className="button button-primary" type="submit">
              切换角色
            </button>
          </form>
        </Panel>
      </div>

      <div className="two-column">
        <Panel description="支持绑定 Discord / Kook，用于后续第三方登录。" title="第三方绑定">
          <form
            className="form-grid"
            onSubmit={oauthForm.handleSubmit(async (values) => {
              await handleAction(async () => {
                const response = await usersApi.bindOauthAccount(values);
                setMessage(response.message);
                oauthForm.reset({ provider: values.provider, providerAccountId: '', providerAccountName: '' });
              });
            })}
          >
            <Field error={oauthForm.formState.errors.provider?.message} label="平台">
              <select {...oauthForm.register('provider')}>
                <option value="discord">Discord</option>
                <option value="kook">Kook</option>
              </select>
            </Field>
            <Field error={oauthForm.formState.errors.providerAccountId?.message} label="第三方账号 ID">
              <input {...oauthForm.register('providerAccountId')} placeholder="输入第三方账号 ID" />
            </Field>
            <Field error={oauthForm.formState.errors.providerAccountName?.message} label="第三方名称">
              <input {...oauthForm.register('providerAccountName')} placeholder="可选" />
            </Field>
            <button className="button button-primary" type="submit">
              保存绑定
            </button>
          </form>

          <div className="list-stack">
            {userContext?.oauthAccounts.length ? (
              userContext.oauthAccounts.map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>{item.provider}</strong>
                    <p className="muted">
                      {item.providerAccountName ?? item.providerAccountId ?? '未绑定'}
                    </p>
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={item.status} />
                    {item.status === 'active' ? (
                      <button
                        className="button button-ghost"
                        onClick={() =>
                          void handleAction(async () => {
                            const response = await usersApi.unbindOauthAccount(item.provider);
                            setMessage(response.message);
                          })
                        }
                        type="button"
                      >
                        解绑
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState description="可以先绑定一个 Discord 或 Kook 账号。" title="暂无第三方绑定" />
            )}
          </div>
        </Panel>

        <Panel description="提交游戏账号绑定申请，等待管理员审核。" title="游戏账号绑定">
          <form
            className="form-grid"
            onSubmit={gameApplicationForm.handleSubmit(async (values) => {
              await handleAction(async () => {
                const response = await usersApi.createGameApplication(values);
                setMessage(response.message);
                gameApplicationForm.reset({ server: values.server, gameAccountId: '', gameCharacterName: '' });
              });
            })}
          >
            <Field error={gameApplicationForm.formState.errors.server?.message} label="服务器">
              <select {...gameApplicationForm.register('server')}>
                <option value="asia">亚服</option>
                <option value="europe">欧服</option>
                <option value="america">美服</option>
              </select>
            </Field>
            <Field error={gameApplicationForm.formState.errors.gameAccountId?.message} label="游戏账号 ID">
              <input {...gameApplicationForm.register('gameAccountId')} placeholder="例如 123456789" />
            </Field>
            <Field error={gameApplicationForm.formState.errors.gameCharacterName?.message} label="角色名称">
              <input {...gameApplicationForm.register('gameCharacterName')} placeholder="可选" />
            </Field>
            <button className="button button-primary" type="submit">
              提交申请
            </button>
          </form>

          <div className="list-stack">
            {userContext?.gameAccountApplications.length ? (
              userContext.gameAccountApplications.map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>
                      {item.gameCharacterName ?? item.gameAccountId} · {item.server}
                    </strong>
                    <p className="muted">绑定 Token：{item.bindingToken}</p>
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={item.status} />
                    <small>{formatDateTime(item.createdAt)}</small>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState description="提交后会生成绑定 Token，等待管理员审核。" title="暂无绑定申请" />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};
