import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc, query, where, orderBy, getDocs, limit, enableNetwork, disableNetwork } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { DeliveryRecordData } from '../context/WorkContext'; // DeliveryRecordData をインポート

export interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkSessionData {
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed';
  breakPeriods: BreakPeriodData[];
  statistics?: any;
  _totalWorkingDurationSeconds?: number;
  _totalBreakDurationSeconds?: number;
  _totalEarnings?: number;
  _totalCases?: number;
  _averageHourlyRate?: number;
}

export interface BreakPeriodData {
  startTime: Date;
  endTime?: Date;
}

export interface DeliveryCaseData {
  userId: string;
  workSessionId: string;
  service: string;
  estimatedTime?: number; // 予想時間（分単位）
  earnings: number;
  tip: number;
  duration: number; // 分単位
  timestamp: Date;
  deliveryStartTime?: Date; // 配達開始時間
  deliveryEndTime?: Date; // 配達終了時間
  actualDurationSeconds?: number; // 実際の配達時間（秒）
  memo?: string;
}

class FirebaseService {
  // 配達記録をFirestoreに追加するメソッド
  async addDeliveryRecord(recordData: DeliveryRecordData): Promise<any> {
    try {
      const docRef = await addDoc(collection(this.db, 'deliveryRecords'), recordData);
      return docRef;
    } catch (error) {
      console.error('Error adding delivery record to Firestore: ', error);
      throw error;
    }
  }

  private static instance: FirebaseService;
  private db: any;
  private auth: any;

