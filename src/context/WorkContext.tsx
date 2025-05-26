import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import FirebaseService, { WorkSessionData, BreakPeriodData, DeliveryCaseData } from '../services/FirebaseService';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import StorageService from '../services/StorageService';

// 勤務状態の型定義
export type WorkStatus = 'idle' | 'working' | 'break';

export interface DeliveryRecordData {
  id?: string; // Firestoreで自動生成されるID
  userId: string;
  workSessionId: string;
  platform: string;
  reward: number;
  duration: number; // 秒
  startTime: string; // ISO 8601形式の文字列
  endTime: string; // ISO 8601形式の文字列
  createdAt?: FirebaseFirestoreTypes.Timestamp; // Firestoreのタイムスタンプ
}

export interface WorkState {
  status: WorkStatus;
  currentSessionId: string | null;
  currentSession: WorkSessionData | null;
  currentBreakStart: Date | null;
  totalWorkingTime: number; // 秒
  totalBreakTime: number; // 秒
  totalEarnings: number;
  totalCases: number;
  todayCases: DeliveryCaseData[];
  todayRecords: DeliveryRecordData[]; // 新しい配達記録の配列
  // 今週データ
  weeklyEarnings: number;
  weeklyDeliveries: number;
  weeklyWorkingTime: number; // 秒
  weeklyAverageHourlyRate: number;
  isLoading: boolean;
  error: string | null;
  isWorking: boolean; // 勤務中かどうかを示すプロパティ
}

// アクションの型定義
type WorkAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'START_WORK'; payload: { sessionId: string; session: WorkSessionData } }
  | { type: 'END_WORK' }
  | { type: 'START_BREAK'; payload: Date }
  | { type: 'END_BREAK'; payload: { breakDuration: number } }
  | { type: 'ADD_CASE'; payload: DeliveryCaseData }
  | { type: 'ADD_DELIVERY_RECORD'; payload: DeliveryRecordData } // 新しいアクションタイプ
  | { type: 'UPDATE_EARNINGS'; payload: number }
  | { type: 'UPDATE_TIMES'; payload: { workingTime: number; breakTime: number } }
  | { type: 'LOAD_SESSION'; payload: { sessionId: string; session: WorkSessionData; cases: DeliveryCaseData[] } }
  | { type: 'RESET_STATE' }
  | { type: 'UPDATE_WEEKLY_DATA'; payload: { weeklyEarnings: number; weeklyDeliveries: number; weeklyWorkingTime: number; weeklyAverageHourlyRate: number } };

// 初期状態
const initialState: WorkState = {
  status: 'idle',
  currentSessionId: null,
  currentSession: null,
  currentBreakStart: null,
  totalWorkingTime: 0,
  totalBreakTime: 0,
  totalEarnings: 0,
  totalCases: 0,
  todayCases: [],
  todayRecords: [],
  weeklyEarnings: 0,
  weeklyDeliveries: 0,
  weeklyWorkingTime: 0,
  weeklyAverageHourlyRate: 0,
  isLoading: false,
  error: null,
  isWorking: false,
};

