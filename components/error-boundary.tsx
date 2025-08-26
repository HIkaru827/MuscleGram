"use client"

import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Muscle<span className="text-red-500">Gram</span>
      </h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h2>
        <p className="text-red-700 text-sm mb-4">
          アプリの読み込み中にエラーが発生しました。再試行するか、ページを更新してください。
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left">
            <summary className="cursor-pointer text-red-600 hover:text-red-800">
              詳細なエラー情報
            </summary>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
              {error.message}
              {error.stack && '\n\n' + error.stack}
            </pre>
          </details>
        )}
      </div>
      <div className="space-y-3">
        <button 
          onClick={retry}
          className="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
        >
          再試行
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
        >
          ページを更新
        </button>
      </div>
    </div>
  </div>
)

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Log to performance monitor if available
    if (typeof window !== 'undefined' && (window as any).performanceMonitor) {
      (window as any).performanceMonitor.logError?.('ErrorBoundary', { 
        error: error.message, 
        stack: error.stack,
        componentStack: errorInfo.componentStack 
      })
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} retry={this.retry} />
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Named export for better compatibility
export { ErrorBoundary }