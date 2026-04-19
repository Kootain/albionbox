import React from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { UploadQueueProvider } from './hooks/useUploadQueue';
import { DashboardPage } from './pages/dashboard/DashboardPage';

export default function App() {
  return (
    <LanguageProvider>
      <UploadQueueProvider>
        <DashboardPage />
      </UploadQueueProvider>
    </LanguageProvider>
  );
}
