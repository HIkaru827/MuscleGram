'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, ExternalLink, AlertCircle } from 'lucide-react'

export function NotificationSettingsChecker() {
  const [checks, setChecks] = useState<any>({})

  const runNotificationChecks = () => {
    const results: any = {}

    // Browser checks
    results.browserSupport = 'Notification' in window
    results.permission = Notification.permission
    results.secureContext = window.isSecureContext

    // User agent detection
    const userAgent = navigator.userAgent
    results.isChrome = userAgent.includes('Chrome')
    results.isFirefox = userAgent.includes('Firefox')
    results.isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
    results.isEdge = userAgent.includes('Edge')

    // Platform detection
    results.isWindows = navigator.platform.includes('Win')
    results.isMac = navigator.platform.includes('Mac')
    results.isLinux = navigator.platform.includes('Linux')

    // Document state
    results.documentVisible = document.visibilityState === 'visible'
    results.documentHasFocus = document.hasFocus()

    setChecks(results)
  }

  const openBrowserSettings = () => {
    const userAgent = navigator.userAgent
    let settingsUrl = ''

    if (userAgent.includes('Chrome')) {
      settingsUrl = 'chrome://settings/content/notifications'
    } else if (userAgent.includes('Firefox')) {
      settingsUrl = 'about:preferences#privacy'
    } else if (userAgent.includes('Edge')) {
      settingsUrl = 'edge://settings/content/notifications'
    }

    if (settingsUrl) {
      window.open(settingsUrl, '_blank')
    } else {
      alert('ブラウザの設定を手動で開いて、通知設定を確認してください。')
    }
  }

  const troubleshootingTips = [
    {
      condition: checks.permission === 'denied',
      tip: '通知が拒否されています。ブラウザのアドレスバー左のアイコンをクリックして通知を許可してください。'
    },
    {
      condition: !checks.secureContext,
      tip: 'セキュアコンテキスト（HTTPS）が必要です。HTTPSまたはlocalhostでアクセスしてください。'
    },
    {
      condition: checks.isWindows,
      tip: 'Windowsの場合、システム設定 > システム > 通知とアクションで通知が有効になっているか確認してください。'
    },
    {
      condition: checks.isMac,
      tip: 'macOSの場合、システム環境設定 > 通知で通知が有効になっているか確認してください。'
    },
    {
      condition: !checks.documentVisible || !checks.documentHasFocus,
      tip: 'タブがアクティブでない場合、通知が表示されない場合があります。このタブをアクティブにして再試行してください。'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>通知設定チェッカー</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={runNotificationChecks} variant="outline" size="sm">
            設定をチェック
          </Button>
          <Button onClick={openBrowserSettings} variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            ブラウザ設定を開く
          </Button>
        </div>

        {Object.keys(checks).length > 0 && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">チェック結果</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>ブラウザサポート:</span>
                  <Badge variant={checks.browserSupport ? 'default' : 'destructive'}>
                    {checks.browserSupport ? 'OK' : 'NG'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>通知許可:</span>
                  <Badge variant={checks.permission === 'granted' ? 'default' : 'destructive'}>
                    {checks.permission}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>セキュアコンテキスト:</span>
                  <Badge variant={checks.secureContext ? 'default' : 'destructive'}>
                    {checks.secureContext ? 'OK' : 'NG'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>タブアクティブ:</span>
                  <Badge variant={checks.documentVisible ? 'default' : 'secondary'}>
                    {checks.documentVisible ? 'OK' : 'NG'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">環境情報</h4>
              <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                <div>ブラウザ: {checks.isChrome && 'Chrome'} {checks.isFirefox && 'Firefox'} {checks.isSafari && 'Safari'} {checks.isEdge && 'Edge'}</div>
                <div>OS: {checks.isWindows && 'Windows'} {checks.isMac && 'macOS'} {checks.isLinux && 'Linux'}</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">トラブルシューティング</h4>
              <div className="space-y-2">
                {troubleshootingTips
                  .filter(tip => tip.condition)
                  .map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>{tip.tip}</span>
                    </div>
                  ))}
                {troubleshootingTips.filter(tip => tip.condition).length === 0 && (
                  <div className="text-sm text-gray-600">設定に問題は見つかりませんでした。</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}