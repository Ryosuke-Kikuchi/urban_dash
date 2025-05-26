import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
  autoBackup: boolean;
  defaultService: string;
  language: 'ja' | 'en';
}

interface TempWorkData {
  sessionId?: string;
  startTime?: string;
  status?: 'idle' | 'working' | 'break';
  breakStart?: string;
}

class StorageService {
  private static instance: StorageService;
  
  // キー定数
  private readonly KEYS = {
    USER_SETTINGS: 'user_settings',
    TEMP_WORK_DATA: 'temp_work_data',
    LAST_SYNC: 'last_sync',
    OFFLINE_QUEUE: 'offline_queue',
  };

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // ユーザー設定の保存・取得
  async saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const currentSettings = await this.getUserSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem(this.KEYS.USER_SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('ユーザー設定の保存に失敗しました:', error);
      throw error;
    }
  }

  async getUserSettings(): Promise<UserSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(this.KEYS.USER_SETTINGS);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }
      
      // デフォルト設定を返す
      const defaultSettings: UserSettings = {
        theme: 'dark',
        notifications: true,
        autoBackup: true,
        defaultService: 'Uber Eats',
        language: 'ja',
      };
      
      await this.saveUserSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('ユーザー設定の取得に失敗しました:', error);
      // エラー時はデフォルト設定を返す
      return {
        theme: 'dark',
        notifications: true,
        autoBackup: true,
        defaultService: 'Uber Eats',
        language: 'ja',
      };
    }
  }

  // 一時的な勤務データの保存・取得
  async saveTempWorkData(data: TempWorkData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.TEMP_WORK_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('一時勤務データの保存に失敗しました:', error);
    }
  }

  async getTempWorkData(): Promise<TempWorkData | null> {
    try {
      const dataJson = await AsyncStorage.getItem(this.KEYS.TEMP_WORK_DATA);
      return dataJson ? JSON.parse(dataJson) : null;
    } catch (error) {
      console.error('一時勤務データの取得に失敗しました:', error);
      return null;
    }
  }

  async clearTempWorkData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.TEMP_WORK_DATA);
    } catch (error) {
      console.error('一時勤務データの削除に失敗しました:', error);
    }
  }

  // 最終同期時刻の管理
  async saveLastSyncTime(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(this.KEYS.LAST_SYNC, now);
    } catch (error) {
      console.error('最終同期時刻の保存に失敗しました:', error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timeString = await AsyncStorage.getItem(this.KEYS.LAST_SYNC);
      return timeString ? new Date(timeString) : null;
    } catch (error) {
      console.error('最終同期時刻の取得に失敗しました:', error);
      return null;
    }
  }

  // オフラインキューの管理
  async addToOfflineQueue(action: any): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push({
        ...action,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
      });
      await AsyncStorage.setItem(this.KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('オフラインキューへの追加に失敗しました:', error);
    }
  }

  async getOfflineQueue(): Promise<any[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.KEYS.OFFLINE_QUEUE);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('オフラインキューの取得に失敗しました:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('オフラインキューの削除に失敗しました:', error);
    }
  }

  // 全データの削除（ログアウト時など）
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.TEMP_WORK_DATA,
        this.KEYS.LAST_SYNC,
        this.KEYS.OFFLINE_QUEUE,
      ]);
      // ユーザー設定は保持する
    } catch (error) {
      console.error('データの削除に失敗しました:', error);
    }
  }

  // アプリ状態の復元
  async restoreAppState(): Promise<{
    userSettings: UserSettings;
    tempWorkData: TempWorkData | null;
    lastSyncTime: Date | null;
  }> {
    try {
      const [userSettings, tempWorkData, lastSyncTime] = await Promise.all([
        this.getUserSettings(),
        this.getTempWorkData(),
        this.getLastSyncTime(),
      ]);

      return {
        userSettings,
        tempWorkData,
        lastSyncTime,
      };
    } catch (error) {
      console.error('アプリ状態の復元に失敗しました:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
const storageService = StorageService.getInstance();
export default storageService;
export type { UserSettings, TempWorkData }; 