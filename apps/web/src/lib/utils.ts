export const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatServerLabel = (server: string) => {
  if (server === 'asia') return '亚服';
  if (server === 'europe') return '欧服';
  if (server === 'america') return '美服';
  return server;
};

export const formatStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    active: '启用',
    unbound: '已解绑',
    open: '进行中',
    completed: '已完成',
    closed: '已关闭',
    pending_submission: '待提交',
    pending_review: '待审核',
  };

  return statusMap[status] ?? status;
};

export const formatPermissionLabel = (value: string) => value.split(':').join(' / ');
