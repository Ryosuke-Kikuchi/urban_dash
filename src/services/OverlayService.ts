import { Platform, Alert, Linking, AppState, AppStateStatus, NativeModules, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface OverlaySettings {
  isEnabled: boolean;
  position: OverlayPosition;
  opacity: number;
  size: number;
}

export interface FormData {
  deliveryService: string;
  estimatedTime: string;
  reward: string;
  startTime?: string;
  finishTime?: string;
  memo: string;
  distance: string;
  durationMinutes: string;
}

export default class OverlayService {
  private static instance: OverlayService;
  private settings: OverlaySettings;
  private isOverlayVisible: boolean = false;
  private isShowingOverlay: boolean = false; // 表示処理中フラグ
  private isHidingOverlay: boolean = false; // 非表示処理中フラグ
  private appStateSubscription: any = null;
  private overlayEventSubscription: any = null;
  private onFormSubmittedCallback: ((data: FormData) => void) | null = null;

  private constructor() {
    console.log('OverlayService: Constructor called');
    this.settings = {
      isEnabled: false,
      position: { x: 50, y: 200 },
      opacity: 0.8,
      size: 60,
    };
    console.log('OverlayService: Initial settings:', JSON.stringify(this.settings));
    this.loadSettings().then(() => {
      console.log('OverlayService: Settings loaded:', JSON.stringify(this.settings));
      // 設定読み込み後にリスナーを設定
      this.setupAppStateListener();
      this.setupOverlayEventListener();
      // 初期化時はオーバーレイを非表示にする（アプリがフォアグラウンドにいるため）
      console.log('OverlayService: Calling hideOverlay() during initialization');
      this.hideOverlay();
    });
  }

  public static getInstance(): OverlayService {
    if (!OverlayService.instance) {
      OverlayService.instance = new OverlayService();
    }
    return OverlayService.instance;
  }

  private setupOverlayEventListener(): void {
    if (Platform.OS === 'android') {
      console.log('Setting up overlay form event listener');
      this.overlayEventSubscription = DeviceEventEmitter.addListener(
        'OverlayFormSubmitted',
        (event) => {
          console.log('Overlay form submitted event received:', event);
          if (this.onFormSubmittedCallback && event.action === 'form_submitted') {
            console.log('Calling form submitted callback');
            const formData: FormData = {
              deliveryService: event.deliveryService,
              estimatedTime: event.estimatedTime || '0',
              reward: event.reward,
              startTime: event.startTime,
              finishTime: event.finishTime,
              memo: event.memo || '',
              distance: event.distance || '0',
              durationMinutes: event.durationMinutes || '0'
            };
            this.onFormSubmittedCallback(formData);
          } else {
            console.log('No form submitted callback set');
          }
        }
      );
    }
  }

  public setOnFormSubmittedCallback(callback: (data: FormData) => void): void {
    console.log('Setting overlay form submitted callback');
    this.onFormSubmittedCallback = callback;
  }

  /**
   * オーバーレイ権限をチェックする
   */
  public async checkOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const { OverlayModule } = NativeModules;
      if (OverlayModule) {
        return await OverlayModule.checkOverlayPermission();
      } else {
        // フォールバック: AsyncStorageを使用
        const hasPermission = await AsyncStorage.getItem('overlay_permission_granted');
        return hasPermission === 'true';
      }
    } catch (error) {
      console.error('Error checking overlay permission:', error);
      return false;
    }
  }

  /**
   * オーバーレイ権限を要求する
   */
  public async requestOverlayPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const { OverlayModule } = NativeModules;
      if (OverlayModule) {
        return await OverlayModule.requestOverlayPermission();
      } else {
        // フォールバック: 設定画面を開く
        return new Promise((resolve) => {
          Alert.alert(
            'オーバーレイ権限が必要です',
            'Urban Dashが他のアプリの上に表示できるようにするため、設定で「他のアプリの上に表示」を許可してください。',
            [
              {
                text: 'キャンセル',
                onPress: () => resolve(false),
                style: 'cancel',
              },
              {
                text: '設定を開く',
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                    await AsyncStorage.setItem('overlay_permission_granted', 'true');
                    resolve(true);
                  } catch (error) {
                    console.error('Error opening settings:', error);
                    resolve(false);
                  }
                },
              },
            ],
          );
        });
      }
    } catch (error) {
      console.error('Error requesting overlay permission:', error);
      return false;
    }
  }

  /**
   * オーバーレイを表示する
   */
  public async showOverlay(): Promise<boolean> {
    console.log('OverlayService: showOverlay() called');
    console.log('OverlayService: Platform.OS =', Platform.OS);
    console.log('OverlayService: isShowingOverlay =', this.isShowingOverlay);
    console.log('OverlayService: isOverlayVisible =', this.isOverlayVisible);
    
    if (Platform.OS !== 'android') {
      console.warn('Overlay is only supported on Android');
      return false;
    }

    // 既に表示処理中の場合はスキップ
    if (this.isShowingOverlay) {
      console.log('OverlayService: Show overlay already in progress, skipping');
      return true;
    }

    // 既に表示されている場合はスキップ
    if (this.isOverlayVisible) {
      console.log('OverlayService: Overlay already visible, skipping');
      return true;
    }

    this.isShowingOverlay = true;

    try {
      console.log('OverlayService: Checking overlay permission...');
      const hasPermission = await this.checkOverlayPermission();
      console.log('OverlayService: Permission check result:', hasPermission);
      
      if (!hasPermission) {
        console.warn('OverlayService: Overlay permission not granted');
        this.isShowingOverlay = false;
        return false;
      }

      console.log('OverlayService: Starting overlay display...');
      const { OverlayModule } = NativeModules;
      console.log('OverlayService: OverlayModule available:', !!OverlayModule);
      
      if (OverlayModule) {
        console.log('OverlayService: Calling OverlayModule.showOverlay()...');
        const result = await OverlayModule.showOverlay();
        console.log('OverlayService: Native showOverlay() result:', result);
        console.log('OverlayService: Native overlay form service started');
      } else {
        console.error('OverlayService: OverlayModule is not available');
        this.isShowingOverlay = false;
        return false;
      }

      this.isOverlayVisible = true;
      console.log('OverlayService: Set isOverlayVisible to true');
      
      console.log('OverlayService: Overlay form shown successfully');
      return true;
    } catch (error) {
      console.error('OverlayService: Error showing overlay:', error);
      this.isShowingOverlay = false;
      return false;
    } finally {
      this.isShowingOverlay = false;
      console.log('OverlayService: showOverlay() completed - isVisible:', this.isOverlayVisible);
    }
  }

  /**
   * オーバーレイを非表示にする
   */
  public async hideOverlay(): Promise<void> {
    console.log('OverlayService: hideOverlay() called - isHiding:', this.isHidingOverlay, 'isVisible:', this.isOverlayVisible);
    
    // 既に非表示処理中の場合はスキップ
    if (this.isHidingOverlay) {
      console.log('OverlayService: Hide overlay already in progress, skipping');
      return;
    }

    // 既に非表示の場合はスキップ
    if (!this.isOverlayVisible) {
      console.log('OverlayService: Overlay already hidden, skipping');
      return;
    }

    this.isHidingOverlay = true;

    try {
      console.log('OverlayService: Attempting to hide overlay...');
      const { OverlayModule } = NativeModules;
      if (OverlayModule) {
        console.log('OverlayService: Calling OverlayModule.hideOverlay()');
        await OverlayModule.hideOverlay();
        console.log('OverlayService: Native overlay hideOverlay() completed');
      } else {
        console.error('OverlayService: OverlayModule is not available');
      }

      this.isOverlayVisible = false;
      console.log('OverlayService: Set isOverlayVisible to false');
      
      console.log('OverlayService: Overlay form hidden successfully');
    } catch (error) {
      console.error('OverlayService: Error hiding overlay:', error);
    } finally {
      this.isHidingOverlay = false;
      console.log('OverlayService: hideOverlay() completed - isVisible:', this.isOverlayVisible);
    }
  }

  /**
   * オーバーレイの位置を更新する
   */
  public async updateOverlayPosition(position: OverlayPosition): Promise<void> {
    this.settings.position = position;
    await this.saveSettings();
    
    try {
      const { OverlayModule } = NativeModules;
      if (OverlayModule) {
        await OverlayModule.updateOverlayPosition(position.x, position.y);
      }
    } catch (error) {
      console.error('Error updating overlay position:', error);
    }
    
    console.log('Overlay position updated:', position);
  }

  /**
   * オーバーレイの設定を更新する
   */
  public async updateSettings(newSettings: Partial<OverlaySettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // 実際の実装では、ネイティブモジュールに設定を通知
    console.log('Overlay settings updated:', this.settings);
  }

  /**
   * 現在の設定を取得する
   */
  public getSettings(): OverlaySettings {
    return { ...this.settings };
  }

  /**
   * オーバーレイが表示されているかチェック
   */
  public isVisible(): boolean {
    return this.isOverlayVisible;
  }

  /**
   * 設定をローカルストレージから読み込む
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('overlay_settings');
      if (settingsJson) {
        const savedSettings = JSON.parse(settingsJson);
        this.settings = { ...this.settings, ...savedSettings };
        console.log('Overlay settings loaded:', this.settings);
      }
    } catch (error) {
      console.error('Error loading overlay settings:', error);
    }
  }

  /**
   * 設定をローカルストレージに保存する
   */
  private async saveSettings(newSettings?: Partial<OverlaySettings>): Promise<void> {
    try {
      if (newSettings) {
        this.settings = { ...this.settings, ...newSettings };
      }
      await AsyncStorage.setItem('overlay_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving overlay settings:', error);
    }
  }

  private setupAppStateListener(): void {
    console.log('OverlayService: setupAppStateListener called');
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    console.log('OverlayService: AppState listener registered');
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    console.log('=====================================');
    console.log('OverlayService: handleAppStateChange called with', nextAppState);
    console.log('OverlayService: App state changed to:', nextAppState);
    console.log('OverlayService: Settings enabled:', this.settings.isEnabled);
    console.log('OverlayService: Current overlay visible state:', this.isOverlayVisible);
    console.log('OverlayService: isShowingOverlay:', this.isShowingOverlay);
    console.log('OverlayService: isHidingOverlay:', this.isHidingOverlay);
    console.log('OverlayService: Full settings:', JSON.stringify(this.settings));
    console.log('=====================================');
    
    if (nextAppState === 'active') {
      // アプリがフォアグラウンドに戻った時は必ずオーバーレイを非表示
      console.log('OverlayService: 🟢 App moved to FOREGROUND, hiding overlay');
      this.hideOverlay();
    } else if ((nextAppState === 'background' || nextAppState === 'inactive') && this.settings.isEnabled) {
      // アプリがバックグラウンドに移行し、かつオーバーレイが有効な場合のみ表示
      console.log('OverlayService: 🔴 App moved to BACKGROUND and overlay ENABLED, showing overlay');
      this.showOverlay();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // オーバーレイが無効でアプリがバックグラウンドに移行した場合、サービスを停止
      console.log('OverlayService: 🔴 App moved to BACKGROUND with overlay DISABLED, ensuring overlay is hidden');
      this.hideOverlay();
    }
  };

  private async ensureNativeOverlayVisible(): Promise<void> {
    try {
      const { OverlayModule } = NativeModules;
      if (OverlayModule && Platform.OS === 'android') {
        // ネイティブオーバーレイを再表示
        await OverlayModule.showOverlay();
        console.log('Native overlay ensured visible');
      }
    } catch (error) {
      console.error('Error ensuring native overlay visible:', error);
    }
  }

  public destroy(): void {
    console.log('OverlayService: Destroying service...');
    
    // リスナーを削除
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.overlayEventSubscription) {
      this.overlayEventSubscription.remove();
      this.overlayEventSubscription = null;
    }
    
    // オーバーレイを非表示にして状態をリセット
    this.hideOverlay();
    this.isOverlayVisible = false;
    this.isShowingOverlay = false;
    this.isHidingOverlay = false;
    this.onFormSubmittedCallback = null;
    
    console.log('OverlayService: Service destroyed');
  }
} 