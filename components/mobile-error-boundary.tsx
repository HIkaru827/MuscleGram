"use client"

import React from 'react'

interface MobileErrorBoundaryProps {
  children: React.ReactNode
}

interface MobileErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class MobileErrorBoundary extends React.Component<MobileErrorBoundaryProps, MobileErrorBoundaryState> {
  constructor(props: MobileErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Mobile Error Boundary caught an error:', error, errorInfo)
    
    // Mobile-specific error logging
    const errorData = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }
    
    console.error('Mobile Error Details:', errorData)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="text-center max-w-md bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Muscle<span className="text-red-500">Gram</span>
            </h1>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-red-600 mb-2">モバイルエラー</h2>
              <p className="text-gray-600 text-sm mb-4">
                スマートフォンでエラーが発生しました。ページを更新してください。
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full text-red-600 border border-red-200 bg-white px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                ページを更新
              </button>
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                }}
                className="w-full text-red-600 border border-red-200 bg-white px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default MobileErrorBoundary