// リデューサー
function workReducer(state: WorkState, action: WorkAction): WorkState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'START_WORK':
      return {
        ...state,
        status: 'working',
        currentSessionId: action.payload.sessionId,
        currentSession: action.payload.session,
        totalWorkingTime: 0,
        totalBreakTime: 0,
        totalEarnings: 0,
        totalCases: 0,
        todayCases: [],
        error: null,
        isWorking: true,
      };
    
    case 'END_WORK':
      return {
        ...state,
        status: 'idle',
        currentSessionId: null,
        currentSession: null,
        currentBreakStart: null,
        isWorking: false,
      };
    
    case 'START_BREAK':
      return {
        ...state,
        status: 'break',
        currentBreakStart: action.payload,
      };
    
    case 'END_BREAK':
      return {
        ...state,
        status: 'working',
        currentBreakStart: null,
        totalBreakTime: state.totalBreakTime + action.payload.breakDuration,
      };
    
    case 'ADD_CASE':
      const newEarnings = action.payload.earnings + (action.payload.tip || 0);
      return {
        ...state,
        todayCases: [...state.todayCases, action.payload],
        totalCases: state.totalCases + 1,
        totalEarnings: state.totalEarnings + newEarnings,
      };
    
    case 'ADD_DELIVERY_RECORD':
      return {
        ...state,
        todayRecords: [...state.todayRecords, action.payload],
        // 必要に応じて totalEarnings や totalCases も更新
      };
    
    case 'UPDATE_EARNINGS':
      return {
        ...state,
        totalEarnings: action.payload,
      };
    
    case 'UPDATE_TIMES':
      return {
        ...state,
        totalWorkingTime: action.payload.workingTime,
        totalBreakTime: action.payload.breakTime,
      };
    
    case 'LOAD_SESSION':
      const sessionEarnings = action.payload.cases.reduce(
        (sum, case_) => sum + case_.earnings + (case_.tip || 0),
        0
      );
      return {
        ...state,
        status: 'working',
        currentSessionId: action.payload.sessionId,
        currentSession: action.payload.session,
        todayCases: action.payload.cases,
        totalCases: action.payload.cases.length,
        totalEarnings: sessionEarnings,
        isWorking: true,
      };
    
    case 'RESET_STATE':
      return initialState;
    
    case 'UPDATE_WEEKLY_DATA':
      return {
        ...state,
        weeklyEarnings: action.payload.weeklyEarnings,
        weeklyDeliveries: action.payload.weeklyDeliveries,
        weeklyWorkingTime: action.payload.weeklyWorkingTime,
        weeklyAverageHourlyRate: action.payload.weeklyAverageHourlyRate,
      };
    
    default:
      return state;
  }
}

// コンテキストの型定義
interface WorkContextType {
  state: WorkState;
  startWork: () => Promise<void>;
  endWork: () => Promise<void>;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
  addDeliveryCase: (caseData: Omit<DeliveryCaseData, 'userId' | 'workSessionId'>) => Promise<void>;
  addDeliveryRecord: (recordData: Omit<DeliveryRecordData, 'userId' | 'workSessionId' | 'createdAt' | 'id'>) => Promise<void>; // 新しい関数の型定義
  getCurrentWorkingTime: () => number;
  getCurrentBreakTime: () => number;
  getEstimatedHourlyRate: () => number;
  getWaitingTime: () => number;
  getDetailedWaitingTime: () => {
    totalWaitingTime: number;
    beforeFirstCase: number;
    betweenCases: number;
    afterLastCase: number;
  };
  loadWeeklyData: () => Promise<void>;
  refreshSession: () => Promise<void>;
  forceResetSession: () => Promise<void>;
}

// コンテキスト作成
const WorkContext = createContext<WorkContextType | undefined>(undefined);

// プロバイダーコンポーネント
interface WorkProviderProps {
  children: ReactNode;
}

