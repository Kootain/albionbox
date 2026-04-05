import { Hono } from 'hono';
import { cors } from 'hono/cors';

// 导入我们刚刚写好的用户模块路由
import usersApp from './routes/users';

// 初始化主应用，依然使用 cf-typegen 自动生成的 Env 类型
const app = new Hono<{ Bindings: Env }>();

// ------------------------------------------------------------------
// 1. 全局中间件：配置 CORS (极其重要)
// 因为我们的 React 前端跑在 localhost:5173，而 API 跑在 localhost:8787
// 跨端口请求必须允许跨域
// ------------------------------------------------------------------
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://albionbox.com'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// ------------------------------------------------------------------
// 2. 基础健康检查接口
// ------------------------------------------------------------------
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'Albion Box API' });
});

// ------------------------------------------------------------------
// 3. 挂载业务路由模块，并捕获类型 (RPC 的核心魔法)
// ------------------------------------------------------------------
// 我们将 usersApp 挂载到 /api/users 路径下
const routes = app.route('/api/users', usersApp);
// TODO: 未来你可以在这里继续挂载 ordersApp, guildsApp 等等...

// ------------------------------------------------------------------
// 4. 导出终极类型 (End-to-End Type Safety)
// 将路由的类型导出给前端使用，前端无需看 Swagger 就能知道有哪些接口
// ------------------------------------------------------------------
export type AppType = typeof routes;

// 5. 导出应用实例供 Cloudflare Worker 运行
export default app;