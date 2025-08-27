"use client"

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Download, X } from 'lucide-react'
import { Card, CardContent } from './ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showPrompt) return null

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-red-700">MuscleGramをインストール</h3>
            <p className="text-sm text-red-600">
              ホーム画面に追加してより快適にご利用いただけます
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm"
              onClick={handleInstall}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Download className="w-4 h-4 mr-1" />
              インストール
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDismiss}
              className="text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}