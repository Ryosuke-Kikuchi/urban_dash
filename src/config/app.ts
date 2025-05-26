// アプリケーション設定

export const APP_CONFIG = {
  // アプリ基本情報
  APP_NAME: 'Urban Dash',
  APP_VERSION: '1.0.0',
  APP_BUILD_NUMBER: '1',
  
  // アプリ説明
  APP_DESCRIPTION: 'デリバリードライバー向けの勤務時間・収入管理アプリ',
  APP_TAGLINE: '効率的な配達業務をサポート',
  
  // 開発者情報
  DEVELOPER_NAME: 'Urban Dash Development Team',
  DEVELOPER_EMAIL: 'support@urbandash.app',
  DEVELOPER_WEBSITE: 'https://urbandash.app',
  
  // プライバシー・利用規約
  PRIVACY_POLICY_URL: 'https://urbandash.app/privacy',
  TERMS_OF_SERVICE_URL: 'https://urbandash.app/terms',
  SUPPORT_URL: 'https://urbandash.app/support',
  
  // アプリストア情報
  GOOGLE_PLAY_URL: 'https://play.google.com/store/apps/details?id=com.urbandash.app',
  APP_STORE_URL: 'https://apps.apple.com/app/urban-dash/id123456789',
  
  // ソーシャルメディア
  TWITTER_URL: 'https://twitter.com/urbandash_app',
  FACEBOOK_URL: 'https://facebook.com/urbandash',
  
  // Firebase設定
  FIREBASE_CONFIG: {
    // 本番環境用の設定（実際の値は環境変数から取得）
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  },
  
  // アプリの機能設定
  FEATURES: {
    // 統計グラフの表示
    ENABLE_CHARTS: true,
    // オフライン機能
    ENABLE_OFFLINE: true,
    // 通知機能
    ENABLE_NOTIFICATIONS: true,
    // データエクスポート
    ENABLE_DATA_EXPORT: true,
    // ダークテーマ
    ENABLE_DARK_THEME: true,
    // 多言語対応
    ENABLE_MULTILANGUAGE: false, // 将来の機能
  },
  
  // 制限値
  LIMITS: {
    // 最大勤務時間（分）
    MAX_WORK_DURATION: 18 * 60, // 18時間
    // 最大案件数（1日）
    MAX_DAILY_CASES: 100,
    // 最大履歴保持期間（日）
    MAX_HISTORY_DAYS: 365,
    // 最大報酬金額
    MAX_EARNINGS: 100000,
    // 最大チップ金額
    MAX_TIP: 50000,
    // 最大所要時間（分）
    MAX_DURATION: 480,
    // 最大メモ文字数
    MAX_MEMO_LENGTH: 500,
  },
  
  // デフォルト値
  DEFAULTS: {
    // デフォルトサービス
    DEFAULT_SERVICE: 'Uber Eats',
    // デフォルトテーマ
    DEFAULT_THEME: 'dark',
    // デフォルト言語
    DEFAULT_LANGUAGE: 'ja',
    // タイマー更新間隔（ミリ秒）
    TIMER_UPDATE_INTERVAL: 1000,
    // データ同期間隔（ミリ秒）
    SYNC_INTERVAL: 30000,
  },
  
  // 色設定
  COLORS: {
    PRIMARY: '#FF3B30',
    SECONDARY: '#1E1E1E',
    BACKGROUND: '#121212',
    SURFACE: '#2C2C2C',
    TEXT: '#E0E0E0',
    TEXT_SECONDARY: '#A0A0A0',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    ERROR: '#F44336',
    INFO: '#2196F3',
  },
  
  // アニメーション設定
  ANIMATIONS: {
    // 標準アニメーション時間
    DURATION_SHORT: 200,
    DURATION_MEDIUM: 300,
    DURATION_LONG: 500,
    // フェードイン/アウト時間
    FADE_DURATION: 250,
    // スライドアニメーション時間
    SLIDE_DURATION: 300,
  },
  
  // レイアウト設定
  LAYOUT: {
    // 画面の余白
    SCREEN_PADDING: 20,
    // カード間の余白
    CARD_MARGIN: 16,
    // ボタンの高さ
    BUTTON_HEIGHT: 48,
    // 入力フィールドの高さ
    INPUT_HEIGHT: 56,
    // アイコンサイズ
    ICON_SIZE: 24,
  },
  
  // ネットワーク設定
  NETWORK: {
    // タイムアウト時間（ミリ秒）
    TIMEOUT: 10000,
    // リトライ回数
    RETRY_COUNT: 3,
    // オフライン検出間隔
    OFFLINE_CHECK_INTERVAL: 5000,
  },
  
  // セキュリティ設定
  SECURITY: {
    // セッションタイムアウト（ミリ秒）
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24時間
    // パスワード最小長
    MIN_PASSWORD_LENGTH: 8,
    // 自動ログアウト時間（ミリ秒）
    AUTO_LOGOUT_TIME: 30 * 60 * 1000, // 30分
  },
  
  // パフォーマンス設定
  PERFORMANCE: {
    // 画像キャッシュサイズ（MB）
    IMAGE_CACHE_SIZE: 50,
    // データキャッシュサイズ（件数）
    DATA_CACHE_SIZE: 1000,
    // メモリ警告閾値（MB）
    MEMORY_WARNING_THRESHOLD: 100,
  },
};

// 環境別設定
export const getEnvironmentConfig = () => {
  if (__DEV__) {
    return {
      ...APP_CONFIG,
      // 開発環境用の設定
      NETWORK: {
        ...APP_CONFIG.NETWORK,
        TIMEOUT: 30000, // 開発時は長めに設定
      },
      FEATURES: {
        ...APP_CONFIG.FEATURES,
        // 開発時はすべての機能を有効化
        ENABLE_CHARTS: true,
        ENABLE_OFFLINE: true,
        ENABLE_NOTIFICATIONS: true,
        ENABLE_DATA_EXPORT: true,
      },
    };
  }
  
  return APP_CONFIG;
};

// アプリ情報取得関数
export const getAppInfo = () => ({
  name: APP_CONFIG.APP_NAME,
  version: APP_CONFIG.APP_VERSION,
  buildNumber: APP_CONFIG.APP_BUILD_NUMBER,
  description: APP_CONFIG.APP_DESCRIPTION,
});

// サポート情報取得関数
export const getSupportInfo = () => ({
  email: APP_CONFIG.DEVELOPER_EMAIL,
  website: APP_CONFIG.DEVELOPER_WEBSITE,
  supportUrl: APP_CONFIG.SUPPORT_URL,
});

// 制限値チェック関数
export const isWithinLimits = {
  earnings: (value: number) => value >= 0 && value <= APP_CONFIG.LIMITS.MAX_EARNINGS,
  tip: (value: number) => value >= 0 && value <= APP_CONFIG.LIMITS.MAX_TIP,
  duration: (value: number) => value > 0 && value <= APP_CONFIG.LIMITS.MAX_DURATION,
  memo: (text: string) => text.length <= APP_CONFIG.LIMITS.MAX_MEMO_LENGTH,
  workDuration: (minutes: number) => minutes <= APP_CONFIG.LIMITS.MAX_WORK_DURATION,
  dailyCases: (count: number) => count <= APP_CONFIG.LIMITS.MAX_DAILY_CASES,
}; 