import { useCallback, useEffect, useState } from 'react';
import { EmptyState, PageHeader, Panel, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../lib/utils';
import { guildsApi } from '../modules/guilds/api';
import { usersApi } from '../modules/users/api';
import type { GameAccountApplication, GuildRegistrationApplication } from '../types/domain';

export const AdminPage = () => {
  const { userContext } = useAuth();
  const [gameApplications, setGameApplications] = useState<GameAccountApplication[]>([]);
  const [guildApplications, setGuildApplications] = useState<GuildRegistrationApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [gameResponse, guildResponse] = await Promise.all([
      usersApi.getAdminGameApplications(),
      guildsApi.getAdminApplications(),
    ]);
    setGameApplications(gameResponse.gameAccountApplications);
    setGuildApplications(guildResponse.guildRegistrationApplications);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await load();
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : '管理员数据加载失败');
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader description="集中处理游戏账号绑定与工会注册审核。" title="管理员审核" />

      {!userContext?.user.isAdmin ? (
        <Panel title="无访问权限">
          <EmptyState description="当前账号不是平台管理员，无法查看审核列表。" title="仅管理员可访问" />
        </Panel>
      ) : null}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      {userContext?.user.isAdmin ? <div className="two-column">
        <Panel description="审核用户提交的游戏账号绑定申请。" title="游戏账号审核">
          {gameApplications.length ? (
            <div className="list-stack">
              {gameApplications.map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>{item.gameCharacterName ?? item.gameAccountId}</strong>
                    <p className="muted">
                      {item.server} · Token：{item.bindingToken} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={item.status} />
                    {item.status === 'pending' ? (
                      <>
                        <button
                          className="button button-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              const response = await usersApi.reviewGameApplication(item.id, { status: 'approved', reviewNote: '前端审核通过' });
                              setMessage(response.message);
                            })
                          }
                          type="button"
                        >
                          通过
                        </button>
                        <button
                          className="button button-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              const response = await usersApi.reviewGameApplication(item.id, { status: 'rejected', reviewNote: '前端审核拒绝' });
                              setMessage(response.message);
                            })
                          }
                          type="button"
                        >
                          拒绝
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState description="当前没有待处理的游戏账号绑定申请。" title="暂无申请" />
          )}
        </Panel>

        <Panel description="审核用户提交的工会注册申请。" title="工会注册审核">
          {guildApplications.length ? (
            <div className="list-stack">
              {guildApplications.map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>{item.guildName}</strong>
                    <p className="muted">
                      {item.server} · Token：{item.bindingToken} · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="list-card-meta">
                    <StatusBadge status={item.status} />
                    {item.status === 'pending' ? (
                      <>
                        <button
                          className="button button-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              const response = await guildsApi.reviewApplication(item.id, { status: 'approved', reviewNote: '前端审核通过' });
                              setMessage(response.message);
                            })
                          }
                          type="button"
                        >
                          通过
                        </button>
                        <button
                          className="button button-ghost"
                          onClick={() =>
                            void runAction(async () => {
                              const response = await guildsApi.reviewApplication(item.id, { status: 'rejected', reviewNote: '前端审核拒绝' });
                              setMessage(response.message);
                            })
                          }
                          type="button"
                        >
                          拒绝
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState description="当前没有待处理的工会注册申请。" title="暂无申请" />
          )}
        </Panel>
      </div> : null}
    </div>
  );
};
