import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';
import { RoutePoint, GpsTrackingState, GpsSettings } from '../types/driveLog';

export class GpsService {
  private static instance: GpsService;
  private watchId: number | null = null;
  private fallbackWatchId: number | null = null;
  private useFallback: boolean = false;
  private trackingState: GpsTrackingState = {
    isTracking: false,
    currentRoutePoints: [],
    totalDistance: 0,
  };
  
  private settings: GpsSettings = {
    accuracyMode: 'balanced',
    updateInterval: 5000, // 5秒
    distanceFilter: 10, // 10メートル
  };
  
  private listeners: ((state: GpsTrackingState) => void)[] = [];

  public static getInstance(): GpsService {
    if (!GpsService.instance) {
      GpsService.instance = new GpsService();
    }
    return GpsService.instance;
  }

  // 位置情報の権限確認・リクエスト
  public async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === 'granted'
        );
      } catch (err) {
        console.warn('Location permission request failed:', err);
        return false;
      }
    }
    
    // iOS の場合は自動で権限ダイアログが表示される
    return true;
  }

  // バックグラウンド位置情報権限のリクエスト (Android)
  public async requestBackgroundLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 29) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        return granted === 'granted';
      } catch (err) {
        console.warn('Background location permission request failed:', err);
        return false;
      }
    }
    return true;
  }

  // GPS設定の更新
  public updateSettings(settings: Partial<GpsSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  // GPS精度設定の変換
  private getGeolocationOptions() {
    const { accuracyMode, updateInterval, distanceFilter } = this.settings;
    
    let enableHighAccuracy = true;
    let timeout = 15000;
    let maximumAge = 10000;
    
    switch (accuracyMode) {
      case 'high':
        enableHighAccuracy = true;
        timeout = 20000;
        maximumAge = 5000;
        break;
      case 'balanced':
        enableHighAccuracy = true;
        timeout = 15000;
        maximumAge = 10000;
        break;
      case 'low_power':
        enableHighAccuracy = false;
        timeout = 10000;
        maximumAge = 30000;
        break;
    }
    
    return {
      enableHighAccuracy,
      timeout,
      maximumAge,
      interval: updateInterval,
      distanceFilter,
      forceRequestLocation: true,
      forceLocationManager: true, // Changed to true for better compatibility
      showLocationDialog: true,
      useSignificantChanges: false,
    };
  }

  // 2点間の距離を計算 (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // 地球の半径 (メートル)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // トラッキング開始
  public async startTracking(): Promise<boolean> {
    try {
      // 権限確認
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        console.warn('Location permission denied');
        return false;
      }

      if (this.trackingState.isTracking) {
        console.warn('Tracking is already started');
        return true;
      }

      // 初期化
      this.trackingState = {
        isTracking: true,
        currentRoutePoints: [],
        trackingStartTime: new Date(),
        totalDistance: 0,
        currentSpeed: 0,
      };

      const options = this.getGeolocationOptions();

      // まずreact-native-geolocation-serviceを試す
      try {
        this.watchId = Geolocation.watchPosition(
          (position) => {
            this.handleLocationUpdate(position);
          },
          (error) => {
            console.error('GPS tracking error with geolocation-service:', error);
            // エラーが発生した場合、フォールバックを試す
            this.tryFallbackGeolocation(options);
          },
          options
        );
        console.log('GPS tracking started with react-native-geolocation-service');
      } catch (error) {
        console.error('Failed to start with geolocation-service, trying fallback:', error);
        this.tryFallbackGeolocation(options);
      }

      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
      return false;
    }
  }

  // フォールバック用のGeolocation API
  private tryFallbackGeolocation(options: any): void {
    try {
      // React Nativeの標準Geolocation APIを使用
      const { Geolocation: RNGeolocation } = require('react-native');
      
      this.useFallback = true;
      this.fallbackWatchId = RNGeolocation.watchPosition(
        (position: any) => {
          console.log('Using fallback geolocation');
          this.handleLocationUpdate(position);
        },
        (error: any) => {
          console.error('Fallback GPS tracking error:', error);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge,
        }
      );
      console.log('GPS tracking started with fallback geolocation');
    } catch (fallbackError) {
      console.error('Fallback geolocation also failed:', fallbackError);
    }
  }

  // 位置情報更新の処理
  private handleLocationUpdate(position: any): void {
    if (!this.trackingState.isTracking) return;

    const { latitude, longitude, speed, accuracy } = position.coords;
    const timestamp = new Date();

    const newPoint: RoutePoint = {
      latitude,
      longitude,
      timestamp,
      speed: speed ? speed * 3.6 : undefined, // m/s to km/h
      accuracy,
    };

    // 距離計算
    let addedDistance = 0;
    if (this.trackingState.currentRoutePoints.length > 0) {
      const lastPoint = this.trackingState.currentRoutePoints[
        this.trackingState.currentRoutePoints.length - 1
      ];
      addedDistance = this.calculateDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        latitude,
        longitude
      );
    }

    // 状態更新
    this.trackingState = {
      ...this.trackingState,
      currentPosition: { latitude, longitude, accuracy },
      currentRoutePoints: [...this.trackingState.currentRoutePoints, newPoint],
      totalDistance: this.trackingState.totalDistance + addedDistance,
      currentSpeed: speed ? speed * 3.6 : 0,
    };

    this.notifyListeners();
  }

  // トラッキング停止
  public stopTracking(): GpsTrackingState {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.fallbackWatchId !== null) {
      const { Geolocation: RNGeolocation } = require('react-native');
      RNGeolocation.clearWatch(this.fallbackWatchId);
      this.fallbackWatchId = null;
    }

    this.useFallback = false;

    const finalState = { ...this.trackingState };
    this.trackingState = {
      isTracking: false,
      currentRoutePoints: [],
      totalDistance: 0,
    };

    this.notifyListeners();
    return finalState;
  }

  // 現在の状態取得
  public getTrackingState(): GpsTrackingState {
    return { ...this.trackingState };
  }

  // 統計計算
  public calculateStatistics(routePoints: RoutePoint[]): {
    totalDistance: number;
    duration: number;
    averageSpeed: number;
    maxSpeed: number;
  } {
    if (routePoints.length === 0) {
      return { totalDistance: 0, duration: 0, averageSpeed: 0, maxSpeed: 0 };
    }

    let totalDistance = 0;
    let maxSpeed = 0;

    // 距離と最高速度の計算
    for (let i = 1; i < routePoints.length; i++) {
      const prevPoint = routePoints[i - 1];
      const currentPoint = routePoints[i];
      
      const distance = this.calculateDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        currentPoint.latitude,
        currentPoint.longitude
      );
      totalDistance += distance;

      if (currentPoint.speed && currentPoint.speed > maxSpeed) {
        maxSpeed = currentPoint.speed;
      }
    }

    // 継続時間の計算
    const startTime = routePoints[0].timestamp.getTime();
    const endTime = routePoints[routePoints.length - 1].timestamp.getTime();
    const duration = (endTime - startTime) / 1000; // 秒

    // 平均速度の計算
    const averageSpeed = duration > 0 ? (totalDistance / 1000) / (duration / 3600) : 0; // km/h

    return {
      totalDistance,
      duration,
      averageSpeed,
      maxSpeed,
    };
  }

  // リスナー登録
  public addListener(callback: (state: GpsTrackingState) => void): void {
    this.listeners.push(callback);
  }

  // リスナー削除
  public removeListener(callback: (state: GpsTrackingState) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // リスナーに通知
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.trackingState));
  }

  // 現在位置の一回取得
  public async getCurrentPosition(): Promise<{latitude: number, longitude: number} | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) return null;

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Get current position error:', error);
            reject(error);
          },
          this.getGeolocationOptions()
        );
      });
    } catch (error) {
      console.error('Failed to get current position:', error);
      return null;
    }
  }
}
