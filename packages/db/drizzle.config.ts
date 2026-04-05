import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // 告诉 Drizzle 去哪里读取我们定义的 schema
  schema: './src/schema/*',
  // 生成的 SQL 迁移文件存放目录
  out: './migrations',
  // Cloudflare D1 底层是 SQLite
  dialect: 'sqlite', 
});