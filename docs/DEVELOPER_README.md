# Urban Dash 開発者向けREADME

## プロジェクト概要

Urban Dashは、デリバリードライバー向けの勤務時間・収入管理React Nativeアプリケーションです。

### 主要機能

- 📊 勤務時間・休憩時間の記録と管理
- 💰 案件ごとの収入・チップ記録
- 📈 詳細な統計とグラフ表示
- ⏱️ 地蔵時間（待機時間）の自動計算
- 💵 実質時給のリアルタイム計算
- 📱 オフライン対応
- 🔄 リアルタイムデータ同期

## 技術スタック

### フロントエンド
- **React Native** 0.72.x
- **TypeScript** 4.9.x
- **React Navigation** 6.x（画面遷移）
- **React Native Elements** 3.x（UIコンポーネント）
- **React Context API**（状態管理）

### バックエンド
- **Firebase Authentication**（認証）
- **Firebase Firestore**（データベース）
- **Firebase Hosting**（ウェブホスティング）

### 開発ツール
- **Jest**（テスト）
- **ESLint**（コード品質）
- **Prettier**（コードフォーマット）
- **TypeScript**（型安全性）

## プロジェクト構造

```
UrbanDash/
├── src/
│   ├── components/          # 再利用可能なコンポーネント
│   │   ├── AddCaseModal.tsx
│   │   └── ...
│   ├── screens/             # 画面コンポーネント
│   │   ├── HomeScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── StatisticsScreen.tsx
│   │   └── ...
│   ├── context/             # React Context
│   │   ├── AuthContext.tsx
│   │   └── WorkContext.tsx
│   ├── services/            # 外部サービス連携
│   │   ├── FirebaseService.ts
│   │   └── StorageService.ts
│   ├── utils/               # ユーティリティ関数
│   │   ├── performance.ts
│   │   └── sanitization.ts
│   ├── config/              # 設定ファイル
│   │   └── app.ts
│   └── navigation/          # ナビゲーション設定
├── __tests__/               # テストファイル
├── docs/                    # ドキュメント
├── android/                 # Android固有設定
├── ios/                     # iOS固有設定
└── package.json
```

## セットアップ

### 前提条件

- Node.js 16.x 以上
- npm または yarn
- React Native CLI
- Android Studio（Android開発）
- Xcode（iOS開発）
- Firebase プロジェクト

### インストール手順

1. **リポジトリのクローン**
```bash
git clone https://github.com/urbandash/app.git
cd UrbanDash
```

2. **依存関係のインストール**
```bash
npm install
# または
yarn install
```

3. **Firebase設定**
```bash
# firebase.jsonとfirestore.rulesを設定
# google-services.jsonをandroid/app/に配置
# GoogleService-Info.plistをios/UrbanDash/に配置
```

4. **環境変数の設定**
```bash
# .envファイルを作成
cp .env.example .env
# Firebase設定を記入
```

5. **iOS依存関係（iOS開発の場合）**
```bash
cd ios && pod install && cd ..
```

6. **アプリの起動**
```bash
# Androidエミュレータ
npm run android

# iOSシミュレータ
npm run ios

# Metro Bundler
npm start
```

## 開発ワークフロー

### ブランチ戦略

- `main` - 本番環境
- `develop` - 開発環境
- `feature/機能名` - 機能開発
- `hotfix/修正内容` - 緊急修正

### コミット規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### プルリクエスト

1. `develop`ブランチから`feature/機能名`ブランチを作成
2. 機能開発・テスト実装
3. プルリクエスト作成
4. コードレビュー
5. `develop`ブランチにマージ

## アーキテクチャ

### データフロー

```
UI Component
    ↓
Context API (状態管理)
    ↓
Service Layer (Firebase)
    ↓
Firestore Database
```

### 主要なContext

**AuthContext**
- ユーザー認証状態管理
- ログイン・ログアウト処理
- ユーザープロファイル管理

**WorkContext**
- 勤務状態管理
- 時間計算（勤務・休憩・地蔵時間）
- 案件管理
- 統計計算

### サービス層

**FirebaseService**
- Firestore操作の抽象化
- エラーハンドリング
- オフライン対応

