import React, { useCallback, useMemo } from 'react';

// メモリ使用量監視
export const useMemoryMonitor = () => {
  const checkMemoryUsage = useCallback(() => {
    if (__DEV__ && (global as any).performance && (global as any).performance.memory) {
      const memory = (global as any).performance.memory;
      console.log('Memory Usage:', {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
      });
    }
  }, []);

  return { checkMemoryUsage };
};

// レンダリング最適化のためのヘルパー
export const useOptimizedCalculations = (
  getCurrentWorkingTime: () => number,
  getCurrentBreakTime: () => number,
  getEstimatedHourlyRate: () => number,
  getWaitingTime: () => number,
  totalEarnings: number,
  totalCases: number,
  status: string
) => {
  // 時間関連の計算をメモ化
  const workingTimeFormatted = useMemo(() => {
    const workingTimeSeconds = getCurrentWorkingTime();
    const hours = Math.floor(workingTimeSeconds / 3600);
    const minutes = Math.floor((workingTimeSeconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  }, [getCurrentWorkingTime]);

  const breakTimeFormatted = useMemo(() => {
    const breakTimeSeconds = getCurrentBreakTime();
    const hours = Math.floor(breakTimeSeconds / 3600);
    const minutes = Math.floor((breakTimeSeconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  }, [getCurrentBreakTime]);

  const waitingTimeFormatted = useMemo(() => {
    const waitingTimeSeconds = getWaitingTime();
    const hours = Math.floor(waitingTimeSeconds / 3600);
    const minutes = Math.floor((waitingTimeSeconds % 3600) / 60);
    return `${hours}時間${minutes}分`;
  }, [getWaitingTime]);

  const hourlyRateFormatted = useMemo(() => {
    const rate = getEstimatedHourlyRate();
    return `¥${Math.floor(rate).toLocaleString()}`;
  }, [getEstimatedHourlyRate]);

  const totalEarningsFormatted = useMemo(() => {
    return `¥${Math.floor(totalEarnings).toLocaleString()}`;
  }, [totalEarnings]);

  const statusInfo = useMemo(() => {
    switch (status) {
      case 'working':
        return { text: '勤務中', color: '#4CAF50' };
      case 'break':
        return { text: '休憩中', color: '#FF9800' };
      default:
        return { text: '未勤務', color: '#FF3B30' };
    }
  }, [status]);

  return {
    workingTimeFormatted,
    breakTimeFormatted,
    waitingTimeFormatted,
    hourlyRateFormatted,
    totalEarningsFormatted,
    statusInfo,
    totalCases,
  };
};

// 不要なレンダリングを防ぐためのメモ化されたコンポーネント作成ヘルパー
export const createMemoizedComponent = <T>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) => {
  return React.memo(Component, propsAreEqual);
};

// バッテリー消費最適化のためのインターバル管理
export const useOptimizedInterval = (callback: () => void, delay: number, isActive: boolean = true) => {
  const optimizedCallback = useCallback(callback, [callback]);

  useMemo(() => {
    if (!isActive) return;

    const interval = setInterval(optimizedCallback, delay);
    return () => clearInterval(interval);
  }, [optimizedCallback, delay, isActive]);
};

// 画面がアクティブな時のみタイマーを実行
export const useActiveScreenTimer = (callback: () => void, delay: number = 1000) => {
  const { checkMemoryUsage } = useMemoryMonitor();

  useMemo(() => {
    let isActive = true;
    let interval: NodeJS.Timeout;

    const startTimer = () => {
      interval = setInterval(() => {
        if (isActive) {
          callback();
          if (__DEV__) {
            checkMemoryUsage();
          }
        }
      }, delay);
    };

    startTimer();

    // アプリがバックグラウンドに行った時はタイマーを停止
    // React Nativeの場合はAppStateを使用（実装は呼び出し元で行う）

    return () => {
      isActive = false;
      if (interval) clearInterval(interval);
    };
  }, [callback, delay, checkMemoryUsage]);
}; 