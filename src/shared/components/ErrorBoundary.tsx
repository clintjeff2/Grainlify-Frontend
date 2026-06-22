import { Component, ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 transition-colors ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]'
        : 'bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]'
    }`}>
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-500/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-3xl animate-pulse" />

      {/* Error Card */}
      <div className={`relative z-10 w-full max-w-md backdrop-blur-[40px] border rounded-[28px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
        theme === 'dark'
          ? 'bg-white/[0.08] border-white/15'
          : 'bg-white/[0.15] border-white/25'
      }`}>
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold mb-2 transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>
            Something went wrong
          </h2>
          <p className={`text-sm transition-colors ${
            theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'
          }`}>
            An unexpected error occurred. We've been notified and are working to fix it.
          </p>
        </div>

        {/* Error Details (collapsible) */}
        {error && (
          <details className={`mb-6 rounded-lg p-4 transition-colors ${
            theme === 'dark' ? 'bg-white/[0.06]' : 'bg-white/[0.12]'
          }`}>
            <summary className={`cursor-pointer text-sm font-medium transition-colors ${
              theme === 'dark' ? 'text-[#d4c5b0] hover:text-[#f5efe5]' : 'text-[#7a6b5a] hover:text-[#2d2820]'
            }`}>
              Error Details
            </summary>
            <pre className={`mt-3 text-xs overflow-auto p-3 rounded transition-colors ${
              theme === 'dark' ? 'bg-black/[0.3] text-red-400' : 'bg-black/[0.05] text-red-600'
            }`}>
              {error.toString()}
            </pre>
          </details>
        )}

        {/* Recovery Actions */}
        <div className="space-y-3">
          <button
            onClick={onReset}
            className="w-full py-3 rounded-[12px] bg-[#c9983a] hover:bg-[#d4af37] text-white font-medium transition-all shadow-[0_4px_12px_rgba(201,152,58,0.3)]"
          >
            Reload Page
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className={`w-full py-3 rounded-[12px] font-medium transition-all ${
              theme === 'dark'
                ? 'bg-white/[0.08] hover:bg-white/[0.12] text-[#f5efe5] border border-white/15'
                : 'bg-white/[0.15] hover:bg-white/[0.2] text-[#2d2820] border border-white/25'
            }`}
          >
            Go to Home
          </button>
        </div>

        {/* Support Info */}
        <p className={`text-xs text-center mt-6 transition-colors ${
          theme === 'dark' ? 'text-[#a3a3a3]' : 'text-[#8a7d6f]'
        }`}>
          If this problem persists, please contact support or try refreshing the page.
        </p>
      </div>
    </div>
  );
}
