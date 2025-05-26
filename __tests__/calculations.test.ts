import { DeliveryCaseData } from '../src/services/FirebaseService';

// WorkContextの計算ロジックのテスト用関数
const calculateWaitingTime = (
  workingTimeSeconds: number,
  cases: DeliveryCaseData[]
): number => {
  const totalCaseDuration = cases.reduce((sum, case_) => sum + (case_.duration * 60), 0);
  return Math.max(0, workingTimeSeconds - totalCaseDuration);
};

const calculateDetailedWaitingTime = (
  sessionStart: Date,
  sessionEnd: Date | null,
  cases: DeliveryCaseData[]
) => {
  const now = sessionEnd || new Date();
  const sortedCases = [...cases].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let beforeFirstCase = 0;
  let betweenCases = 0;
  let afterLastCase = 0;

  if (sortedCases.length === 0) {
    const sessionTimeSeconds = (now.getTime() - sessionStart.getTime()) / 1000;
    beforeFirstCase = Math.max(0, sessionTimeSeconds);
  } else {
    // 勤務開始から最初の案件まで
    const firstCaseTime = sortedCases[0].timestamp;
    const timeUntilFirstCase = (firstCaseTime.getTime() - sessionStart.getTime()) / 1000;
    beforeFirstCase = Math.max(0, timeUntilFirstCase);

    // 案件間の待機時間
    for (let i = 1; i < sortedCases.length; i++) {
      const prevCase = sortedCases[i - 1];
      const currentCase = sortedCases[i];
      
      const prevCaseEndTime = new Date(prevCase.timestamp.getTime() + (prevCase.duration * 60 * 1000));
      const waitingBetween = (currentCase.timestamp.getTime() - prevCaseEndTime.getTime()) / 1000;
      betweenCases += Math.max(0, waitingBetween);
    }

    // 最後の案件から現在まで
    const lastCase = sortedCases[sortedCases.length - 1];
    const lastCaseEndTime = new Date(lastCase.timestamp.getTime() + (lastCase.duration * 60 * 1000));
    afterLastCase = Math.max(0, (now.getTime() - lastCaseEndTime.getTime()) / 1000);
  }

  const totalWaitingTime = beforeFirstCase + betweenCases + afterLastCase;

  return {
    totalWaitingTime,
    beforeFirstCase,
    betweenCases,
    afterLastCase,
  };
};

const calculateHourlyRate = (totalEarnings: number, workingTimeSeconds: number): number => {
  const workingTimeHours = workingTimeSeconds / 3600;
  return workingTimeHours > 0 ? totalEarnings / workingTimeHours : 0;
};

