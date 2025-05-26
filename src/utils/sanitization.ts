// 入力値サニタイゼーション関数

// HTMLエスケープ
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// SQLインジェクション対策
export const sanitizeSqlInput = (input: string): string => {
  return input
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
};

// XSS対策
export const sanitizeXss = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// メール形式のサニタイゼーション
export const sanitizeEmail = (email: string): string => {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '');
};

// ニックネームのサニタイゼーション
export const sanitizeNickname = (nickname: string): string => {
  return nickname
    .trim()
    .replace(/[<>&"']/g, '')
    .substring(0, 50); // 最大50文字
};

// 数値のサニタイゼーション
export const sanitizeNumber = (input: string, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
  const num = parseFloat(input.replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return 0;
  return Math.max(min, Math.min(max, num));
};

// 報酬のサニタイゼーション
export const sanitizeEarnings = (input: string): number => {
  return sanitizeNumber(input, 0, 100000);
};

// チップのサニタイゼーション
export const sanitizeTip = (input: string): number => {
  return sanitizeNumber(input, 0, 50000);
};

// 所要時間のサニタイゼーション
export const sanitizeDuration = (input: string): number => {
  return sanitizeNumber(input, 1, 480);
};

// サービス名のサニタイゼーション
export const sanitizeService = (service: string): string => {
  return service
    .trim()
    .replace(/[<>&"']/g, '')
    .substring(0, 50);
};

// メモのサニタイゼーション
export const sanitizeMemo = (memo: string): string => {
  return memo
    .trim()
    .replace(/[<>&"']/g, '')
    .substring(0, 500);
};

// 日時のサニタイゼーション
export const sanitizeDate = (date: Date): Date => {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // 未来の日時や1年以上前の日時は現在時刻にリセット
  if (date > now || date < oneYearAgo) {
    return now;
  }
  return date;
};

// パスワードのサニタイゼーション（空白除去のみ）
export const sanitizePassword = (password: string): string => {
  return password.trim();
};

// 配達案件データの一括サニタイゼーション
export const sanitizeDeliveryCaseData = (data: {
  service: string;
  earnings: string;
  tip: string;
  duration: string;
  memo?: string;
}): {
  service: string;
  earnings: number;
  tip: number;
  duration: number;
  memo?: string;
} => {
  return {
    service: sanitizeService(data.service),
    earnings: sanitizeEarnings(data.earnings),
    tip: sanitizeTip(data.tip),
    duration: sanitizeDuration(data.duration),
    memo: data.memo ? sanitizeMemo(data.memo) : undefined,
  };
};

// ユーザープロファイルデータの一括サニタイゼーション
export const sanitizeUserProfileData = (data: {
  email: string;
  nickname: string;
  password: string;
}): {
  email: string;
  nickname: string;
  password: string;
} => {
  return {
    email: sanitizeEmail(data.email),
    nickname: sanitizeNickname(data.nickname),
    password: sanitizePassword(data.password),
  };
};

// 一般的なテキスト入力のサニタイゼーション
export const sanitizeTextInput = (input: string, maxLength: number = 1000): string => {
  return escapeHtml(input.trim()).substring(0, maxLength);
};

// URLのサニタイゼーション
export const sanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // HTTPSのみ許可
    if (parsedUrl.protocol !== 'https:') {
      return '';
    }
    return parsedUrl.toString();
  } catch {
    return '';
  }
};

// デバッグ情報のサニタイゼーション（ログ出力用）
export const sanitizeDebugInfo = (data: any): string => {
  const sanitized = JSON.stringify(data, (key, value) => {
    // パスワードや機密情報をマスク
    if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
      return '***';
    }
    return value;
  });
  return sanitized.substring(0, 1000); // 最大1000文字
}; 