  constructor() {
    this.db = getFirestore();
    this.auth = auth();
    this.initializeOfflineSupport();
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // オフラインサポートの初期化
  private async initializeOfflineSupport() {
    try {
      // Firestoreのオフライン永続化を有効にする
      // React Native Firebaseでは自動的に有効になっているが、明示的に設定
      console.log('Firestore offline support initialized');
    } catch (error) {
      console.warn('Firestore offline support initialization failed:', error);
    }
  }

  // ネットワーク状態の管理
  async enableOfflineMode() {
    try {
      await disableNetwork(this.db);
      console.log('Firestore offline mode enabled');
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
    }
  }

  async enableOnlineMode() {
    try {
      await enableNetwork(this.db);
      console.log('Firestore online mode enabled');
    } catch (error) {
      console.error('Failed to enable online mode:', error);
    }
  }

  // ユーザープロファイル関連
  async createUserProfile(user: any, nickname: string): Promise<void> {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      nickname,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(collection(this.db, 'users'), user.uid), userProfile);
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docSnap = await getDoc(doc(collection(this.db, 'users'), uid));
      // Replace doc with docSnap for subsequent logic
      // For example, if (doc.exists) becomes if (docSnap.exists()) and doc.data() becomes docSnap.data()
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
          updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
        } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('ユーザープロファイル取得エラー:', error);
      return null;
    }
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    await updateDoc(doc(collection(this.db, 'users'), uid), {
      ...updates,
      updatedAt: new Date(),
    });
  }

  // 勤務セッション関連
  async createWorkSession(sessionData: WorkSessionData): Promise<string> {
    const docRef = await addDoc(collection(this.db, 'workSessions'), sessionData);
    return docRef.id;
  }

  async updateWorkSession(sessionId: string, updates: Partial<WorkSessionData>): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          throw new Error('ユーザーが認証されていません');
        }

        await updateDoc(doc(collection(this.db, 'workSessions'), sessionId), updates);
        return; // 成功したので終了

      } catch (error: any) {
        attempt++;
        
        if (error?.code === 'firestore/permission-denied' && attempt < maxRetries) {
          // 認証トークンをリフレッシュして再試行
          try {
            const user = this.getCurrentUser();
            if (user) {
              await user.getIdToken(true); // forceRefresh = true
              continue; // 再試行
            }
          } catch (refreshError) {
            console.error('トークンリフレッシュエラー:', refreshError);
          }
        }
        
        if (attempt >= maxRetries) {
          throw error;
        }
      }
    }
  }

  async getWorkSession(sessionId: string): Promise<any> {
    const docSnap = await getDoc(doc(collection(this.db, 'workSessions'), sessionId));
    // Replace doc with docSnap for subsequent logic
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        startTime: data?.startTime?.toDate?.() || data?.startTime,
        endTime: data?.endTime?.toDate?.() || data?.endTime,
        breakPeriods: data?.breakPeriods?.map((bp: any) => ({
          startTime: bp.startTime?.toDate?.() || bp.startTime,
          endTime: bp.endTime?.toDate?.() || bp.endTime,
        })) || [],
      };
    }
    return null;
  }

  async getUserWorkSessions(userId: string, limitCount?: number): Promise<any[]> {
    let q = query(collection(this.db, 'workSessions'), where('userId', '==', userId), orderBy('startTime', 'desc'));
    // Replace query.limit with a new query if limit exists
    // Replace query.get with getDocs(q)

    if (limitCount) {
      // q = query(q, limit(limitCount)); // This is incorrect for react-native-firebase v9, limit is applied directly to the query
      q = query(collection(this.db, 'workSessions'), where('userId', '==', userId), orderBy('startTime', 'desc'), limit(limitCount)); // Reconstruct query with limit
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate?.() || doc.data().startTime,
      endTime: doc.data().endTime?.toDate?.() || doc.data().endTime,
      breakPeriods: doc.data().breakPeriods?.map((bp: any) => ({
        startTime: bp.startTime?.toDate?.() || bp.startTime,
        endTime: bp.endTime?.toDate?.() || bp.endTime,
      })) || [],
    }));
  }

  // 配達案件関連
  async createDeliveryCase(caseData: DeliveryCaseData): Promise<string> {
    const docRef = await addDoc(collection(this.db, 'deliveryCases'), caseData);
    return docRef.id;
  }

  async updateDeliveryCase(caseId: string, updates: Partial<DeliveryCaseData>): Promise<void> {
    await updateDoc(doc(collection(this.db, 'deliveryCases'), caseId), updates);
  }

  async deleteDeliveryCase(caseId: string): Promise<void> {
    await deleteDoc(doc(collection(this.db, 'deliveryCases'), caseId));
  }

  async getSessionDeliveryCases(workSessionId: string): Promise<any[]> {
    const q = query(collection(this.db, 'deliveryCases'), where('workSessionId', '==', workSessionId), orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
    }));
  }

  async getUserDeliveryCases(userId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    let q_cases = query(collection(this.db, 'deliveryCases'), where('userId', '==', userId));
    // Replace query.where and query.orderBy with new queries if conditions exist
    // Replace query.get with getDocs(q_cases)

    const conditions = [where('userId', '==', userId)];
    if (startDate && endDate) {
      conditions.push(where('timestamp', '>=', startDate));
      conditions.push(where('timestamp', '<', endDate));
    }
    conditions.push(orderBy('timestamp', 'desc'));
    q_cases = query(collection(this.db, 'deliveryCases'), ...conditions);

    const snapshot = await getDocs(q_cases);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
    }));
  }

  // 配達履歴を全削除するメソッド
  async deleteAllUserDeliveryCases(userId: string): Promise<void> {
    try {
      console.log('Deleting all delivery cases for user:', userId);
      
      // ユーザーの全配達案件を取得
      const q = query(collection(this.db, 'deliveryCases'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      console.log('Found', snapshot.size, 'delivery cases to delete');
      
      // バッチ削除（Firestoreのバッチ制限は500件）
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = snapshot.docs.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      for (const batch of batches) {
        const deletePromises = batch.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log('Deleted batch of', batch.length, 'documents');
      }
      
      console.log('All delivery cases deleted successfully');
    } catch (error) {
      console.error('Error deleting all delivery cases:', error);
      throw error;
    }
  }

  // 統計関連
  async calculateSessionStatistics(sessionId: string): Promise<void> {
    try {
      const session = await this.getWorkSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const startTime = session.startTime;
      const endTime = session.endTime || new Date();

      const duration = endTime.getTime() - startTime.getTime();
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

      const result = {
        duration: {
          total: duration,
          hours,
          minutes,
          formatted: `${hours}時間${minutes}分`
        },
        efficiency: this.calculateEfficiency(duration),
        earnings: this.calculateEarnings(duration)
      };
      
      // 統計データをセッションに保存
      await this.updateWorkSession(sessionId, {
        statistics: result
      });
    } catch (error: any) {
      throw error;
    }
  }

  private calculateEfficiency(duration: number): number {
    // 簡単な効率計算（実際のロジックに合わせて調整）
    const hours = duration / (1000 * 60 * 60);
    return Math.min(100, Math.max(0, hours * 10)); // 仮の計算
  }

  private calculateEarnings(duration: number): number {
    // 簡単な収益計算（実際のロジックに合わせて調整）
    const hours = duration / (1000 * 60 * 60);
    return hours * 1000; // 仮の時給1000円
  }

  // データベース初期化（開発用）
  async initializeUserData(userId: string): Promise<void> {
    try {
      // ユーザーが既に初期化されているかチェック
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        console.log('ユーザープロファイルが見つかりません');
        return;
      }

      console.log('ユーザーデータの初期化を開始します...');
      
      // サンプルデータは実際の使用時には作成しない
      console.log('ユーザーデータの初期化が完了しました');
    } catch (error) {
      console.error('ユーザーデータ初期化エラー:', error);
      throw error;
    }
  }

  // データ整合性チェック
  async validateUserData(userId: string): Promise<boolean> {
    try {
      // ユーザープロファイルの存在確認
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        console.warn('ユーザープロファイルが存在しません');
        return false;
      }

      // 勤務セッションの整合性チェック
      const sessions = await this.getUserWorkSessions(userId, 10);
      for (const session of sessions) {
        if (session.status === 'completed' && !session.endTime) {
          console.warn(`セッション ${session.id} の終了時刻が設定されていません`);
        }
      }

      return true;
    } catch (error) {
      console.error('データ整合性チェックエラー:', error);
      return false;
    }
  }

  // バックアップとリストア（将来の機能）
  async exportUserData(userId: string): Promise<any> {
    const userProfile = await this.getUserProfile(userId);
    const sessions = await this.getUserWorkSessions(userId);
    const cases = await this.getUserDeliveryCases(userId);

    return {
      userProfile,
      sessions,
      cases,
      exportDate: new Date(),
    };
  }

  // 現在の認証ユーザーを取得
  getCurrentUser(): any {
    return this.auth.currentUser;
  }

  // 認証状態をチェック
  checkAuthState(): boolean {
    const user = this.auth.currentUser;
    return !!user;
  }

  // 非同期認証状態確認
  async checkAuthStateAsync(): Promise<any> {
    return new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user: any) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  forceResetSession = async (): Promise<void> => {
    console.log('[URBANDASH_DEBUG] 🔄 強制セッションリセット開始');
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('[URBANDASH_DEBUG] ❌ ユーザーが認証されていません');
        return;
      }

      // 進行中のセッションを検索
      const workSessionsQuery = this.db
        .collection('workSessions')
        .where('userId', '==', user.uid)
        .where('status', '==', 'active');

      const querySnapshot = await workSessionsQuery.get();
      console.log('[URBANDASH_DEBUG] 🔍 進行中のセッション数:', querySnapshot.size);

      for (const doc of querySnapshot.docs) {
        const sessionData = doc.data();
        console.log('[URBANDASH_DEBUG] 🗂️ セッションデータ:', JSON.stringify(sessionData, null, 2));
        
        // セッションを強制終了
        await doc.ref.update({
          status: 'completed',
          endTime: new Date(),
          forceEnded: true,
          lastModified: new Date()
        });
        console.log('[URBANDASH_DEBUG] ✅ セッション強制終了完了:', doc.id);
      }
    } catch (error: any) {
      console.log('[URBANDASH_DEBUG] ❌ 強制リセットエラー:', error.message);
      throw error;
    }
  };
}

// シングルトンインスタンスをエクスポート
const firebaseService = FirebaseService.getInstance();
export default firebaseService;