describe('計算ロジックのテスト', () => {
  describe('地蔵時間計算', () => {
    it('案件がない場合、全て地蔵時間になる', () => {
      const workingTime = 7200; // 2時間
      const cases: DeliveryCaseData[] = [];
      
      const waitingTime = calculateWaitingTime(workingTime, cases);
      expect(waitingTime).toBe(7200);
    });

    it('案件時間を正しく差し引く', () => {
      const workingTime = 7200; // 2時間
      const cases: DeliveryCaseData[] = [
        {
          userId: 'test',
          workSessionId: 'test',
          service: 'Uber Eats',
          earnings: 500,
          tip: 0,
          duration: 30, // 30分
          timestamp: new Date(),
        },
        {
          userId: 'test',
          workSessionId: 'test',
          service: 'menu',
          earnings: 400,
          tip: 100,
          duration: 20, // 20分
          timestamp: new Date(),
        },
      ];
      
      const waitingTime = calculateWaitingTime(workingTime, cases);
      expect(waitingTime).toBe(4200); // 7200 - (30*60 + 20*60) = 4200
    });

    it('案件時間が勤務時間を超える場合、地蔵時間は0になる', () => {
      const workingTime = 1800; // 30分
      const cases: DeliveryCaseData[] = [
        {
          userId: 'test',
          workSessionId: 'test',
          service: 'Uber Eats',
          earnings: 500,
          tip: 0,
          duration: 60, // 60分
          timestamp: new Date(),
        },
      ];
      
      const waitingTime = calculateWaitingTime(workingTime, cases);
      expect(waitingTime).toBe(0);
    });
  });

  describe('詳細地蔵時間計算', () => {
    it('案件がない場合の計算', () => {
      const sessionStart = new Date('2024-01-01T09:00:00');
      const sessionEnd = new Date('2024-01-01T17:00:00');
      const cases: DeliveryCaseData[] = [];
      
      const result = calculateDetailedWaitingTime(sessionStart, sessionEnd, cases);
      expect(result.beforeFirstCase).toBe(28800); // 8時間
      expect(result.betweenCases).toBe(0);
      expect(result.afterLastCase).toBe(0);
      expect(result.totalWaitingTime).toBe(28800);
    });

    it('案件間の待機時間を正しく計算', () => {
      const sessionStart = new Date('2024-01-01T09:00:00');
      const sessionEnd = new Date('2024-01-01T17:00:00');
      const cases: DeliveryCaseData[] = [
        {
          userId: 'test',
          workSessionId: 'test',
          service: 'Uber Eats',
          earnings: 500,
          tip: 0,
          duration: 30, // 30分
          timestamp: new Date('2024-01-01T10:00:00'), // 勤務開始から1時間後
        },
        {
          userId: 'test',
          workSessionId: 'test',
          service: 'menu',
          earnings: 400,
          tip: 100,
          duration: 20, // 20分
          timestamp: new Date('2024-01-01T12:00:00'), // 最初の案件終了から90分後
        },
      ];
      
      const result = calculateDetailedWaitingTime(sessionStart, sessionEnd, cases);
      expect(result.beforeFirstCase).toBe(3600); // 1時間
      expect(result.betweenCases).toBe(5400); // 90分
      expect(result.afterLastCase).toBe(18000); // 最後の案件終了(12:20)から17:00まで280分
    });
  });

  describe('実質時給計算', () => {
    it('正常な時給計算', () => {
      const totalEarnings = 2000;
      const workingTimeSeconds = 7200; // 2時間
      
      const hourlyRate = calculateHourlyRate(totalEarnings, workingTimeSeconds);
      expect(hourlyRate).toBe(1000);
    });

    it('勤務時間が0の場合は0を返す', () => {
      const totalEarnings = 2000;
      const workingTimeSeconds = 0;
      
      const hourlyRate = calculateHourlyRate(totalEarnings, workingTimeSeconds);
      expect(hourlyRate).toBe(0);
    });

    it('報酬が0の場合は0を返す', () => {
      const totalEarnings = 0;
      const workingTimeSeconds = 7200;
      
      const hourlyRate = calculateHourlyRate(totalEarnings, workingTimeSeconds);
      expect(hourlyRate).toBe(0);
    });

    it('小数点の計算も正確に行う', () => {
      const totalEarnings = 1500;
      const workingTimeSeconds = 5400; // 1.5時間
      
      const hourlyRate = calculateHourlyRate(totalEarnings, workingTimeSeconds);
      expect(hourlyRate).toBe(1000);
    });
  });
});

describe('データ変換関数のテスト', () => {
  describe('時間フォーマット', () => {
    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}時間${minutes}分`;
    };

    it('秒を時間分形式に変換', () => {
      expect(formatTime(3661)).toBe('1時間1分');
      expect(formatTime(7200)).toBe('2時間0分');
      expect(formatTime(0)).toBe('0時間0分');
      expect(formatTime(59)).toBe('0時間0分');
      expect(formatTime(60)).toBe('0時間1分');
    });
  });

  describe('通貨フォーマット', () => {
    const formatCurrency = (amount: number): string => {
      return `¥${Math.floor(amount).toLocaleString()}`;
    };

    it('金額を通貨形式に変換', () => {
      expect(formatCurrency(1000)).toBe('¥1,000');
      expect(formatCurrency(12345)).toBe('¥12,345');
      expect(formatCurrency(0)).toBe('¥0');
      expect(formatCurrency(999.9)).toBe('¥999');
    });
  });
});

describe('バリデーション関数のテスト', () => {
  describe('報酬バリデーション', () => {
    const validateEarnings = (earnings: string): boolean => {
      const num = Number(earnings);
      return !isNaN(num) && num >= 0 && num <= 100000;
    };

    it('有効な報酬値', () => {
      expect(validateEarnings('500')).toBe(true);
      expect(validateEarnings('0')).toBe(true);
      expect(validateEarnings('100000')).toBe(true);
    });

    it('無効な報酬値', () => {
      expect(validateEarnings('-1')).toBe(false);
      expect(validateEarnings('100001')).toBe(false);
      expect(validateEarnings('abc')).toBe(false);
      expect(validateEarnings('')).toBe(false);
    });
  });

  describe('所要時間バリデーション', () => {
    const validateDuration = (duration: string): boolean => {
      const num = Number(duration);
      return !isNaN(num) && num > 0 && num <= 480;
    };

    it('有効な所要時間', () => {
      expect(validateDuration('1')).toBe(true);
      expect(validateDuration('30')).toBe(true);
      expect(validateDuration('480')).toBe(true);
    });

    it('無効な所要時間', () => {
      expect(validateDuration('0')).toBe(false);
      expect(validateDuration('481')).toBe(false);
      expect(validateDuration('-5')).toBe(false);
      expect(validateDuration('abc')).toBe(false);
    });
  });
}); 