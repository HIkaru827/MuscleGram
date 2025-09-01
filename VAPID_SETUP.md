# 🔔 MuscleGram 通知設定ガイド

## VAPIDキーの設定方法

MuscleGramでプッシュ通知を有効にするには、Firebase Cloud MessagingのVAPIDキーが必要です。

### 手順1: Firebaseプロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択
3. 「プロジェクトの設定」（歯車アイコン）をクリック
4. 「Cloud Messaging」タブを選択

### 手順2: VAPIDキーの生成

1. 「Web configuration」セクションで「Generate key pair」をクリック
2. 生成された「Key pair」の値をコピー

### 手順3: 環境変数の設定

`.env.local`ファイルに以下を追加：

```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 手順4: 動作確認

1. 開発サーバーを再起動
2. ブラウザでアプリにアクセス
3. 通知許可を求められたら「許可」をクリック
4. コンソールで「FCM token generated」メッセージを確認

## 通知の種類

### ✅ 現在利用可能
- **ローカル通知**: ブラウザの通知API
- **アプリ内通知**: NotificationButtonの通知一覧
- **アプリアイコンバッジ**: 未読通知数の表示

### 🚀 VAPIDキー設定後に利用可能
- **バックグラウンドプッシュ通知**: アプリが閉じていても通知
- **サーバーからの通知**: 他ユーザーのアクションによる通知

## トラブルシューティング

### 問題: 通知が表示されない
1. ブラウザの通知設定を確認
2. HTTPSまたはlocalhostでアクセス
3. デベロッパーツールのコンソールでエラーを確認

### 問題: FCMトークンが生成されない
1. VAPIDキーが正しく設定されているか確認
2. Firebase設定が完全か確認
3. ブラウザがプッシュ通知をサポートしているか確認

## 開発者向け情報

### デバッグツール
- プロファイル画面の「デバッグ」タブで詳細情報を確認
- `/api/firebase-config`で設定状況を確認

### コンソールメッセージ
- `🔔 Local notifications are ready!`: ローカル通知が利用可能
- `FCM token generated`: プッシュ通知が完全に利用可能
- `VAPID key not configured`: VAPIDキーの設定が必要