**StorageService**
- ローカルストレージ管理
- 設定保存
- キャッシュ管理

## テスト

### テスト種別

1. **単体テスト**（`__tests__/calculations.test.ts`）
   - 計算ロジック
   - データ変換関数
   - バリデーション関数

2. **統合テスト**（`__tests__/integration.test.ts`）
   - フロー全体のテスト
   - API連携テスト

3. **シナリオテスト**（`__tests__/scenarios.test.ts`）
   - ユーザーシナリオ
   - エラーケース

### テスト実行

```bash
# 全テスト実行
npm test

# テストカバレッジ
npm run test:coverage

# 特定ファイルのテスト
npm test calculations.test.ts
```

## デバッグ

### ログ出力

```typescript
import { sanitizeDebugInfo } from '../utils/sanitization';

// 開発環境でのみログ出力
if (__DEV__) {
  console.log('Debug:', sanitizeDebugInfo(data));
}
```

### Flipper連携

React Native Flipperを使用してデバッグ情報を確認できます。

### React Native Debugger

Chrome DevToolsまたはReact Native Debuggerを使用してデバッグ可能です。

## パフォーマンス最適化

### メモ化

```typescript
import { useOptimizedCalculations } from '../utils/performance';

// 計算結果をメモ化
const {
  workingTimeFormatted,
  hourlyRateFormatted
} = useOptimizedCalculations(/* params */);
```

### レンダリング最適化

- React.memo の使用
- useCallback / useMemo の適切な使用
- 不要なレンダリングの防止

### メモリ管理

```typescript
import { useMemoryMonitor } from '../utils/performance';

const { checkMemoryUsage } = useMemoryMonitor();
```

## セキュリティ

### 入力値サニタイゼーション

```typescript
import { sanitizeDeliveryCaseData } from '../utils/sanitization';

const sanitizedData = sanitizeDeliveryCaseData(inputData);
```

### Firestoreセキュリティルール

`firestore.rules`ファイルで厳格なアクセス制御を実装。

## デプロイ

### Android

```bash
# リリースビルド作成
cd android
./gradlew assembleRelease

# APKファイルは android/app/build/outputs/apk/release/ に生成
```

### iOS

```bash
# Xcodeでリリースビルド作成
# または
npx react-native run-ios --configuration Release
```

### Firebase

```bash
# Firestoreルールのデプロイ
firebase deploy --only firestore:rules

# インデックスのデプロイ
firebase deploy --only firestore:indexes
```

## 環境変数

### 必要な環境変数

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:android:abc123def456
```

## トラブルシューティング

### よくある問題

1. **Metroサーバーが起動しない**
```bash
npx react-native start --reset-cache
```

2. **Androidビルドエラー**
```bash
cd android && ./gradlew clean && cd ..
```

3. **iOSビルドエラー**
```bash
cd ios && pod install && cd ..
```

4. **Firebase接続エラー**
- google-services.json / GoogleService-Info.plist の配置確認
- Firebase設定の確認

### ログの確認

```bash
# Androidログ
npx react-native log-android

# iOSログ
npx react-native log-ios
```

## コントリビューション

### コーディング規約

1. **TypeScript厳格モード使用**
2. **ESLint・Prettierルールに従う**
3. **コンポーネントの適切な分割**
4. **テストの記述**
5. **型安全性の確保**

### レビューポイント

- パフォーマンスへの影響
- セキュリティの考慮
- ユーザビリティ
- コードの可読性
- テストカバレッジ

## リソース

### 公式ドキュメント

- [React Native](https://reactnative.dev/)
- [Firebase](https://firebase.google.com/docs)
- [React Navigation](https://reactnavigation.org/)

### 参考資料

- [React Native Best Practices](https://github.com/microsoft/react-native-code-push)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## お問い合わせ

### 開発チーム

- **テックリード**: tech-lead@urbandash.app
- **プロダクトマネージャー**: pm@urbandash.app
- **デザイナー**: design@urbandash.app

### サポート

- **GitHub Issues**: https://github.com/urbandash/app/issues
- **開発者Slack**: #urbandash-dev
- **技術ブログ**: https://tech.urbandash.app

---

**Happy Coding! 🚀** 