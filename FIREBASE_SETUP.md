# Firebase設定手順

MuscleGramでFirebase認証（Googleログイン含む）を有効にするには、以下の手順に従ってください。

## 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：musclegram）
4. Googleアナリティクスを有効にする（推奨）
5. プロジェクトを作成

## 2. Webアプリの追加

1. プロジェクト概要画面で「</>」（Web）アイコンをクリック
2. アプリのニックネームを入力（例：MuscleGram Web）
3. Firebase Hostingは任意で設定
4. アプリを登録

## 3. Firebase設定の取得

アプリ登録後に表示される設定オブジェクトをコピーします：

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijk",
  measurementId: "G-XXXXXXXXXX"
};
```

## 4. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdefghijk
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 5. Authentication の有効化

1. Firebase Consoleで「Authentication」→「Sign-in method」
2. 「Google」プロバイダーを有効化
3. プロジェクトサポートメール、プロジェクト名を設定
4. 承認済みドメインに本番ドメインを追加（例：musclegram.net）

## 6. Firestore の設定

1. 「Firestore Database」→「データベースを作成」
2. 本番モードで開始（セキュリティルールは後で設定）
3. リージョンを選択（asia-northeast1推奨）

## 7. Storage の設定

1. 「Storage」→「使ってみる」
2. セキュリティルールを本番モードで開始
3. ロケーションを選択（asia-northeast1推奨）

## 8. セキュリティルールの設定

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /workout_posts/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /prs/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 9. Vercel での環境変数設定

1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. 上記の環境変数をすべて追加
3. Production, Preview, Development すべてにチェック

## トラブルシューティング

### Googleログインが失敗する場合

1. **承認済みドメインの確認**
   - Firebase Console → Authentication → Settings → Authorized domains
   - 本番ドメイン（musclegram.net）とVercelドメインを追加

2. **APIキーの制限確認**
   - Google Cloud Console → APIs & Services → Credentials
   - APIキーの制限を確認（必要に応じて緩和）

3. **ブラウザの設定確認**
   - ポップアップブロックの無効化
   - サードパーティCookieの有効化

### 一般的なエラー

- `auth/configuration-not-found`: Firebase設定が正しくない
- `auth/invalid-api-key`: APIキーが無効
- `auth/popup-blocked`: ポップアップがブロックされている
- `auth/network-request-failed`: ネットワークエラー

## 完了確認

すべて正しく設定できていれば、以下が動作します：

1. ✅ メールアドレス・パスワードでのログイン/サインアップ
2. ✅ Googleアカウントでのログイン
3. ✅ プロフィール写真のアップロード
4. ✅ ワークアウト記録の保存
5. ✅ PR記録の保存・分析

---

**注意**: デモモードでは一部機能が制限されます。完全な機能を使用するには上記の Firebase 設定が必要です。