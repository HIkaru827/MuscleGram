"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Shield, Settings, Eye, BarChart3 } from 'lucide-react'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  functional: boolean
  marketing: boolean
}

const defaultPreferences: CookiePreferences = {
  necessary: true, // 必須Cookieは常にtrue
  analytics: false,
  functional: false,
  marketing: false
}

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences)

  useEffect(() => {
    // Cookieの同意状態をチェック
    const consent = localStorage.getItem('cookieConsent')
    const savedPreferences = localStorage.getItem('cookiePreferences')
    
    if (!consent) {
      // 初回訪問時は同意バナーを表示
      setTimeout(() => setShowConsent(true), 1000)
    } else if (savedPreferences) {
      // 保存された設定を復元
      try {
        const parsed = JSON.parse(savedPreferences)
        setPreferences({ ...defaultPreferences, ...parsed })
        
        // Google Analyticsの設定
        updateAnalyticsConsent(parsed.analytics || false)
      } catch (error) {
        console.error('Error parsing cookie preferences:', error)
      }
    }
  }, [])

  const updateAnalyticsConsent = (consent: boolean) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': consent ? 'granted' : 'denied',
        'ad_storage': consent ? 'granted' : 'denied',
        'functionality_storage': preferences.functional ? 'granted' : 'denied',
        'personalization_storage': preferences.marketing ? 'granted' : 'denied',
      })
    }
  }

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true
    }
    
    setPreferences(allAccepted)
    localStorage.setItem('cookieConsent', 'accepted')
    localStorage.setItem('cookiePreferences', JSON.stringify(allAccepted))
    updateAnalyticsConsent(true)
    setShowConsent(false)
  }

  const acceptNecessaryOnly = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false
    }
    
    setPreferences(necessaryOnly)
    localStorage.setItem('cookieConsent', 'partial')
    localStorage.setItem('cookiePreferences', JSON.stringify(necessaryOnly))
    updateAnalyticsConsent(false)
    setShowConsent(false)
  }

  const saveCustomPreferences = () => {
    localStorage.setItem('cookieConsent', 'custom')
    localStorage.setItem('cookiePreferences', JSON.stringify(preferences))
    updateAnalyticsConsent(preferences.analytics)
    setShowSettings(false)
    setShowConsent(false)
  }

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'necessary') return // 必須Cookieは変更不可
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (!showConsent) return null

  return (
    <>
      {/* Cookie同意バナー */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">プライバシー設定</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  より良いサービス提供のためCookieを使用します。アナリティクスCookieでアプリの使用状況を分析し、機能向上に役立てています。
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    必須Cookie: 有効
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    アナリティクス: 選択可能
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="whitespace-nowrap"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  設定
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptNecessaryOnly}
                  className="whitespace-nowrap"
                >
                  必須のみ
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="whitespace-nowrap bg-red-600 hover:bg-red-700 text-white"
                >
                  すべて許可
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細設定ダイアログ */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Cookie設定
            </DialogTitle>
            <DialogDescription>
              使用するCookieの種類を選択してください。必須Cookieはアプリの動作に不可欠です。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 必須Cookie */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <Label className="font-medium">必須Cookie</Label>
                  <Badge variant="secondary" className="text-xs">必須</Badge>
                </div>
                <p className="text-xs text-gray-600">
                  認証、セキュリティ、基本機能に必要
                </p>
              </div>
              <Switch 
                checked={true} 
                disabled 
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {/* アナリティクスCookie */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <Label className="font-medium">アナリティクスCookie</Label>
                </div>
                <p className="text-xs text-gray-600">
                  使用状況の分析とアプリの改善
                </p>
              </div>
              <Switch 
                checked={preferences.analytics}
                onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
              />
            </div>

            {/* 機能Cookie */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4 text-purple-600" />
                  <Label className="font-medium">機能Cookie</Label>
                </div>
                <p className="text-xs text-gray-600">
                  設定の保存と個人化機能
                </p>
              </div>
              <Switch 
                checked={preferences.functional}
                onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
              />
            </div>

            {/* マーケティングCookie */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <Label className="font-medium">マーケティングCookie</Label>
                </div>
                <p className="text-xs text-gray-600">
                  関連性の高いコンテンツの表示
                </p>
              </div>
              <Switch 
                checked={preferences.marketing}
                onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button 
              onClick={saveCustomPreferences}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              設定を保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}