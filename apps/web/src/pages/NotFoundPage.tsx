import { Link } from 'react-router-dom';
import { PageHeader, Panel } from '../components/ui';

export const NotFoundPage = () => (
  <div className="page-stack">
    <PageHeader description="你访问的页面不存在，可能还未实现或地址已失效。" title="页面未找到" />
    <Panel title="返回入口">
      <Link className="button button-primary" to="/">
        返回首页
      </Link>
    </Panel>
  </div>
);
