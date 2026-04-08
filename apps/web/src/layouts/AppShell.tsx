import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cx } from '../lib/utils';

const baseItems = [
  { to: '/', label: '总览' },
  { to: '/guilds', label: '工会' },
  { to: '/regear', label: '补装' },
  { to: '/profile', label: '我的账号' },
];

export const AppShell = () => {
  const { userContext, logout } = useAuth();

  const navItems = userContext?.user.isAdmin ? [...baseItems, { to: '/admin', label: '管理员' }] : baseItems;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">AB</span>
          <div>
            <strong>Albion ERP</strong>
            <small>Guild Operations</small>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cx('nav-item', isActive && 'nav-item-active')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="profile-avatar">{userContext?.user.email.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{userContext?.user.email}</strong>
              <small>{userContext?.roleContext?.characterName ?? '未选择角色'}</small>
            </div>
          </div>
          <button className="button button-secondary button-block" onClick={logout} type="button">
            退出登录
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};
