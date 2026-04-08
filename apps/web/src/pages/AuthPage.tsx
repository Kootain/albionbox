import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LoginUserSchema,
  RegisterUserSchema,
  ResetPasswordSchema,
  UserEmailSchema,
} from '@albionbox/shared';
import { Field } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../modules/users/api';

type AuthMode = 'login' | 'register' | 'reset';

type LoginValues = { email: string; password: string };
type RegisterValues = { email: string; code: string; password: string };
type ResetValues = { email: string; code: string; newPassword: string };
type EmailValues = { email: string };

const modeCopy: Record<AuthMode, { title: string; subtitle: string; submitLabel: string }> = {
  login: {
    title: '登录 Albion ERP',
    subtitle: '使用平台账号进入工会与补装后台。',
    submitLabel: '立即登录',
  },
  register: {
    title: '注册新账号',
    subtitle: '先发送邮箱验证码，再完成平台账号注册。',
    submitLabel: '提交注册',
  },
  reset: {
    title: '重置密码',
    subtitle: '发送邮箱验证码后，可重置登录密码。',
    submitLabel: '确认重置',
  },
};

export const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(LoginUserSchema), defaultValues: { email: '', password: '' } });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(RegisterUserSchema),
    defaultValues: { email: '', code: '', password: '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { email: '', code: '', newPassword: '' },
  });

  const afterAuthPath = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSendCode = async (values: EmailValues) => {
    setError(null);
    setMessage(null);
    setSendingCode(true);

    try {
      const response =
        mode === 'register' ? await usersApi.sendRegisterCode(values.email) : await usersApi.sendResetCode(values.email);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '验证码发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const renderEmailCodeActions = () => {
    if (mode === 'login') {
      return null;
    }

    return (
      <button
        className="button button-secondary"
        disabled={sendingCode}
        onClick={async () => {
          const emailValue = mode === 'register' ? registerForm.getValues('email') : resetForm.getValues('email');
          const emailSchema = UserEmailSchema.safeParse({ email: emailValue });

          if (!emailSchema.success) {
            if (mode === 'register') {
              registerForm.setError('email', { message: emailSchema.error.issues[0]?.message ?? '请输入有效邮箱' });
            } else {
              resetForm.setError('email', { message: emailSchema.error.issues[0]?.message ?? '请输入有效邮箱' });
            }
            return;
          }

          await handleSendCode(emailSchema.data);
        }}
        type="button"
      >
        {sendingCode ? '发送中...' : '发送验证码'}
      </button>
    );
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Albion Online ERP</p>
        <h1>{modeCopy[mode].title}</h1>
        <p className="muted">{modeCopy[mode].subtitle}</p>

        <div className="tab-row">
          {(['login', 'register', 'reset'] as const).map((item) => (
            <button
              className={item === mode ? 'tab-button tab-button-active' : 'tab-button'}
              key={item}
              onClick={() => {
                setMode(item);
                setMessage(null);
                setError(null);
              }}
              type="button"
            >
              {modeCopy[item].title}
            </button>
          ))}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}

        {mode === 'login' ? (
          <form
            className="form-grid"
            onSubmit={loginForm.handleSubmit(async (values) => {
              setError(null);
              try {
                await login(values);
                navigate(afterAuthPath, { replace: true });
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : '登录失败');
              }
            })}
          >
            <Field error={loginForm.formState.errors.email?.message} label="邮箱">
              <input {...loginForm.register('email')} placeholder="name@example.com" />
            </Field>
            <Field error={loginForm.formState.errors.password?.message} label="密码">
              <input {...loginForm.register('password')} placeholder="请输入密码" type="password" />
            </Field>
            <button className="button button-primary button-block" disabled={loginForm.formState.isSubmitting} type="submit">
              {loginForm.formState.isSubmitting ? '登录中...' : modeCopy.login.submitLabel}
            </button>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form
            className="form-grid"
            onSubmit={registerForm.handleSubmit(async (values) => {
              setError(null);
              try {
                await register(values);
                navigate(afterAuthPath, { replace: true });
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : '注册失败');
              }
            })}
          >
            <Field error={registerForm.formState.errors.email?.message} label="邮箱">
              <input {...registerForm.register('email')} placeholder="name@example.com" />
            </Field>
            <Field error={registerForm.formState.errors.code?.message} label="验证码">
              <input {...registerForm.register('code')} placeholder="请输入 6 位验证码" />
            </Field>
            <Field error={registerForm.formState.errors.password?.message} label="密码">
              <input {...registerForm.register('password')} placeholder="至少 8 位密码" type="password" />
            </Field>
            <div className="button-row">
              {renderEmailCodeActions()}
              <button className="button button-primary" disabled={registerForm.formState.isSubmitting} type="submit">
                {registerForm.formState.isSubmitting ? '提交中...' : modeCopy.register.submitLabel}
              </button>
            </div>
          </form>
        ) : null}

        {mode === 'reset' ? (
          <form
            className="form-grid"
            onSubmit={resetForm.handleSubmit(async (values) => {
              setError(null);
              try {
                await resetPassword(values);
                navigate(afterAuthPath, { replace: true });
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : '重置失败');
              }
            })}
          >
            <Field error={resetForm.formState.errors.email?.message} label="邮箱">
              <input {...resetForm.register('email')} placeholder="name@example.com" />
            </Field>
            <Field error={resetForm.formState.errors.code?.message} label="验证码">
              <input {...resetForm.register('code')} placeholder="请输入 6 位验证码" />
            </Field>
            <Field error={resetForm.formState.errors.newPassword?.message} label="新密码">
              <input {...resetForm.register('newPassword')} placeholder="至少 8 位密码" type="password" />
            </Field>
            <div className="button-row">
              {renderEmailCodeActions()}
              <button className="button button-primary" disabled={resetForm.formState.isSubmitting} type="submit">
                {resetForm.formState.isSubmitting ? '提交中...' : modeCopy.reset.submitLabel}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};
