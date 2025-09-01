'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Info, Zap } from 'lucide-react'

export function NotificationEnvironmentInfo() {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  
  const isHTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:'
  
  const environmentStatus = {
    development: isLocalhost,
    production: isHTTPS && !isLocalhost,
    secure: isHTTPS || isLocalhost
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-800">
          <Info className="w-5 h-5" />
          <span>通知環境情報</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-blue-800 mb-2">現在の環境</h4>
          <div className="flex flex-wrap gap-2">
            {environmentStatus.development && (
              <Badge className="bg-yellow-100 text-yellow-800">
                開発環境 (localhost)
              </Badge>
            )}
            {environmentStatus.production && (
              <Badge className="bg-green-100 text-green-800">
                本番環境 (HTTPS)
              </Badge>
            )}
            {environmentStatus.secure ? (
              <Badge className="bg-green-100 text-green-800">
                セキュア
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                非セキュア
              </Badge>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-blue-800 mb-2">通知機能の状況</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-sm">直接ブラウザ通知</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-sm">アプリアイコンバッジ</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-sm">アプリ内通知</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-sm">Service Worker通知</span>
              {environmentStatus.development ? (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <span className="text-sm">FCMプッシュ通知</span>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
        </div>

        {environmentStatus.development && (
          <div className="p-3 bg-yellow-100 border border-yellow-200 rounded">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">開発環境の制限</p>
                <p className="text-yellow-700">
                  Service Worker通知は本番環境（HTTPS）で完全に動作します。
                  現在は直接ブラウザ通知が自動で使用されています。
                </p>
              </div>
            </div>
          </div>
        )}

        {environmentStatus.production && (
          <div className="p-3 bg-green-100 border border-green-200 rounded">
            <div className="flex items-start space-x-2">
              <Zap className="w-4 h-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800">本番環境</p>
                <p className="text-green-700">
                  すべての通知機能が利用可能です！
                  VAPIDキーを設定すると、FCMプッシュ通知も利用できます。
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium text-blue-800 mb-2">実装済み機能</h4>
          <ul className="text-sm space-y-1 text-blue-700">
            <li>✅ 自動フォールバック機能</li>
            <li>✅ 環境検出と最適化</li>
            <li>✅ 詳細なエラーハンドリング</li>
            <li>✅ リアルタイム通知システム</li>
            <li>✅ バッジカウント管理</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}