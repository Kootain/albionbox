import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Panel, StatCard, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { guildsApi } from '../modules/guilds/api';
import type { GuildRegistrationApplication, ReimbursementSession } from '../types/domain';

export const DashboardPage = () => {
  const { userContext } = useAuth();
  const [guildApplications, setGuildApplications] = useState<GuildRegistrationApplication[]>([]);
  const [sessions, setSessions] = useState<ReimbursementSession[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const applicationResponse = await guildsApi.getMyApplications();
        setGuildApplications(applicationResponse.guildRegistrationApplications);
      } catch {
        setGuildApplications([]);
        setSessions([]);
      }
    };

    void load();
  }, []);

  const stats = useMemo(
    () => [
      { label: '当前角色', value: userContext?.roleContext?.characterName ?? '未选择' },
      { label: '第三方绑定', value: userContext?.oauthAccounts.filter((item) => item.status === 'active').length ?? 0 },
      { label: '角色数量', value: userContext?.gameCharacters.length ?? 0 },
      { label: '工会申请', value: guildApplications.length },
    ],
    [guildApplications.length, userContext]
  );

  return (
    <div className="page-stack">
      <PageHeader
        description="在一个页面中快速掌握角色、工会申请与补装业务的当前状态。"
        title={`欢迎回来，${userContext?.user.email ?? '冒险者'}`}
      />

      <div className="stats-grid">
        {stats.map((stat) => (
          <StatCard helper="实时汇总" key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="two-column">
        <Panel description="来自用户中心与工会模块的聚合信息。" title="账号概览">
          <div className="definition-list">
            <div>
              <span>邮箱</span>
              <strong>{userContext?.user.email ?? '—'}</strong>
            </div>
            <div>
              <span>邮箱验证</span>
              <strong>{userContext?.user.emailVerified ? '已验证' : '未验证'}</strong>
            </div>
            <div>
              <span>当前角色</span>
              <strong>{userContext?.roleContext?.characterName ?? '未选择角色'}</strong>
            </div>
            <div>
              <span>管理员权限</span>
              <strong>{userContext?.user.isAdmin ? '平台管理员' : '普通用户'}</strong>
            </div>
          </div>
        </Panel>

        <Panel description="展示最近工会申请，方便跟踪审核状态。" title="工会申请">
          {guildApplications.length === 0 ? (
            <p className="muted">你还没有提交过工会注册申请。</p>
          ) : (
            <div className="list-stack">
              {guildApplications.slice(0, 4).map((item) => (
                <article className="list-card" key={item.id}>
                  <div>
                    <strong>{item.guildName}</strong>
                    <p className="muted">{item.server}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel description="如果当前已有工会补装数据，这里会展示最新 session。" title="补装进度">
        {sessions.length === 0 ? (
          <p className="muted">暂无可见的补装 session。创建工会并导入战斗记录后会在这里出现。</p>
        ) : (
          <div className="list-stack">
            {sessions.slice(0, 5).map((session) => (
              <article className="list-card" key={session.id}>
                <div>
                  <strong>{session.title}</strong>
                  <p className="muted">{session.description ?? '暂无描述'}</p>
                </div>
                <div className="list-card-meta">
                  <StatusBadge status={session.status} />
                  <small>{session.progress?.progressPercent ?? 0}%</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
