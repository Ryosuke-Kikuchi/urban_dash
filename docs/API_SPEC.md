# Urban Dash API 仕様書

## 概要

Urban Dashアプリケーションで使用されるFirebase Firestore APIの仕様書です。

## 認証

すべてのAPIリクエストはFirebase Authenticationによる認証が必要です。

### 認証方法
- Firebase Auth Email/Password認証
- 認証トークンをリクエストヘッダーに含める

## データモデル

### Users Collection

**Path:** `/users/{userId}`

**Structure:**
```typescript
interface UserData {
  uid: string;                // Firebase Auth UID
  email: string;              // メールアドレス
  nickname: string;           // ニックネーム（1-50文字）
  createdAt: Timestamp;       // 作成日時
  updatedAt: Timestamp;       // 更新日時
}
```

**Security Rules:**
- 認証済みユーザーが自分のデータのみアクセス可能
- 作成・更新時にバリデーション実行

**Operations:**
- `GET /users/{userId}` - ユーザー情報取得
- `POST /users/{userId}` - ユーザー作成
- `PUT /users/{userId}` - ユーザー情報更新

---

### Work Sessions Collection

**Path:** `/workSessions/{sessionId}`

**Structure:**
```typescript
interface WorkSessionData {
  id?: string;                    // ドキュメントID
  userId: string;                 // ユーザーID
  startTime: Timestamp;           // 勤務開始時刻
  endTime?: Timestamp;            // 勤務終了時刻
  status: 'active' | 'completed'; // 勤務状態
  breakPeriods: BreakPeriod[];    // 休憩期間配列
  
  // 集計データ（勤務終了時に計算）
  _totalWorkingDurationSeconds?: number;    // 総勤務時間（秒）
  _totalBreakDurationSeconds?: number;      // 総休憩時間（秒）
  _totalEarnings?: number;                  // 総報酬
  _totalCases?: number;                     // 総案件数
  _averageHourlyRate?: number;              // 平均時給
}

interface BreakPeriod {
  startTime: Timestamp;       // 休憩開始時刻
  endTime?: Timestamp;        // 休憩終了時刻
}
```

**Security Rules:**
- 認証済みユーザーが自分のセッションのみアクセス可能
- クエリ制限: 最大100件
- 作成時: userId検証、必須フィールド検証
- 更新時: userId・startTime変更不可

**Operations:**
- `GET /workSessions/{sessionId}` - セッション詳細取得
- `POST /workSessions` - 新規セッション作成
- `PUT /workSessions/{sessionId}` - セッション更新（休憩・終了）
- `DELETE /workSessions/{sessionId}` - セッション削除
- `GET /workSessions?userId={userId}&limit=100` - セッション一覧取得

**Query Examples:**
```javascript
// 今日のセッション取得
const today = new Date();
today.setHours(0, 0, 0, 0);
const sessions = await firestore()
  .collection('workSessions')
  .where('userId', '==', userId)
  .where('startTime', '>=', today)
  .orderBy('startTime', 'desc')
  .get();

// 完了済みセッション取得
const completedSessions = await firestore()
  .collection('workSessions')
  .where('userId', '==', userId)
  .where('status', '==', 'completed')
  .orderBy('startTime', 'desc')
  .limit(50)
  .get();
```

---

### Delivery Cases Collection

**Path:** `/deliveryCases/{caseId}`

**Structure:**
```typescript
interface DeliveryCaseData {
  id?: string;                // ドキュメントID
  userId: string;             // ユーザーID
  workSessionId: string;      // 関連する勤務セッションID
  service: string;            // デリバリーサービス名（1-50文字）
  earnings: number;           // 報酬（0-100,000円）
  tip: number;                // チップ（0-50,000円）
  duration: number;           // 所要時間（1-480分）
  timestamp: Timestamp;       // 案件実行時刻
  memo?: string;              // メモ（最大500文字）
}
```

**Security Rules:**
- 認証済みユーザーが自分の案件のみアクセス可能
- クエリ制限: 最大500件
- 作成時: 全フィールドバリデーション
- 更新時: userId・workSessionId変更不可

**Operations:**
- `GET /deliveryCases/{caseId}` - 案件詳細取得
- `POST /deliveryCases` - 新規案件作成
- `PUT /deliveryCases/{caseId}` - 案件更新
- `DELETE /deliveryCases/{caseId}` - 案件削除
- `GET /deliveryCases?workSessionId={sessionId}` - セッション別案件取得

