import type { Context } from 'hono';

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export const toErrorResponse = (c: Context, error: unknown) => {
  if (error instanceof AppError) {
    return c.json({ error: error.message }, error.statusCode as 400 | 401 | 403 | 404 | 409 | 500);
  }

  console.error(error);
  return c.json({ error: '服务器内部错误' }, 500);
};
