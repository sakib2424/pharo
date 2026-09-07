import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './queryClient';
import { DashboardPage } from '../features/instruments/DashboardPage';

const queryClient = createQueryClient();

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unable to render dashboard', error, info);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>Something interrupted the dashboard.</h1>
          <p>Reload to start a fresh session.</p>
          <button onClick={() => window.location.reload()}>Reload dashboard</button>
        </main>
      );
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
