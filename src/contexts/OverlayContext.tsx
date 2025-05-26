import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import OverlayService, { OverlaySettings, OverlayPosition, FormData } from '../services/OverlayService';
import { useWork } from '../context/WorkContext';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface OverlayContextType {
  // オーバーレイ状態
  isOverlayEnabled: boolean;
  overlaySettings: OverlaySettings;
  
  // オーバーレイ制御
  enableOverlay: () => Promise<boolean>;
  disableOverlay: () => Promise<void>;
  
  // 設定管理
  updateOverlaySettings: (settings: Partial<OverlaySettings>) => Promise<void>;
  updateOverlayPosition: (position: OverlayPosition) => Promise<void>;
  
  // 権限管理
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

interface OverlayProviderProps {
  children: ReactNode;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({ children }) => {
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(false);
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>({
    isEnabled: false,
    position: { x: 50, y: 200 },
    opacity: 0.8,
    size: 60,
  });

  const { state } = useWork();
  const overlayServiceRef = useRef(OverlayService.getInstance());
  const overlayService = overlayServiceRef.current;
  const isInitializedRef = useRef(false);

  const saveDeliveryCase = useCallback(async (data: FormData): Promise<void> => {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    if (!state.currentSession) {
      throw new Error('勤務中ではありません。先に勤務を開始してください。');
    }

    try {
      // データを変換（案件入力画面と統一）
      const deliveryCaseData: any = {
        workSessionId: state.currentSessionId!,
        userId: user.uid,
        service: data.deliveryService,
        earnings: parseInt(data.reward),
        tip: 0, // チップは削除されたので0
        timestamp: firestore.Timestamp.fromDate(new Date()),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      // undefined値を除去
      if (data.estimatedTime && parseInt(data.estimatedTime) > 0) {
        deliveryCaseData.estimatedTime = parseInt(data.estimatedTime);
      }
      
      // 距離データの追加
      if (data.distance && parseFloat(data.distance) > 0) {
        deliveryCaseData.distance = parseFloat(data.distance);
      }
      
      // 経過時間を所要時間として保存
      if (data.durationMinutes && parseInt(data.durationMinutes) > 0) {
        deliveryCaseData.duration = parseInt(data.durationMinutes);
      }
      
      // 配達時間の計算
      if (data.startTime && data.finishTime) {
        const startTimeMs = parseInt(data.startTime);
        const finishTimeMs = parseInt(data.finishTime);
        if (startTimeMs > 0 && finishTimeMs > 0 && finishTimeMs > startTimeMs) {
          const durationMs = finishTimeMs - startTimeMs;
          const durationMinutes = Math.round(durationMs / (1000 * 60));
          // 経過時間が既に設定されていない場合のみ設定
          if (!deliveryCaseData.duration) {
            deliveryCaseData.duration = durationMinutes;
          }
          deliveryCaseData.deliveryStartTime = firestore.Timestamp.fromDate(new Date(startTimeMs));
          deliveryCaseData.deliveryEndTime = firestore.Timestamp.fromDate(new Date(finishTimeMs));
          deliveryCaseData.actualDurationSeconds = Math.round(durationMs / 1000);
        }
      }
      
      if (data.memo && data.memo.trim()) {
        deliveryCaseData.memo = data.memo.trim();
      }
      
      if (data.deliveryService === 'その他') {
        deliveryCaseData.customDeliveryServiceName = data.deliveryService;
      }

      // Firestoreに保存
      await firestore()
        .collection('deliveryCases')
        .add(deliveryCaseData);

      console.log('Delivery case saved successfully from overlay form');
    } catch (error) {
      console.error('Error saving delivery case from overlay form:', error);
      throw error;
    }
  }, [state.currentSession, state.currentSessionId]);

  // 初期化は一度だけ実行
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const initializeOverlay = async () => {
      try {
        console.log('Initializing overlay context...');
        // 少し待ってからサービスの設定を取得（非同期読み込み完了を待つ）
        await new Promise(resolve => setTimeout(resolve, 100));
        const settings = overlayService.getSettings();
        console.log('Loading overlay settings in context:', settings);
        setOverlaySettings(settings);
        setIsOverlayEnabled(settings.isEnabled);

        // オーバーレイフォーム送信のコールバックを設定
        overlayService.setOnFormSubmittedCallback(async (formData: FormData) => {
          console.log('Overlay form submitted, saving data:', formData);
          try {
            await saveDeliveryCase(formData);
            console.log('Delivery case saved successfully from overlay form');
          } catch (error) {
            console.error('Error saving delivery case from overlay form:', error);
          }
        });

        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing overlay context:', error);
      }
    };

    initializeOverlay();

    // クリーンアップ関数
    return () => {
      if (isInitializedRef.current) {
        console.log('OverlayContext: Cleaning up overlay service');
        overlayService.destroy();
        // アプリ終了時にサービスを確実に停止
        overlayService.hideOverlay();
        isInitializedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存関係を空にして一度だけ実行（overlayServiceとsaveDeliveryCaseはuseRefとuseCallbackで安定化）

  // saveDeliveryCase関数の更新時にコールバックを再設定
  useEffect(() => {
    if (isInitializedRef.current) {
      overlayService.setOnFormSubmittedCallback(async (formData: FormData) => {
        console.log('Overlay form submitted, saving data:', formData);
        try {
          await saveDeliveryCase(formData);
          console.log('Delivery case saved successfully from overlay form');
        } catch (error) {
          console.error('Error saving delivery case from overlay form:', error);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveDeliveryCase]); // overlayServiceはuseRefで固定されているため依存関係に含めない

  // 勤務状態の変化を監視してオーバーレイを制御（設定は変更しない）
  useEffect(() => {
    const handleWorkStateChange = async () => {
      console.log('=== OVERLAY CONTEXT DEBUG ===');
      console.log('Work state changed:', state.status);
      console.log('Overlay enabled:', isOverlayEnabled);
      console.log('Current session:', state.currentSession ? 'exists' : 'null');
      console.log('Current session ID:', state.currentSessionId);
      console.log('================================');
      
      if (isOverlayEnabled) {
        if (state.status === 'working') {
          // 勤務中の場合、ネイティブオーバーレイを表示
          console.log('✅ Work started, showing native overlay form');
          await overlayService.showOverlay();
        } else {
          // 勤務終了時（idle, break含む）、ネイティブオーバーレイを非表示（設定は保持）
          console.log('❌ Work ended or not working (status: ' + state.status + '), hiding native overlay form');
          await overlayService.hideOverlay();
        }
      } else {
        // オーバーレイが無効の場合は常に非表示
        console.log('🚫 Overlay disabled, ensuring overlay is hidden');
        await overlayService.hideOverlay();
      }
    };

    handleWorkStateChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, isOverlayEnabled]); // overlayServiceはuseRefで固定されているため依存関係に含めない

  const enableOverlay = async (): Promise<boolean> => {
    try {
      console.log('Enabling overlay...');
      
      // まず設定を保存
      await overlayService.updateSettings({ isEnabled: true });
      
      // 状態を更新
      setIsOverlayEnabled(true);
      const newSettings = { ...overlaySettings, isEnabled: true };
      setOverlaySettings(newSettings);
      
      // 勤務中の場合のみネイティブオーバーレイを表示
      if (state.status === 'working') {
        const success = await overlayService.showOverlay();
        console.log('Overlay enabled and shown during work:', success);
        return success;
      } else {
        console.log('Overlay enabled but not shown (not working)');
        return true;
      }
    } catch (error) {
      console.error('Error enabling overlay:', error);
      // エラーが発生した場合は状態を元に戻す
      try {
        await overlayService.updateSettings({ isEnabled: false });
        setIsOverlayEnabled(false);
        const revertSettings = { ...overlaySettings, isEnabled: false };
        setOverlaySettings(revertSettings);
      } catch (revertError) {
        console.error('Error reverting overlay settings:', revertError);
      }
      return false;
    }
  };

  const disableOverlay = async (): Promise<void> => {
    try {
      console.log('Disabling overlay...');
      
      // オーバーレイを非表示
      await overlayService.hideOverlay();
      
      // 設定を保存
      await overlayService.updateSettings({ isEnabled: false });
      
      // 状態を更新
      setIsOverlayEnabled(false);
      const newSettings = { ...overlaySettings, isEnabled: false };
      setOverlaySettings(newSettings);
      
      console.log('Overlay disabled and hidden');
    } catch (error) {
      console.error('Error disabling overlay:', error);
    }
  };

  const updateOverlaySettings = async (newSettings: Partial<OverlaySettings>): Promise<void> => {
    try {
      await overlayService.updateSettings(newSettings);
      const updatedSettings = { ...overlaySettings, ...newSettings };
      setOverlaySettings(updatedSettings);
    } catch (error) {
      console.error('Error updating overlay settings:', error);
    }
  };

  const updateOverlayPosition = async (position: OverlayPosition): Promise<void> => {
    try {
      await overlayService.updateOverlayPosition(position);
      const updatedSettings = { ...overlaySettings, position };
      setOverlaySettings(updatedSettings);
    } catch (error) {
      console.error('Error updating overlay position:', error);
    }
  };

  const checkPermission = async (): Promise<boolean> => {
    return await overlayService.checkOverlayPermission();
  };

  const requestPermission = async (): Promise<boolean> => {
    return await overlayService.requestOverlayPermission();
  };

  const contextValue: OverlayContextType = {
    // 状態
    isOverlayEnabled,
    overlaySettings,
    
    // 制御
    enableOverlay,
    disableOverlay,
    
    // 設定
    updateOverlaySettings,
    updateOverlayPosition,
    
    // 権限
    checkPermission,
    requestPermission,
  };

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = (): OverlayContextType => {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};

export default OverlayContext; 