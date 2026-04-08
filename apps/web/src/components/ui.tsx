import type { ReactNode } from 'react';
import { cx, formatStatusLabel } from '../lib/utils';

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <header className="page-header">
    <div>
      <p className="eyebrow">Albion ERP</p>
      <h1>{title}</h1>
      {description ? <p className="muted">{description}</p> : null}
    </div>
    {actions ? <div className="page-actions">{actions}</div> : null}
  </header>
);

export const Panel = ({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {actions ? <div className="panel-actions">{actions}</div> : null}
    </div>
    <div className="panel-body">{children}</div>
  </section>
);

export const StatCard = ({ label, value, helper }: { label: string; value: string | number; helper?: string }) => (
  <article className="stat-card">
    <span>{label}</span>
    <strong>{value}</strong>
    {helper ? <small>{helper}</small> : null}
  </article>
);

export const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {error ? <em>{error}</em> : null}
  </label>
);

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cx('status-badge', `status-${status.replaceAll('_', '-')}`)}>{formatStatusLabel(status)}</span>
);

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="empty-state">
    <strong>{title}</strong>
    <p>{description}</p>
  </div>
);

export const LoadingState = ({ label = '加载中...' }: { label?: string }) => <div className="loading-state">{label}</div>;

export const DataList = ({
  items,
  renderItem,
}: {
  items: string[];
  renderItem?: (value: string) => ReactNode;
}) => (
  <div className="pill-list">
    {items.map((item) => (
      <span className="pill" key={item}>
        {renderItem ? renderItem(item) : item}
      </span>
    ))}
  </div>
);
