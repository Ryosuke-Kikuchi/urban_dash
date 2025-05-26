import firestore from '@react-native-firebase/firestore';
import { DriveLog } from '../types/driveLog';

export class DriveLogService {
  private static instance: DriveLogService;
  private collection = firestore().collection('driveLogs');

  public static getInstance(): DriveLogService {
    if (!DriveLogService.instance) {
      DriveLogService.instance = new DriveLogService();
    }
    return DriveLogService.instance;
  }

  // 走行ログを保存
  public async saveDriveLog(driveLogData: Omit<DriveLog, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await this.collection.add({
        ...driveLogData,
        startTime: firestore.Timestamp.fromDate(driveLogData.startTime),
        endTime: firestore.Timestamp.fromDate(driveLogData.endTime),
        routePath: driveLogData.routePath.map(point => ({
          ...point,
          timestamp: firestore.Timestamp.fromDate(point.timestamp),
        })),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      
      console.log('Drive log saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving drive log:', error);
      throw new Error('走行ログの保存に失敗しました');
    }
  }

  // 特定ユーザーの走行ログを取得（インデックス不要版）
  public async getDriveLogsByUserId(userId: string, limit: number = 50): Promise<DriveLog[]> {
    try {
      // シンプルなクエリでインデックスエラーを回避
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .get();

      // JavaScriptでソートして制限を適用
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          workSessionId: data.workSessionId,
          deliveryCaseId: data.deliveryCaseId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          totalDistanceMeters: data.totalDistanceMeters,
          durationSeconds: data.durationSeconds,
          averageSpeedKmh: data.averageSpeedKmh,
          maxSpeedKmh: data.maxSpeedKmh,
          routePath: data.routePath.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp.toDate(),
            speed: point.speed,
            accuracy: point.accuracy,
          })),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // startTimeで降順ソートして制限を適用
      return logs
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error fetching drive logs:', error);
      throw new Error('走行ログの取得に失敗しました');
    }
  }

  // 特定のworkSessionIdに紐づく走行ログを取得（インデックス不要版）
  public async getDriveLogsByWorkSession(workSessionId: string): Promise<DriveLog[]> {
    try {
      // シンプルなクエリでインデックスエラーを回避
      const snapshot = await this.collection
        .where('workSessionId', '==', workSessionId)
        .get();

      // JavaScriptでソートして返す
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          workSessionId: data.workSessionId,
          deliveryCaseId: data.deliveryCaseId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          totalDistanceMeters: data.totalDistanceMeters,
          durationSeconds: data.durationSeconds,
          averageSpeedKmh: data.averageSpeedKmh,
          maxSpeedKmh: data.maxSpeedKmh,
          routePath: data.routePath.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp.toDate(),
            speed: point.speed,
            accuracy: point.accuracy,
          })),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // startTimeで昇順ソート
      return logs.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } catch (error) {
      console.error('Error fetching drive logs by work session:', error);
      throw new Error('勤務セッションの走行ログ取得に失敗しました');
    }
  }

  // 走行ログを削除
  public async deleteDriveLog(logId: string): Promise<void> {
    try {
      await this.collection.doc(logId).delete();
      console.log('Drive log deleted:', logId);
    } catch (error) {
      console.error('Error deleting drive log:', error);
      throw new Error('走行ログの削除に失敗しました');
    }
  }

  // 期間内の走行ログを取得（インデックス不要版）
  public async getDriveLogsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DriveLog[]> {
    try {
      // シンプルなクエリでインデックスエラーを回避
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('startTime', '>=', firestore.Timestamp.fromDate(startDate))
        .where('startTime', '<=', firestore.Timestamp.fromDate(endDate))
        .get();

      // JavaScriptでソートして返す
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          workSessionId: data.workSessionId,
          deliveryCaseId: data.deliveryCaseId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          totalDistanceMeters: data.totalDistanceMeters,
          durationSeconds: data.durationSeconds,
          averageSpeedKmh: data.averageSpeedKmh,
          maxSpeedKmh: data.maxSpeedKmh,
          routePath: data.routePath.map((point: any) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp.toDate(),
            speed: point.speed,
            accuracy: point.accuracy,
          })),
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      });

      // startTimeで降順ソート
      return logs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } catch (error) {
      console.error('Error fetching drive logs by date range:', error);
      throw new Error('期間内の走行ログ取得に失敗しました');
    }
  }

  // 走行ログの統計を取得
  public async getDriveLogStatistics(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    totalDistance: number;
    totalDuration: number;
    averageSpeed: number;
    maxSpeed: number;
  }> {
    try {
      let query = this.collection.where('userId', '==', userId);
      
      if (startDate) {
        query = query.where('startTime', '>=', firestore.Timestamp.fromDate(startDate));
      }
      if (endDate) {
        query = query.where('startTime', '<=', firestore.Timestamp.fromDate(endDate));
      }

      const snapshot = await query.get();
      
      let totalDistance = 0;
      let totalDuration = 0;
      let maxSpeed = 0;
      let totalSpeedSum = 0;
      let speedCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalDistance += data.totalDistanceMeters || 0;
        totalDuration += data.durationSeconds || 0;
        
        if (data.maxSpeedKmh && data.maxSpeedKmh > maxSpeed) {
          maxSpeed = data.maxSpeedKmh;
        }
        
        if (data.averageSpeedKmh) {
          totalSpeedSum += data.averageSpeedKmh;
          speedCount++;
        }
      });

      return {
        totalLogs: snapshot.size,
        totalDistance,
        totalDuration,
        averageSpeed: speedCount > 0 ? totalSpeedSum / speedCount : 0,
        maxSpeed,
      };
    } catch (error) {
      console.error('Error fetching drive log statistics:', error);
      throw new Error('走行ログ統計の取得に失敗しました');
    }
  }
} 