export function WorkProvider({ children }: WorkProviderProps) {
  const [state, dispatch] = useReducer(workReducer, initialState);
  const { user } = useAuth();

  // 進行中のセッションをチェック
  const checkActiveSession = useCallback(async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // インデックスエラーを回避するため、エラーハンドリングを追加
      try {
        // 最新のセッションを取得
        const sessions = await FirebaseService.getUserWorkSessions(user.uid, 1);
        
        if (sessions.length > 0) {
          const latestSession = sessions[0];
          
          // アクティブなセッションがあるかチェック
          if (latestSession.status === 'active') {
            const cases = await FirebaseService.getSessionDeliveryCases(latestSession.id);
            
            dispatch({
              type: 'LOAD_SESSION',
              payload: {
                sessionId: latestSession.id,
                session: latestSession,
                cases,
              },
            });
          }
        }
      } catch (firestoreError) {
        console.log('Firestore query error (expected during initial setup):', firestoreError);
        // インデックスが作成されていない場合は無視
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      dispatch({ type: 'SET_ERROR', payload: 'セッション情報の取得に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

  // リアルタイムリスナーの設定
  useEffect(() => {
    if (!user || !state.currentSessionId) return;

    // 配達案件のリアルタイムリスナー
    const unsubscribeCases = firestore()
      .collection('deliveryCases')
      .where('userId', '==', user.uid)
      .where('workSessionId', '==', state.currentSessionId)
      .orderBy('timestamp', 'desc')
      .onSnapshot(
        (snapshot) => {
          const cases: DeliveryCaseData[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cases.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp && typeof data.timestamp.toDate === 'function' 
                ? data.timestamp.toDate() 
                : data.timestamp,
            } as unknown as DeliveryCaseData);
          });

          // 案件データを更新
          const totalEarnings = cases.reduce(
            (sum, case_) => sum + case_.earnings + (case_.tip || 0),
            0
          );

          dispatch({ type: 'UPDATE_EARNINGS', payload: totalEarnings });
          
          // 案件リストを更新
          const currentCases = [...cases].reverse(); // 時系列順に並び替え
          dispatch({
            type: 'LOAD_SESSION',
            payload: {
              sessionId: state.currentSessionId!,
              session: state.currentSession!,
              cases: currentCases,
            },
          });
        },
        (error) => {
          console.error('案件リアルタイム更新エラー:', error);
        }
      );

    // 勤務セッションのリアルタイムリスナー
    const unsubscribeSession = firestore()
      .collection('workSessions')
      .doc(state.currentSessionId)
      .onSnapshot(
        (doc) => {
          if (doc.exists()) {
            const sessionData = doc.data();
            
            // セッションが完了済みの場合はリアルタイム更新をしない
            if (sessionData?.status === 'completed') {
              return;
            }
            
            const updatedSession: WorkSessionData = {
              id: doc.id,
              ...sessionData,
              startTime: sessionData?.startTime && typeof sessionData.startTime.toDate === 'function'
                ? sessionData.startTime.toDate()
                : sessionData?.startTime,
              endTime: sessionData?.endTime && typeof sessionData.endTime.toDate === 'function'
                ? sessionData.endTime.toDate()
                : sessionData?.endTime,
            } as unknown as WorkSessionData;

            // セッション情報を更新（アクティブなセッションのみ）
            dispatch({
              type: 'LOAD_SESSION',
              payload: {
                sessionId: state.currentSessionId!,
                session: updatedSession,
                cases: state.todayCases,
              },
            });
          }
        },
        (error) => {
          console.error('セッションリアルタイム更新エラー:', error);
        }
      );

    // クリーンアップ関数
    return () => {
      unsubscribeCases();
      unsubscribeSession();
    };
  }, [user, state.currentSessionId, state.currentSession, state.todayCases]);

  // アプリ起動時に進行中のセッションをチェック
  useEffect(() => {
    if (user) {
      checkActiveSession();
    } else {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user, checkActiveSession]);

  // 勤務開始
  const startWork = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 日本時間で勤務開始時刻を設定
      const now = new Date();
      const jstStartTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));

      const sessionData: WorkSessionData = {
        userId: user.uid,
        startTime: jstStartTime,
        status: 'active',
        breakPeriods: [],
      };

      const sessionId = await FirebaseService.createWorkSession(sessionData);
      
      dispatch({
        type: 'START_WORK',
        payload: {
          sessionId,
          session: sessionData,
        },
      });

      // 一時データを保存
      await StorageService.saveTempWorkData({
        sessionId,
        startTime: sessionData.startTime.toISOString(),
        status: 'working',
      });

      Toast.show({
        type: 'success',
        text1: '勤務開始',
        text2: '勤務が正常に開始されました',
      });
    } catch (error) {
      console.error('勤務開始エラー:', error);
      dispatch({ type: 'SET_ERROR', payload: '勤務開始に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 勤務終了
  const endWork = async () => {
    if (!user || !state.currentSessionId) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 進行中の休憩があれば終了
      if (state.status === 'break' && state.currentBreakStart) {
        await endBreak();
      }

      // 日本時間で勤務終了時刻を設定
      const now = new Date();
      const endTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      
      // 最終統計を計算
      const finalWorkingTime = getCurrentWorkingTime();
      const finalBreakTime = getCurrentBreakTime();
      const finalHourlyRate = getEstimatedHourlyRate();

      // 更新データを確認
      const updateData = {
        endTime,
        status: 'completed' as const,
        _totalWorkingDurationSeconds: finalWorkingTime,
        _totalBreakDurationSeconds: finalBreakTime,
        _totalEarnings: state.totalEarnings,
        _totalCases: state.totalCases,
        _averageHourlyRate: finalHourlyRate,
      };

      await FirebaseService.updateWorkSession(state.currentSessionId, updateData);

      // 統計を計算
      await FirebaseService.calculateSessionStatistics(state.currentSessionId);

      dispatch({ type: 'END_WORK' });

      // 一時データを削除し、最終同期時刻を保存
      await StorageService.clearTempWorkData();
      await StorageService.saveLastSyncTime();

      Toast.show({
        type: 'success',
        text1: '勤務終了',
        text2: '勤務が正常に終了しました',
      });
    } catch (error) {
      // 権限エラーの場合、認証をリフレッシュして再試行
      if ((error as any)?.code === 'firestore/permission-denied') {
        try {
          // 認証トークンをリフレッシュ
          const currentUser = FirebaseService.getCurrentUser();
          if (currentUser) {
            await currentUser.getIdToken(true); // forceRefresh = true
            
            // 再試行
            const updateData = {
              endTime: new Date(),
              status: 'completed' as const,
              _totalWorkingDurationSeconds: getCurrentWorkingTime(),
              _totalBreakDurationSeconds: getCurrentBreakTime(),
              _totalEarnings: state.totalEarnings,
              _totalCases: state.totalCases,
              _averageHourlyRate: getEstimatedHourlyRate(),
            };
            await FirebaseService.updateWorkSession(state.currentSessionId, updateData);
            
            // 統計計算も再試行
            await FirebaseService.calculateSessionStatistics(state.currentSessionId);
            
            dispatch({ type: 'END_WORK' });
            await StorageService.clearTempWorkData();
            await StorageService.saveLastSyncTime();
            
            Toast.show({
              type: 'success',
              text1: '勤務終了',
              text2: '勤務が正常に終了しました（再試行成功）',
            });
            return; // 成功したので関数を終了
          }
        } catch (retryError) {
          // 再試行も失敗した場合はエラーとして処理
        }
      }

      dispatch({ type: 'SET_ERROR', payload: '勤務終了に失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 休憩開始
  const startBreak = async () => {
    if (!user || !state.currentSessionId || state.status !== 'working') return;

    try {
      // 日本時間で休憩開始時刻を設定
      const now = new Date();
      const breakStart = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      
      const newBreakPeriod: BreakPeriodData = {
        startTime: breakStart,
      };

      const updatedBreakPeriods = [...(state.currentSession?.breakPeriods || []), newBreakPeriod];
      
      await FirebaseService.updateWorkSession(state.currentSessionId, {
        breakPeriods: updatedBreakPeriods,
      });

      dispatch({ type: 'START_BREAK', payload: breakStart });

      // 一時データを更新
      await StorageService.saveTempWorkData({
        sessionId: state.currentSessionId,
        startTime: state.currentSession?.startTime.toISOString(),
        status: 'break',
        breakStart: breakStart.toISOString(),
      });

      Toast.show({
        type: 'success',
        text1: '休憩開始',
        text2: '休憩が正常に開始されました',
      });
    } catch (error) {
      console.error('休憩開始エラー:', error);
      dispatch({ type: 'SET_ERROR', payload: '休憩開始に失敗しました' });
    }
  };

  // 休憩終了
  const endBreak = async () => {
    if (!user || !state.currentSessionId || !state.currentBreakStart) return;

    try {
      // 日本時間で休憩終了時刻を設定
      const now = new Date();
      const breakEnd = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const breakDuration = (breakEnd.getTime() - state.currentBreakStart.getTime()) / 1000;

      const updatedBreakPeriods = [...(state.currentSession?.breakPeriods || [])];
      const lastBreakIndex = updatedBreakPeriods.length - 1;
      
      if (lastBreakIndex >= 0) {
        updatedBreakPeriods[lastBreakIndex] = {
          ...updatedBreakPeriods[lastBreakIndex],
          endTime: breakEnd,
        };
      }

      await FirebaseService.updateWorkSession(state.currentSessionId, {
        breakPeriods: updatedBreakPeriods,
      });

      dispatch({ type: 'END_BREAK', payload: { breakDuration } });

      // 一時データを更新
      await StorageService.saveTempWorkData({
        sessionId: state.currentSessionId,
        startTime: state.currentSession?.startTime.toISOString(),
        status: 'working',
      });

      Toast.show({
        type: 'success',
        text1: '休憩終了',
        text2: `休憩が正常に終了しました（${breakDuration.toFixed(2)}秒）`,
      });
    } catch (error) {
      console.error('休憩終了エラー:', error);
      dispatch({ type: 'SET_ERROR', payload: '休憩終了に失敗しました' });
    }
  };

  // 配達案件追加
  const addDeliveryCase = async (caseData: Omit<DeliveryCaseData, 'userId' | 'workSessionId'>) => {
    if (!user || !state.currentSessionId) return;

    try {
      // undefined値を除去してFirestoreに送信
      const cleanedCaseData = Object.fromEntries(
        Object.entries(caseData).filter(([_, value]) => value !== undefined)
      );

      const fullCaseData: DeliveryCaseData = {
        ...cleanedCaseData,
        userId: user.uid,
        workSessionId: state.currentSessionId,
      } as DeliveryCaseData;

      await FirebaseService.createDeliveryCase(fullCaseData);
      dispatch({ type: 'ADD_CASE', payload: fullCaseData });

      Toast.show({
        type: 'success',
        text1: '案件追加',
        text2: '案件が正常に追加されました',
      });
    } catch (error) {
      console.error('案件追加エラー:', error);
      dispatch({ type: 'SET_ERROR', payload: '案件の追加に失敗しました' });
    }
  };

  // 新しい配達記録を追加する関数
  const addDeliveryRecord = async (recordData: Omit<DeliveryRecordData, 'userId' | 'workSessionId' | 'createdAt' | 'id'>) => {
    if (!user || !state.currentSessionId) {
      dispatch({ type: 'SET_ERROR', payload: 'ユーザーまたはセッション情報がありません。' });
      Toast.show({
        type: 'error',
        text1: '記録エラー',
        text2: 'ユーザーまたはセッション情報がありません。'
      });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const fullRecordData: DeliveryRecordData = {
        ...recordData,
        userId: user.uid,
        workSessionId: state.currentSessionId,
        createdAt: firestore.Timestamp.now(),
      };

      const docRef = await FirebaseService.addDeliveryRecord(fullRecordData);
      dispatch({ type: 'ADD_DELIVERY_RECORD', payload: { ...fullRecordData, id: docRef.id } });
      dispatch({ type: 'SET_LOADING', payload: false });
      Toast.show({
        type: 'success',
        text1: '配達記録完了',
        text2: `${recordData.platform}での配達を記録しました。`,
      });
    } catch (error) {
      console.error("Error adding delivery record: ", error);
      const errorMessage = error instanceof Error ? error.message : '配達記録の追加中にエラーが発生しました。';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      Toast.show({
        type: 'error',
        text1: '記録エラー',
        text2: errorMessage,
      });
    }
  };

  const getCurrentWorkingTime = (): number => {
    if (!state.currentSession || state.status === 'idle') return 0;

    const now = new Date();
    const sessionStart = state.currentSession.startTime;
    const totalSessionTime = (now.getTime() - sessionStart.getTime()) / 1000;

    // 休憩時間を計算
    let totalBreakTime = state.totalBreakTime;
    if (state.status === 'break' && state.currentBreakStart) {
      const currentBreakTime = (now.getTime() - state.currentBreakStart.getTime()) / 1000;
      totalBreakTime += currentBreakTime;
    }

    return Math.max(0, totalSessionTime - totalBreakTime);
  };

  // 現在の休憩時間を取得（秒）
  const getCurrentBreakTime = (): number => {
    let totalBreakTime = state.totalBreakTime;
    
    if (state.status === 'break' && state.currentBreakStart) {
      const now = new Date();
      const currentBreakTime = (now.getTime() - state.currentBreakStart.getTime()) / 1000;
      totalBreakTime += currentBreakTime;
    }

    return totalBreakTime;
  };

  // 推定時給を計算
  const getEstimatedHourlyRate = (): number => {
    const workingTimeHours = getCurrentWorkingTime() / 3600;
    return workingTimeHours > 0 ? state.totalEarnings / workingTimeHours : 0;
  };

  // 地蔵時間（待機時間）を計算（秒）
  const getWaitingTime = (): number => {
    if (!state.currentSession || state.status === 'idle') return 0;

    const currentWorkingTime = getCurrentWorkingTime();
    
    // 案件にかかった総時間を計算（分単位から秒単位に変換）
    const totalCaseDuration = state.todayCases.reduce((sum, case_) => sum + (case_.duration * 60), 0);
    
    // 地蔵時間 = 勤務時間 - 案件時間
    return Math.max(0, currentWorkingTime - totalCaseDuration);
  };

  // 詳細な地蔵時間計算
  const getDetailedWaitingTime = () => {
    if (!state.currentSession || state.status === 'idle') {
      return {
        totalWaitingTime: 0,
        beforeFirstCase: 0,
        betweenCases: 0,
        afterLastCase: 0,
      };
    }

    const sessionStart = state.currentSession.startTime;
    const now = new Date();
    const sortedCases = [...state.todayCases].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let beforeFirstCase = 0;
    let betweenCases = 0;
    let afterLastCase = 0;

    if (sortedCases.length === 0) {
      // まだ案件がない場合、開始から現在まで全て待機時間
      const sessionTimeSeconds = (now.getTime() - sessionStart.getTime()) / 1000;
      const breakTimeSeconds = getCurrentBreakTime();
      beforeFirstCase = Math.max(0, sessionTimeSeconds - breakTimeSeconds);
    } else {
      // 勤務開始から最初の案件まで
      const firstCaseTime = sortedCases[0].timestamp;
      const timeUntilFirstCase = (firstCaseTime.getTime() - sessionStart.getTime()) / 1000;
      beforeFirstCase = Math.max(0, timeUntilFirstCase);

      // 案件間の待機時間
      for (let i = 1; i < sortedCases.length; i++) {
        const prevCase = sortedCases[i - 1];
        const currentCase = sortedCases[i];
        
        // 前の案件終了時刻 = 開始時刻 + 所要時間
        const prevCaseEndTime = new Date(prevCase.timestamp.getTime() + (prevCase.duration * 60 * 1000));
        const waitingBetween = (currentCase.timestamp.getTime() - prevCaseEndTime.getTime()) / 1000;
        betweenCases += Math.max(0, waitingBetween);
      }

      // 最後の案件から現在まで
      const lastCase = sortedCases[sortedCases.length - 1];
      const lastCaseEndTime = new Date(lastCase.timestamp.getTime() + (lastCase.duration * 60 * 1000));
      
      if (state.status === 'working' || state.status === 'break') {
        // まだ勤務中の場合
        afterLastCase = Math.max(0, (now.getTime() - lastCaseEndTime.getTime()) / 1000);
      } else if (state.currentSession.endTime) {
        // 勤務終了済みの場合
        afterLastCase = Math.max(0, (state.currentSession.endTime.getTime() - lastCaseEndTime.getTime()) / 1000);
      }
    }

    const totalWaitingTime = beforeFirstCase + betweenCases + afterLastCase;

    return {
      totalWaitingTime,
      beforeFirstCase,
      betweenCases,
      afterLastCase,
    };
  };

  // セッション情報を更新
  const refreshSession = async () => {
    if (!user || !state.currentSessionId) return;

    try {
      const session = await FirebaseService.getWorkSession(state.currentSessionId);
      const cases = await FirebaseService.getSessionDeliveryCases(state.currentSessionId);
      
      if (session) {
        dispatch({
          type: 'LOAD_SESSION',
          payload: {
            sessionId: state.currentSessionId,
            session,
            cases,
          },
        });
      }
    } catch (error) {
      console.error('セッション更新エラー:', error);
      dispatch({ type: 'SET_ERROR', payload: 'セッション情報の更新に失敗しました' });
    }
  };

  // 今週データを読み込む
  const loadWeeklyData = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 今週の開始日（月曜日）と終了日（日曜日）を計算
      const now = new Date();
      const currentDay = now.getDay(); // 0: 日曜日, 1: 月曜日, ..., 6: 土曜日
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // 月曜日からの日数
      
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      console.log('[WEEKLY_DATA] 今週の期間:', {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        currentDay,
        daysFromMonday
      });

      // 今週のworkSessionsを取得
      const sessions = await FirebaseService.getUserWorkSessions(user.uid);
      const weeklySessions = sessions.filter(session => {
        const sessionDate = session.startTime;
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      console.log('[WEEKLY_DATA] セッション情報:', {
        totalSessions: sessions.length,
        weeklySessions: weeklySessions.length,
        sessionDates: weeklySessions.map(s => s.startTime.toISOString())
      });

      // 今週のdeliveryCasesを取得
      const cases = await FirebaseService.getUserDeliveryCases(user.uid, weekStart, weekEnd);

      console.log('[WEEKLY_DATA] 案件情報:', {
        totalCases: cases.length,
        caseDates: cases.map(c => c.timestamp.toISOString()),
        earnings: cases.map(c => ({ earnings: c.earnings, tip: c.tip || 0 }))
      });

      // 今週の統計を計算
      const weeklyEarnings = cases.reduce((sum, case_) => sum + case_.earnings + (case_.tip || 0), 0);
      const weeklyDeliveries = cases.length;
      
      const weeklyWorkingTime = weeklySessions.reduce((sum, session) => {
        return sum + (session._totalWorkingDurationSeconds || 0);
      }, 0);

      const weeklyAverageHourlyRate = weeklyWorkingTime > 0 
        ? weeklyEarnings / (weeklyWorkingTime / 3600) 
        : 0;

      console.log('[WEEKLY_DATA] 計算結果:', {
        weeklyEarnings,
        weeklyDeliveries,
        weeklyWorkingTime,
        weeklyAverageHourlyRate
      });

      // 今週データを更新するアクションを追加
      dispatch({
        type: 'UPDATE_WEEKLY_DATA',
        payload: {
          weeklyEarnings,
          weeklyDeliveries,
          weeklyWorkingTime,
          weeklyAverageHourlyRate,
        },
      });

    } catch (error) {
      console.error('今週データ読み込みエラー:', error);
      dispatch({ type: 'SET_ERROR', payload: '今週データの読み込みに失敗しました' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // デバッグ用：セッションを強制リセット
  const forceResetSession = async () => {
    console.log('セッションを強制リセットします');
    dispatch({ type: 'RESET_STATE' });
    await StorageService.clearTempWorkData();
    Toast.show({
      type: 'success',
      text1: 'セッションリセット',
      text2: 'セッションがリセットされました',
    });
  };

  const value: WorkContextType = {
    state,
    startWork,
    endWork,
    startBreak,
    endBreak,
    addDeliveryCase,
    addDeliveryRecord, // コンテキストに公開
    getCurrentWorkingTime,
    getCurrentBreakTime,
    getEstimatedHourlyRate,
    getWaitingTime,
    getDetailedWaitingTime,
    loadWeeklyData,
    refreshSession,
    forceResetSession,
  };

  return <WorkContext.Provider value={value}>{children}</WorkContext.Provider>;
}

// カスタムフック
export function useWork() {
  const context = useContext(WorkContext);
  if (context === undefined) {
    throw new Error('useWork must be used within a WorkProvider');
  }
  return context;
}
