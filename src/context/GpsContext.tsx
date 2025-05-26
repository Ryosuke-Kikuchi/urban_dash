import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { GpsService } from '../services/GpsService';
import { DriveLogService } from '../services/DriveLogService';
import { GpsTrackingState, DriveLog } from '../types/driveLog';
import auth from '@react-native-firebase/auth';
import { useWork } from './WorkContext';

interface GpsContextType {
  trackingState: GpsTrackingState;
  driveLogs: DriveLog[];
  isLoading: boolean;
  isTracking: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  trackingData: { distance: number; speed: number; duration: number } | null;
  error: string | null;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<boolean>;
  loadDriveLogs: () => Promise<void>;
  getDriveLogsByWorkSession: (workSessionId: string) => Promise<DriveLog[]>;
}

interface GpsState {
  trackingState: GpsTrackingState;
  driveLogs: DriveLog[];
  isLoading: boolean;
}

type GpsAction = 
  | { type: 'SET_TRACKING_STATE'; payload: GpsTrackingState }
  | { type: 'SET_DRIVE_LOGS'; payload: DriveLog[] }
  | { type: 'ADD_DRIVE_LOG'; payload: DriveLog }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: GpsState = {
  trackingState: {
    isTracking: false,
    currentRoutePoints: [],
    totalDistance: 0,
  },
  driveLogs: [],
  isLoading: false,
};

function gpsReducer(state: GpsState, action: GpsAction): GpsState {
  switch (action.type) {
    case 'SET_TRACKING_STATE':
      return {
        ...state,
        trackingState: action.payload,
      };
    case 'SET_DRIVE_LOGS':
      return {
        ...state,
        driveLogs: action.payload,
      };
    case 'ADD_DRIVE_LOG':
      return {
        ...state,
        driveLogs: [action.payload, ...state.driveLogs],
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

const GpsContext = createContext<GpsContextType | undefined>(undefined);

interface GpsProviderProps {
  children: ReactNode;
}

export const GpsProvider: React.FC<GpsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(gpsReducer, initialState);
  const { state: workState } = useWork();
  const gpsService = GpsService.getInstance();
  const driveLogService = DriveLogService.getInstance();

  // GPS状態の監視
  useEffect(() => {
    const handleGpsStateChange = (newState: GpsTrackingState) => {
      dispatch({ type: 'SET_TRACKING_STATE', payload: newState });
    };

    gpsService.addListener(handleGpsStateChange);

    return () => {
      gpsService.removeListener(handleGpsStateChange);
    };
  }, [gpsService]);

  // GPS追跡開始
  const startTracking = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const success = await gpsService.startTracking();
      return success;
    } catch (error) {
      console.error('GPS tracking start failed:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // GPS追跡停止と保存
  const stopTracking = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const finalState = gpsService.stopTracking();
      
      if (finalState.currentRoutePoints.length > 0) {
        const user = auth().currentUser;
        if (!user) {
          console.error('User not authenticated');
          return false;
        }

        // 統計計算
        const statistics = gpsService.calculateStatistics(finalState.currentRoutePoints);
        
        // DriveLogデータの作成
        const driveLogData: Omit<DriveLog, 'id' | 'createdAt'> = {
          userId: user.uid,
          workSessionId: workState.currentSessionId || undefined,
          startTime: finalState.trackingStartTime || new Date(),
          endTime: new Date(),
          totalDistanceMeters: statistics.totalDistance,
          durationSeconds: statistics.duration,
          averageSpeedKmh: statistics.averageSpeed,
          maxSpeedKmh: statistics.maxSpeed,
          routePath: finalState.currentRoutePoints,
        };

        // Firestoreに保存
        const savedLogId = await driveLogService.saveDriveLog(driveLogData);
        
        // 新しいログを状態に追加
        const newLog: DriveLog = {
          ...driveLogData,
          id: savedLogId,
          createdAt: new Date(),
        };
        
        dispatch({ type: 'ADD_DRIVE_LOG', payload: newLog });
        
        console.log('Drive log saved successfully:', savedLogId);
      }
      
      return true;
    } catch (error) {
      console.error('GPS tracking stop failed:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 走行ログの読み込み
  const loadDriveLogs = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const user = auth().currentUser;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const logs = await driveLogService.getDriveLogsByUserId(user.uid);
      dispatch({ type: 'SET_DRIVE_LOGS', payload: logs });
    } catch (error) {
      console.error('Failed to load drive logs:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [driveLogService]);

  // 特定の勤務セッションの走行ログを取得
  const getDriveLogsByWorkSession = async (workSessionId: string): Promise<DriveLog[]> => {
    try {
      return await driveLogService.getDriveLogsByWorkSession(workSessionId);
    } catch (error) {
      console.error('Failed to get drive logs by work session:', error);
      return [];
    }
  };

  // アプリ起動時に走行ログを読み込み
  useEffect(() => {
    loadDriveLogs();
  }, [loadDriveLogs]);

  const value: GpsContextType = {
    trackingState: state.trackingState,
    driveLogs: state.driveLogs,
    isLoading: state.isLoading,
    isTracking: state.trackingState.isTracking,
    currentLocation: state.trackingState.currentRoutePoints.length > 0 
      ? state.trackingState.currentRoutePoints[state.trackingState.currentRoutePoints.length - 1]
      : null,
    trackingData: state.trackingState.isTracking ? {
      distance: state.trackingState.totalDistance / 1000, // メートルからキロメートルに変換
      speed: 0, // 実際の計算が必要
      duration: state.trackingState.trackingStartTime 
        ? Math.floor((Date.now() - state.trackingState.trackingStartTime.getTime()) / 1000)
        : 0
    } : null,
    error: null, // エラー処理は後で実装
    startTracking,
    stopTracking,
    loadDriveLogs,
    getDriveLogsByWorkSession,
  };

  return (
    <GpsContext.Provider value={value}>
      {children}
    </GpsContext.Provider>
  );
};

export const useGps = (): GpsContextType => {
  const context = useContext(GpsContext);
  if (context === undefined) {
    throw new Error('useGps must be used within a GpsProvider');
  }
  return context;
}; 