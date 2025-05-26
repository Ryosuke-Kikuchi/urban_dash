import { DeliveryCaseData, WorkSessionData } from '../src/services/FirebaseService';

describe('ユーザーシナリオテスト', () => {
  describe('実際の配達業務シミュレート', () => {
    it('平日の標準的な勤務日シナリオ', () => {
      // 9:00 勤務開始
      const sessionStart = new Date('2024-01-15T09:00:00');
      const sessionEnd = new Date('2024-01-15T18:00:00');
      
      const session: WorkSessionData = {
        userId: 'test-user',
        startTime: sessionStart,
        endTime: sessionEnd,
        status: 'completed',
        breakPeriods: [
          {
            startTime: new Date('2024-01-15T12:00:00'),
            endTime: new Date('2024-01-15T13:00:00'),
          },
          {
            startTime: new Date('2024-01-15T15:30:00'),
            endTime: new Date('2024-01-15T15:45:00'),
          },
        ],
      };

      const cases: DeliveryCaseData[] = [
        // 午前の案件
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'Uber Eats',
          earnings: 450,
          tip: 0,
          duration: 25,
          timestamp: new Date('2024-01-15T09:30:00'),
          memo: '駅前のマンション',
        },
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'menu',
          earnings: 520,
          tip: 100,
          duration: 35,
          timestamp: new Date('2024-01-15T10:15:00'),
          memo: 'オフィス街、チップあり',
        },
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'Wolt',
          earnings: 380,
          tip: 0,
          duration: 20,
          timestamp: new Date('2024-01-15T11:20:00'),
        },
        // 午後の案件
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'Uber Eats',
          earnings: 600,
          tip: 200,
          duration: 40,
          timestamp: new Date('2024-01-15T13:30:00'),
          memo: '高級住宅街、大口チップ',
        },
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'foodpanda',
          earnings: 420,
          tip: 0,
          duration: 28,
          timestamp: new Date('2024-01-15T14:30:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'menu',
          earnings: 480,
          tip: 50,
          duration: 22,
          timestamp: new Date('2024-01-15T16:00:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session1',
          service: 'Uber Eats',
          earnings: 350,
          tip: 0,
          duration: 18,
          timestamp: new Date('2024-01-15T17:15:00'),
          memo: '最終案件',
        },
      ];

      // 統計計算
      const totalEarnings = cases.reduce((sum, case_) => sum + case_.earnings + case_.tip, 0);
      const totalCaseDuration = cases.reduce((sum, case_) => sum + case_.duration, 0);
      const totalBreakTime = session.breakPeriods.reduce((sum, bp) => {
        if (bp.endTime) {
          return sum + (bp.endTime.getTime() - bp.startTime.getTime()) / 1000;
        }
        return sum;
      }, 0);
      
      const sessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;
      const workingTime = sessionDuration - totalBreakTime;
      const hourlyRate = (totalEarnings / (workingTime / 3600));

      // アサーション
      expect(cases.length).toBe(7);
      expect(totalEarnings).toBe(3550); // 合計収入
      expect(totalCaseDuration).toBe(188); // 合計案件時間（分）
      expect(totalBreakTime).toBe(4500); // 休憩時間（秒）: 1時間15分
      expect(workingTime).toBe(27900); // 実働時間（秒）: 7時間45分
      expect(Math.round(hourlyRate)).toBe(458); // 時給約458円
    });

    it('土日の繁忙期シナリオ', () => {
      const sessionStart = new Date('2024-01-13T11:00:00'); // 土曜日
      
      // 多数の案件（ランチ・ディナータイム集中）
      const cases: DeliveryCaseData[] = [];
      const services = ['Uber Eats', 'menu', 'Wolt', 'foodpanda'];
      
      // ランチタイム（11:30-14:30）
      for (let i = 0; i < 8; i++) {
        cases.push({
          userId: 'test-user',
          workSessionId: 'session2',
          service: services[i % services.length],
          earnings: 400 + Math.floor(Math.random() * 200),
          tip: Math.floor(Math.random() * 150),
          duration: 20 + Math.floor(Math.random() * 20),
          timestamp: new Date(sessionStart.getTime() + (30 + i * 22) * 60 * 1000),
        });
      }

      // ディナータイム（17:00-21:00）
      for (let i = 0; i < 12; i++) {
        cases.push({
          userId: 'test-user',
          workSessionId: 'session2',
          service: services[i % services.length],
          earnings: 450 + Math.floor(Math.random() * 250),
          tip: Math.floor(Math.random() * 200),
          duration: 25 + Math.floor(Math.random() * 25),
          timestamp: new Date(new Date('2024-01-13T17:00:00').getTime() + i * 20 * 60 * 1000),
        });
      }

      const totalEarnings = cases.reduce((sum, case_) => sum + case_.earnings + case_.tip, 0);
      const totalCases = cases.length;

      expect(totalCases).toBe(20);
      expect(totalEarnings).toBeGreaterThan(9000); // 繁忙期なので高収入
    });
  });

  describe('長時間勤務のテスト', () => {
    it('12時間勤務のシナリオ', () => {
      const sessionStart = new Date('2024-01-20T08:00:00');
      const sessionEnd = new Date('2024-01-20T20:00:00');

      const session: WorkSessionData = {
        userId: 'test-user',
        startTime: sessionStart,
        endTime: sessionEnd,
        status: 'completed',
        breakPeriods: [
          // 朝食休憩
          {
            startTime: new Date('2024-01-20T10:30:00'),
            endTime: new Date('2024-01-20T10:45:00'),
          },
          // 昼食休憩
          {
            startTime: new Date('2024-01-20T13:00:00'),
            endTime: new Date('2024-01-20T14:00:00'),
          },
          // 夕食休憩
          {
            startTime: new Date('2024-01-20T17:30:00'),
            endTime: new Date('2024-01-20T18:00:00'),
          },
        ],
      };

      const sessionDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;
      const totalBreakTime = session.breakPeriods.reduce((sum, bp) => {
        if (bp.endTime) {
          return sum + (bp.endTime.getTime() - bp.startTime.getTime()) / 1000;
        }
        return sum;
      }, 0);

      const workingTime = sessionDuration - totalBreakTime;

      expect(sessionDuration).toBe(43200); // 12時間
      expect(totalBreakTime).toBe(6300); // 1時間45分
      expect(workingTime).toBe(36900); // 10時間15分
    });

    it('疲労度に応じた効率低下の検証', () => {
      // 勤務時間が長くなるにつれて案件効率が下がることをシミュレート
      const calculateEfficiency = (workingHours: number): number => {
        if (workingHours <= 4) return 1.0;
        if (workingHours <= 8) return 0.9;
        if (workingHours <= 12) return 0.7;
        return 0.5;
      };

      expect(calculateEfficiency(2)).toBe(1.0);
      expect(calculateEfficiency(6)).toBe(0.9);
      expect(calculateEfficiency(10)).toBe(0.7);
      expect(calculateEfficiency(14)).toBe(0.5);
    });
  });

  describe('複数案件記録のテスト', () => {
    it('異なるサービスの混在案件', () => {
      const cases: DeliveryCaseData[] = [
        {
          userId: 'test-user',
          workSessionId: 'session3',
          service: 'Uber Eats',
          earnings: 500,
          tip: 0,
          duration: 30,
          timestamp: new Date('2024-01-21T12:00:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session3',
          service: 'menu',
          earnings: 450,
          tip: 100,
          duration: 25,
          timestamp: new Date('2024-01-21T12:45:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session3',
          service: 'Wolt',
          earnings: 600,
          tip: 200,
          duration: 35,
          timestamp: new Date('2024-01-21T13:30:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session3',
          service: 'その他',
          earnings: 800,
          tip: 0,
          duration: 45,
          timestamp: new Date('2024-01-21T14:30:00'),
          memo: 'カスタムサービス案件',
        },
      ];

      const serviceStats = cases.reduce((stats, case_) => {
        if (!stats[case_.service]) {
          stats[case_.service] = { count: 0, earnings: 0 };
        }
        stats[case_.service].count++;
        stats[case_.service].earnings += case_.earnings + case_.tip;
        return stats;
      }, {} as Record<string, { count: number; earnings: number }>);

      expect(Object.keys(serviceStats)).toHaveLength(4);
      expect(serviceStats['Uber Eats'].count).toBe(1);
      expect(serviceStats['Uber Eats'].earnings).toBe(500);
      expect(serviceStats['Wolt'].earnings).toBe(800);
      expect(serviceStats['その他'].count).toBe(1);
    });

    it('連続案件の時間間隔検証', () => {
      const cases: DeliveryCaseData[] = [
        {
          userId: 'test-user',
          workSessionId: 'session4',
          service: 'Uber Eats',
          earnings: 400,
          tip: 0,
          duration: 20,
          timestamp: new Date('2024-01-22T12:00:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session4',
          service: 'menu',
          earnings: 500,
          tip: 0,
          duration: 30,
          timestamp: new Date('2024-01-22T12:25:00'),
        },
        {
          userId: 'test-user',
          workSessionId: 'session4',
          service: 'Wolt',
          earnings: 450,
          tip: 50,
          duration: 25,
          timestamp: new Date('2024-01-22T13:10:00'),
        },
      ];

      // 案件間の間隔を計算
      const intervals: number[] = [];
      for (let i = 1; i < cases.length; i++) {
        const prevCaseEnd = new Date(cases[i-1].timestamp.getTime() + cases[i-1].duration * 60 * 1000);
        const currentCaseStart = cases[i].timestamp;
        const interval = (currentCaseStart.getTime() - prevCaseEnd.getTime()) / (1000 * 60); // 分単位
        intervals.push(interval);
      }

      expect(intervals[0]).toBe(5); // 第1-2案件間: 5分間隔
      expect(intervals[1]).toBe(15); // 第2-3案件間: 15分間隔
    });
  });

  describe('エラーケースのテスト', () => {
    it('不正な案件データの検出', () => {
      const invalidCases = [
        {
          service: '', // 空のサービス名
          earnings: 500,
          duration: 30,
        },
        {
          service: 'Uber Eats',
          earnings: -100, // 負の報酬
          duration: 30,
        },
        {
          service: 'menu',
          earnings: 500,
          duration: 0, // 0分の所要時間
        },
        {
          service: 'Wolt',
          earnings: 200000, // 異常に高い報酬
          duration: 30,
        },
      ];

      const validateCase = (caseData: any): boolean => {
        return (
          caseData.service &&
          caseData.service.trim() !== '' &&
          caseData.earnings >= 0 &&
          caseData.earnings <= 100000 &&
          caseData.duration > 0 &&
          caseData.duration <= 480
        );
      };

      invalidCases.forEach((case_, _index) => {
        expect(validateCase(case_)).toBe(false);
      });
    });

    it('セッション外案件の検出', () => {
      const sessionStart = new Date('2024-01-23T09:00:00');
      const sessionEnd = new Date('2024-01-23T18:00:00');

      const cases = [
        {
          timestamp: new Date('2024-01-23T08:30:00'), // セッション開始前
          valid: false,
        },
        {
          timestamp: new Date('2024-01-23T12:00:00'), // セッション中
          valid: true,
        },
        {
          timestamp: new Date('2024-01-23T18:30:00'), // セッション終了後
          valid: false,
        },
      ];

      cases.forEach(case_ => {
        const isInSession = case_.timestamp >= sessionStart && case_.timestamp <= sessionEnd;
        expect(isInSession).toBe(case_.valid);
      });
    });

    it('異常な勤務時間の検出', () => {
      const abnormalSessions = [
        {
          startTime: new Date('2024-01-24T09:00:00'),
          endTime: new Date('2024-01-24T08:00:00'), // 終了時刻が開始時刻より前
          valid: false,
        },
        {
          startTime: new Date('2024-01-24T09:00:00'),
          endTime: new Date('2024-01-25T09:00:00'), // 24時間勤務
          valid: false,
        },
        {
          startTime: new Date('2024-01-24T09:00:00'),
          endTime: new Date('2024-01-24T17:00:00'), // 正常な8時間勤務
          valid: true,
        },
      ];

      abnormalSessions.forEach(session => {
        const duration = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60); // 時間単位
        const isValid = duration > 0 && duration <= 18; // 最大18時間まで許可
        expect(isValid).toBe(session.valid);
      });
    });
  });
}); 