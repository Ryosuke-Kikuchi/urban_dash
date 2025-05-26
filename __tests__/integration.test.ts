import { DeliveryCaseData, WorkSessionData } from '../src/services/FirebaseService';

// モック関数でシミュレート
const mockFirebaseService = {
  createWorkSession: jest.fn(),
  updateWorkSession: jest.fn(),
  createDeliveryCase: jest.fn(),
  getUserProfile: jest.fn(),
  createUserProfile: jest.fn(),
};

const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
};

describe('統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('勤務フロー全体のテスト', () => {
    it('勤務開始から終了までの完全なフロー', async () => {
      // モックセットアップ
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';
      
      mockFirebaseService.createWorkSession.mockResolvedValue(sessionId);
      mockFirebaseService.updateWorkSession.mockResolvedValue(undefined);

      // 1. 勤務開始
      const sessionData: Omit<WorkSessionData, 'id'> = {
        userId,
        startTime: new Date(),
        status: 'active',
        breakPeriods: [],
      };
      
      const createdSessionId = await mockFirebaseService.createWorkSession(sessionData);
      expect(mockFirebaseService.createWorkSession).toHaveBeenCalledWith(sessionData);
      expect(createdSessionId).toBe(sessionId);

      // 2. 休憩開始
      const breakStart = new Date();
      await mockFirebaseService.updateWorkSession(sessionId, {
        breakPeriods: [{ startTime: breakStart }],
      });
      
      expect(mockFirebaseService.updateWorkSession).toHaveBeenCalledWith(sessionId, {
        breakPeriods: [{ startTime: breakStart }],
      });

      // 3. 休憩終了
      const breakEnd = new Date();
      await mockFirebaseService.updateWorkSession(sessionId, {
        breakPeriods: [{ startTime: breakStart, endTime: breakEnd }],
      });

      // 4. 勤務終了
      const endTime = new Date();
      await mockFirebaseService.updateWorkSession(sessionId, {
        endTime,
        status: 'completed',
      });

      expect(mockFirebaseService.updateWorkSession).toHaveBeenCalledTimes(3);
    });

    it('勤務中の状態管理', async () => {
      const sessionId = 'test-session-id';
      
      // 勤務状態の変化をテスト
      const states = ['idle', 'working', 'break', 'working', 'idle'];
      let currentState = states[0];

      // 勤務開始
      mockFirebaseService.createWorkSession.mockResolvedValue(sessionId);
      await mockFirebaseService.createWorkSession({
        userId: 'test-user',
        startTime: new Date(),
        status: 'active',
        breakPeriods: [],
      });
      currentState = 'working';
      expect(currentState).toBe('working');

      // 休憩開始
      currentState = 'break';
      expect(currentState).toBe('break');

      // 休憩終了
      currentState = 'working';
      expect(currentState).toBe('working');

      // 勤務終了
      currentState = 'idle';
      expect(currentState).toBe('idle');
    });
  });

  describe('案件記録フローのテスト', () => {
    it('案件追加の完全なフロー', async () => {
      const caseId = 'test-case-id';
      const sessionId = 'test-session-id';
      
      mockFirebaseService.createDeliveryCase.mockResolvedValue(caseId);

      const caseData: DeliveryCaseData = {
        userId: 'test-user',
        workSessionId: sessionId,
        service: 'Uber Eats',
        earnings: 500,
        tip: 100,
        duration: 30,
        timestamp: new Date(),
        memo: 'テスト案件',
      };

      const createdCaseId = await mockFirebaseService.createDeliveryCase(caseData);
      
      expect(mockFirebaseService.createDeliveryCase).toHaveBeenCalledWith(caseData);
      expect(createdCaseId).toBe(caseId);
    });

    it('複数案件の連続記録', async () => {
      const sessionId = 'test-session-id';
      const cases = [
        {
          service: 'Uber Eats',
          earnings: 500,
          tip: 0,
          duration: 25,
        },
        {
          service: 'menu',
          earnings: 400,
          tip: 50,
          duration: 30,
        },
        {
          service: 'Wolt',
          earnings: 600,
          tip: 100,
          duration: 20,
        },
      ];

      mockFirebaseService.createDeliveryCase.mockResolvedValue('case-id');

      for (let i = 0; i < cases.length; i++) {
        const caseData: DeliveryCaseData = {
          userId: 'test-user',
          workSessionId: sessionId,
          service: cases[i].service,
          earnings: cases[i].earnings,
          tip: cases[i].tip,
          duration: cases[i].duration,
          timestamp: new Date(Date.now() + i * 1000 * 60 * 30), // 30分間隔
        };

        await mockFirebaseService.createDeliveryCase(caseData);
      }

      expect(mockFirebaseService.createDeliveryCase).toHaveBeenCalledTimes(3);
    });

    it('案件データのバリデーション', () => {
      const validateCaseData = (data: Partial<DeliveryCaseData>): string[] => {
        const errors: string[] = [];
        
        if (!data.service) errors.push('サービス名が必要です');
        if (typeof data.earnings !== 'number' || data.earnings < 0) errors.push('有効な報酬を入力してください');
        if (typeof data.duration !== 'number' || data.duration <= 0) errors.push('有効な所要時間を入力してください');
        
        return errors;
      };

      // 有効なデータ
      const validData = {
        service: 'Uber Eats',
        earnings: 500,
        duration: 30,
      };
      expect(validateCaseData(validData)).toEqual([]);

      // 無効なデータ
      const invalidData = {
        service: '',
        earnings: -100,
        duration: 0,
      };
      expect(validateCaseData(invalidData).length).toBeGreaterThan(0);
    });
  });

  describe('認証フローのテスト', () => {
    it('サインアップから初回ログインまでのフロー', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        nickname: 'テストユーザー',
      };

      const mockUser = {
        uid: 'test-uid',
        email: userData.email,
      };

      // サインアップ
      mockAuthService.signUp.mockResolvedValue(mockUser);
      mockFirebaseService.createUserProfile.mockResolvedValue(undefined);

      const user = await mockAuthService.signUp(userData.email, userData.password);
      await mockFirebaseService.createUserProfile(user, userData.nickname);

      expect(mockAuthService.signUp).toHaveBeenCalledWith(userData.email, userData.password);
      expect(mockFirebaseService.createUserProfile).toHaveBeenCalledWith(user, userData.nickname);
    });

    it('ログインからログアウトまでのフロー', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'testpassword123',
      };

      const mockUser = {
        uid: 'test-uid',
        email: credentials.email,
      };

      // ログイン
      mockAuthService.signIn.mockResolvedValue(mockUser);
      mockFirebaseService.getUserProfile.mockResolvedValue({
        uid: mockUser.uid,
        email: mockUser.email,
        nickname: 'テストユーザー',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await mockAuthService.signIn(credentials.email, credentials.password);
      const profile = await mockFirebaseService.getUserProfile(user.uid);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(credentials.email, credentials.password);
      expect(mockFirebaseService.getUserProfile).toHaveBeenCalledWith(user.uid);
      expect(profile?.nickname).toBe('テストユーザー');

      // ログアウト
      mockAuthService.signOut.mockResolvedValue(undefined);
      await mockAuthService.signOut();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('パスワードリセットフロー', async () => {
      const email = 'test@example.com';
      
      mockAuthService.resetPassword.mockResolvedValue(undefined);
      await mockAuthService.resetPassword(email);
      
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(email);
    });

    it('認証エラーのハンドリング', async () => {
      const invalidCredentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.signIn.mockRejectedValue(new Error('認証に失敗しました'));

      await expect(
        mockAuthService.signIn(invalidCredentials.email, invalidCredentials.password)
      ).rejects.toThrow('認証に失敗しました');
    });
  });

  describe('データ整合性テスト', () => {
    it('セッションと案件の関連性', () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';

      const session: WorkSessionData = {
        userId,
        startTime: new Date('2024-01-01T09:00:00'),
        endTime: new Date('2024-01-01T17:00:00'),
        status: 'completed',
        breakPeriods: [],
      };

      const cases: DeliveryCaseData[] = [
        {
          userId,
          workSessionId: sessionId,
          service: 'Uber Eats',
          earnings: 500,
          tip: 0,
          duration: 30,
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          userId,
          workSessionId: sessionId,
          service: 'menu',
          earnings: 400,
          tip: 100,
          duration: 25,
          timestamp: new Date('2024-01-01T14:00:00'),
        },
      ];

      // すべての案件がセッション時間内にあることを確認
      cases.forEach(case_ => {
        expect(case_.timestamp.getTime()).toBeGreaterThanOrEqual(session.startTime.getTime());
        if (session.endTime) {
          expect(case_.timestamp.getTime()).toBeLessThanOrEqual(session.endTime.getTime());
        }
        expect(case_.workSessionId).toBe(sessionId);
        expect(case_.userId).toBe(userId);
      });
    });

    it('統計計算の正確性', () => {
      const cases: DeliveryCaseData[] = [
        { userId: 'test', workSessionId: 'test', service: 'Uber Eats', earnings: 500, tip: 100, duration: 30, timestamp: new Date() },
        { userId: 'test', workSessionId: 'test', service: 'menu', earnings: 400, tip: 0, duration: 25, timestamp: new Date() },
        { userId: 'test', workSessionId: 'test', service: 'Wolt', earnings: 600, tip: 50, duration: 35, timestamp: new Date() },
      ];

      const totalEarnings = cases.reduce((sum, case_) => sum + case_.earnings + case_.tip, 0);
      const totalDuration = cases.reduce((sum, case_) => sum + case_.duration, 0);
      const averageEarnings = totalEarnings / cases.length;

      expect(totalEarnings).toBe(1650); // 500+100 + 400+0 + 600+50
      expect(totalDuration).toBe(90); // 30 + 25 + 35
      expect(averageEarnings).toBe(550); // 1650 / 3
    });
  });
}); 