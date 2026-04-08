import type { ReactNode } from 'react';
import { AuthProvider } from '../hooks/auth-context';

export const AppProviders = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
