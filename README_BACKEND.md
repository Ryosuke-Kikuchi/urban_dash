# Urban Dash - バックエンド設定ガイド

## 概要

Urban Dashは配達業務の効率化を目的としたReact Nativeアプリケーションです。このドキュメントでは、バックエンド（Firebase/Firestore）の設定と使用方法について説明します。

## バックエンド構成

### Firebase/Firestore

- **認証**: Firebase Authentication（メール/パスワード）
- **データベース**: Cloud Firestore
- **セキュリティ**: Firestoreセキュリティルール

### データ構造

#### 1. users コレクション
```typescript
interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. workSessions コレクション
```typescript
interface WorkSession {
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed';
  breakPeriods: BreakPeriod[];
  _totalWorkingDurationSeconds?: number;
  _totalBreakDurationSeconds?: number;
  _totalEarnings?: number;
  _totalCases?: number;
  _averageHourlyRate?: number;
}
```

#### 3. deliveryCases コレクション
```typescript
interface DeliveryCase {
  userId: string;
  workSessionId: string;
  service: string;
  earnings: number;
  tip: number;
  duration: number; // 分単位
  timestamp: Date;
  memo?: string;
}
```

## セキュリティルール

Firestoreセキュリティルールは以下の原則に基づいて設定されています：

1. **認証必須**: すべての操作で認証が必要
2. **ユーザー分離**: ユーザーは自分のデータのみアクセス可能
3. **読み取り権限**: 認証済みユーザーはリスト操作が可能

### 現在のルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーコレクション
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 勤務セッションコレクション
    match /workSessions/{sessionId} {
      allow read, write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.userId);
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow list: if request.auth != null;
    }
    
    // 配達案件コレクション
    match /deliveryCases/{caseId} {
      allow read, write: if request.auth != null && 
        (resource == null || request.auth.uid == resource.data.userId);
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow list: if request.auth != null;
    }
  }
}
```

## バックエンドサービス

### FirebaseService

`src/services/FirebaseService.ts`には、Firestoreとの統合を簡素化するためのサービスクラスが含まれています。

#### 主要機能

1. **ユーザープロファイル管理**
   - `createUserProfile()`: ユーザープロファイル作成
   - `getUserProfile()`: ユーザープロファイル取得
   - `updateUserProfile()`: ユーザープロファイル更新

2. **勤務セッション管理**
   - `createWorkSession()`: 勤務セッション作成
   - `updateWorkSession()`: 勤務セッション更新
   - `getUserWorkSessions()`: ユーザーの勤務セッション取得

3. **配達案件管理**
   - `createDeliveryCase()`: 配達案件作成
   - `getSessionDeliveryCases()`: セッションの配達案件取得
   - `getUserDeliveryCases()`: ユーザーの配達案件取得

4. **統計計算**
   - `calculateSessionStatistics()`: セッション統計の計算

## エラーハンドリング

### 権限エラーの対処

1. **複合インデックスエラー**: 
   - クライアント側でフィルタリングを実装
   - 必要に応じてFirebaseコンソールでインデックスを作成

2. **権限拒否エラー**:
   - セキュリティルールの確認
   - ユーザー認証状態の確認

3. **ネットワークエラー**:
   - オフライン対応
   - リトライ機能

## パフォーマンス最適化

### クエリ最適化

1. **制限付きクエリ**: 大量データの取得を避けるため、limit()を使用
2. **インデックス活用**: 複合クエリに対する適切なインデックス設定
3. **クライアント側フィルタリング**: 複雑な条件はクライアント側で処理

### キャッシュ戦略

1. **Firestoreオフラインキャッシュ**: 自動的にローカルキャッシュを活用
2. **リアルタイム更新**: 必要な場合のみリアルタイムリスナーを使用

## 開発・デバッグ

### ログ出力

- コンソールログでエラーと警告を出力
- 本番環境では適切なログレベルを設定

### データ整合性

- `validateUserData()`: ユーザーデータの整合性チェック
- `calculateSessionStatistics()`: 統計データの再計算

## セットアップ手順

### 1. Firebase プロジェクト設定

1. Firebaseコンソールで新しいプロジェクトを作成
2. Authentication > Sign-in methodで「メール/パスワード」を有効化
3. Firestore Databaseを作成
4. セキュリティルールを設定

### 2. アプリケーション設定

1. `google-services.json`をAndroidプロジェクトに配置
2. Firebase SDKの依存関係を追加
3. 初期化コードを実装

### 3. セキュリティルールのデプロイ

```bash
firebase deploy --only firestore:rules
```

## 監視とメンテナンス

### パフォーマンス監視

- Firebase Performanceを使用してアプリのパフォーマンスを監視
- Firestoreの使用量とコストを定期的に確認

### データバックアップ

- 定期的なデータエクスポート
- `exportUserData()`機能を使用したユーザーデータのバックアップ

## トラブルシューティング

### よくある問題

1. **権限エラー**: セキュリティルールとユーザー認証を確認
2. **インデックスエラー**: Firebaseコンソールでインデックスを作成
3. **ネットワークエラー**: オフライン機能とエラーハンドリングを確認

### デバッグ手順

1. ブラウザの開発者ツールでネットワークタブを確認
2. Firebaseコンソールでデータとルールを確認
3. アプリのログでエラーメッセージを確認

## 今後の拡張

### 予定されている機能

1. **リアルタイム同期**: 複数デバイス間でのデータ同期
2. **オフライン対応**: 完全なオフライン機能
3. **データ分析**: より詳細な統計とレポート機能
4. **バックアップ機能**: 自動データバックアップ

### スケーラビリティ

- Cloud Functionsを使用したサーバーサイド処理
- BigQueryを使用した大規模データ分析
- Cloud Storageを使用したファイル管理

## サポート

技術的な問題や質問がある場合は、以下のリソースを参照してください：

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