**Query Examples:**
```javascript
// セッション別案件取得
const cases = await firestore()
  .collection('deliveryCases')
  .where('workSessionId', '==', sessionId)
  .orderBy('timestamp', 'asc')
  .get();

// 期間別案件取得
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');
const monthlyCases = await firestore()
  .collection('deliveryCases')
  .where('userId', '==', userId)
  .where('timestamp', '>=', startDate)
  .where('timestamp', '<=', endDate)
  .orderBy('timestamp', 'desc')
  .get();

// サービス別集計
const uberCases = await firestore()
  .collection('deliveryCases')
  .where('userId', '==', userId)
  .where('service', '==', 'Uber Eats')
  .get();
```

## エラーハンドリング

### エラーコード

| コード | 説明 | 対処法 |
|--------|------|--------|
| `permission-denied` | 権限不足 | 認証状態確認・再ログイン |
| `not-found` | リソースが見つからない | リソースの存在確認 |
| `invalid-argument` | 無効な引数 | 入力値の検証 |
| `resource-exhausted` | クォータ超過 | リクエスト頻度の調整 |
| `deadline-exceeded` | タイムアウト | ネットワーク状態確認・リトライ |

### エラーレスポンス例

```javascript
try {
  await firestore().collection('workSessions').add(sessionData);
} catch (error) {
  switch (error.code) {
    case 'permission-denied':
      Alert.alert('エラー', '権限がありません。再ログインしてください。');
      break;
    case 'invalid-argument':
      Alert.alert('エラー', '入力値が無効です。');
      break;
    default:
      Alert.alert('エラー', 'データの保存に失敗しました。');
  }
}
```

## バリデーション

### 共通バリデーション
- 認証済みユーザーのみアクセス可能
- ユーザーIDの一致確認
- 必須フィールドの存在確認

### Work Sessions
- `startTime`: 現在時刻から1年以内
- `status`: 'active' または 'completed'
- `breakPeriods`: 最大20件
- `endTime`: startTime以降

### Delivery Cases
- `service`: 1-50文字
- `earnings`: 0-100,000
- `tip`: 0-50,000
- `duration`: 1-480分
- `timestamp`: セッション期間内
- `memo`: 最大500文字

## レート制限

### Firestore制限
- 書き込み: 1秒あたり1回
- 読み取り: 1秒あたり100回
- クエリ結果: 最大1MB

### アプリケーション制限
- Work Sessions クエリ: 最大100件
- Delivery Cases クエリ: 最大500件
- バッチ処理: 最大500操作

## リアルタイム更新

### リスナー設定例

```javascript
// セッションリアルタイム監視
const unsubscribe = firestore()
  .collection('workSessions')
  .where('userId', '==', userId)
  .where('status', '==', 'active')
  .onSnapshot(
    snapshot => {
      // データ更新処理
    },
    error => {
      console.error('リアルタイム更新エラー:', error);
    }
  );

// クリーンアップ
useEffect(() => {
  return () => unsubscribe();
}, []);
```

### パフォーマンス最適化
- 必要最小限のフィールドのみ取得
- インデックスの適切な設定
- リスナーの適切な解除
- キャッシュの活用

## オフライン対応

### キャッシュ設定
```javascript
import firestore from '@react-native-firebase/firestore';

// オフライン永続化有効化
await firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});
```

### オフライン時の動作
- 読み取り: キャッシュからデータ取得
- 書き込み: ローカルに保存、オンライン復帰時に同期
- リアルタイム更新: オンライン時のみ動作

## セキュリティ

### データ保護
- すべてのデータは暗号化されて保存
- ユーザー間のデータアクセス不可
- セキュリティルールによる厳格な制御

### プライバシー
- 個人識別情報の最小化
- データ削除機能の提供
- 利用目的の明確化

## バックアップ・復旧

### 自動バックアップ
- Firebase による自動バックアップ
- 地理的冗長化

### データエクスポート
- ユーザー自身によるデータエクスポート機能
- CSV/JSON形式でのダウンロード

## 更新履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 1.0.0 | 2024-01-01 | 初版作成 |

## お問い合わせ

技術的な質問や問題については、以下にお問い合わせください：

- 開発者メール: support@urbandash.app
- GitHub Issues: https://github.com/urbandash/app/issues 