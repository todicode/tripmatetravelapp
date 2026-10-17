import React from 'react';
import AuthScreen from './src/auth/AuthScreen';
import { ThemeProvider } from './src/theme/AppTheme';
import { ToastProvider } from './src/theme/Toast';
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthScreen />
      </ToastProvider>
    </ThemeProvider>
  );
}
