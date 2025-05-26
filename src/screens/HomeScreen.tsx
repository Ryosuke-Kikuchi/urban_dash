import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, ScrollView, Platform, NativeModules } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // MaterialIconsから変更
import { useAuth } from '../context/AuthContext';
import { useWork } from '../context/WorkContext';
import { useOverlay } from '../contexts/OverlayContext';
import { TextInput } from 'react-native'; // TextInputをインポート

const HomeScreen = () => {
  const { user, signOut } = useAuth();
  const { 
    state: workState, // stateをworkStateにリネームして区別
    startWork, 
    endWork, 
    addDeliveryCase, // addDeliveryCaseを追加
    loadWeeklyData, // 今週データ読み込み機能を追加
    // startBreak, 
    // endBreak,
    // getCurrentWorkingTime,
    // getCurrentBreakTime,
    // getEstimatedHourlyRate,
    // getWaitingTime
  } = useWork();

  const { 
    isOverlayEnabled, 
    overlaySettings
  } = useOverlay();

  const [isOnline, setIsOnline] = useState(false); // オンライン状態を管理
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);
  const [currentWorkTime, setCurrentWorkTime] = useState('00:00:00');
  const [deliveryStartTime, setDeliveryStartTime] = useState<Date | null>(null);
  const [currentDeliveryTime, setCurrentDeliveryTime] = useState('00:00:00');
  const [rewardAmount, setRewardAmount] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState('');
  const [distance, setDistance] = useState('');
  
  // 目標金額（後で設定画面から取得予定）
  const dailyTarget = 10000; // 仮の目標金額
  const weeklyTarget = 70000; // 仮の週間目標金額
  
  // 今日の売上（workStateから取得）
  const todayEarnings = workState.totalEarnings;

  // 今週データをworkStateから取得
  const weeklyEarnings = workState.weeklyEarnings;
  const weeklyDeliveries = workState.weeklyDeliveries;
  const weeklyWorkingHours = (workState.weeklyWorkingTime / 3600).toFixed(1);
  const weeklyAverageHourlyRate = workState.weeklyAverageHourlyRate;
  
  // 平均単価を計算（今週の総収益 / 今週の配達件数）
  const averagePrice = weeklyDeliveries > 0 ? weeklyEarnings / weeklyDeliveries : 0;
  
  // 週間目標達成率を計算
  const weeklyGoalRate = weeklyTarget > 0 ? (weeklyEarnings / weeklyTarget) * 100 : 0;

  // 今週データを読み込む
  useEffect(() => {
    loadWeeklyData();
  }, []);

  // 案件が追加された時に今週データを再読み込み
  useEffect(() => {
    if (workState.totalCases > 0) {
      loadWeeklyData();
    }
  }, [workState.totalCases]);

  // 今週データの変更をログ出力
  useEffect(() => {
    console.log('[HOME_SCREEN] 今週データ更新:', {
      weeklyEarnings,
      weeklyDeliveries,
      weeklyWorkingHours,
      weeklyAverageHourlyRate,
      averagePrice,
      weeklyGoalRate
    });
  }, [weeklyEarnings, weeklyDeliveries, weeklyWorkingHours, weeklyAverageHourlyRate]);

  // 作業時間と配達時間のフォーマット関数
  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOnline && workStartTime) {
      timer = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - workStartTime.getTime()) / 1000);
        setCurrentWorkTime(formatTime(diff));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOnline, workStartTime]);

  useEffect(() => {
    let deliveryTimer: NodeJS.Timeout;
    if (deliveryStartTime) {
      deliveryTimer = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - deliveryStartTime.getTime()) / 1000);
        setCurrentDeliveryTime(formatTime(diff));
      }, 1000);
    } else {
      setCurrentDeliveryTime('00:00:00'); // リセット時は0に戻す
    }
    return () => clearInterval(deliveryTimer);
  }, [deliveryStartTime]);

  useEffect(() => {
    if (workState.error) {
      Alert.alert('エラー', workState.error);
    }
  }, [workState.error]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleToggleOnline = async () => {
    if (!isOnline) {
      try {
        await startWork(); // 勤務開始APIを呼び出す
        setWorkStartTime(new Date());
        setIsOnline(true);
      } catch (error) {
        Alert.alert('エラー', 'オンラインへの切り替えに失敗しました。');
      }
    } else {
      try {
        await endWork(); // 勤務終了APIを呼び出す
        setIsOnline(false);
        setWorkStartTime(null);
        setDeliveryStartTime(null);
        setRewardAmount('');
        setSelectedPlatform(null);
      } catch (error) {
        Alert.alert('エラー', 'オフラインへの切り替えに失敗しました。');
      }
    }
  };

  const handleStartDelivery = () => {
    setDeliveryStartTime(new Date());
  };

  const handleFinishDelivery = async () => {
    if (!selectedPlatform || !rewardAmount || !deliveryStartTime) {
      Alert.alert('入力エラー', 'プラットフォームと報酬額を入力してください。');
      return;
    }
    
    const deliveryEndTime = new Date();
    const deliveryDurationSeconds = Math.floor((deliveryEndTime.getTime() - deliveryStartTime.getTime()) / 1000);
    const deliveryDurationMinutes = Math.floor(deliveryDurationSeconds / 60);

    try {
      // 案件データとして保存（日本時間で保存）
      const now = new Date();
      const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      
      const caseData = {
        service: selectedPlatform,
        earnings: parseFloat(rewardAmount),
        tip: 0, // 現在の画面にはチップ入力がないので0
        duration: deliveryDurationMinutes,
        timestamp: jstTime, // 保存時は日本時間
        deliveryStartTime: deliveryStartTime,
        deliveryEndTime: deliveryEndTime,
        actualDurationSeconds: deliveryDurationSeconds,
        memo: `所要時間: ${Math.floor(deliveryDurationSeconds / 60)}分${deliveryDurationSeconds % 60}秒`
      };

      await addDeliveryCase?.(caseData);

      Alert.alert('記録完了', `${selectedPlatform}での配達を記録しました。\n所要時間: ${Math.floor(deliveryDurationSeconds / 60)}分${deliveryDurationSeconds % 60}秒`);
      
      // 効果音を再生
      await playMoneySound();
      
      // フォームをリセット（全ての入力項目を空にする）
      setDeliveryStartTime(null);
      setRewardAmount('');
      setSelectedPlatform(null);
      setEstimatedTime('');
      setDistance('');
    } catch (error) {
      console.error('案件保存エラー:', error);
      Alert.alert('エラー', '案件の保存に失敗しました。');
    }
  };

  // ネイティブのAndroid MediaPlayerを使用した音声再生
  const playMoneySound = async () => {
    try {
      console.log('音声再生を開始します...');
      
      if (Platform.OS === 'android') {
        // まず振動を確実に実行
        try {
          const { Vibration } = await import('react-native');
          Vibration.vibrate([0, 100, 50, 100]);
          console.log('振動フィードバックを実行しました');
        } catch (vibrationError) {
          console.log('振動エラー:', vibrationError);
        }

        // カスタムネイティブモジュールを使用して音声を再生
        const { SoundPlayer } = NativeModules;
        
        if (SoundPlayer) {
          try {
            const result = await SoundPlayer.playSound('money_sound');
            console.log('音声再生成功:', result);
          } catch (error) {
            console.log('音声再生エラー:', error);
          }
        } else {
          console.log('SoundPlayerモジュールが見つかりません');
        }
      } else {
        // iOSの場合の処理（今回は実装しない）
        console.log('iOS音声再生は未実装');
      }
    } catch (error) {
      console.log('音声再生でエラーが発生しました:', error);
    }
  };

  const platforms = ["Uber Eats", "出前館", "Wolt", "menu", "Rocket now"];

  if (isOnline) {
    // オンライン時の画面
    return (
      <ScrollView 
        style={styles.onlineContainer}
        contentContainerStyle={styles.onlineScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timeCard}>
          <Icon name="clock-outline" size={20} color="#2DD4BF" style={styles.timeIcon} />
          <Text style={styles.timeLabel}>Work Time</Text>
          <Text style={styles.timeValue}>{currentWorkTime}</Text>
        </View>

        <View style={styles.timeCard}>
          <Icon name="bike" size={20} color="#2DD4BF" style={styles.timeIcon} />
          <Text style={styles.timeLabel}>Delivery Time</Text>
          <Text style={styles.timeValue}>{currentDeliveryTime}</Text>
        </View>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardLabel}>Reward Amount</Text>
          <View style={styles.rewardInputContainer}>
            <Text style={styles.currencySymbol}>¥</Text>
            <TextInput
              style={styles.rewardInput}
              placeholder=""
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={rewardAmount}
              onChangeText={setRewardAmount}
            />
          </View>
        </View>

        {/* Estimated Time入力フィールド */}
        <View style={styles.estimatedTimeCard}>
          <Text style={styles.estimatedTimeLabel}>Estimated Time (minutes)</Text>
          <TextInput
            style={styles.estimatedTimeInput}
            placeholder=""
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={estimatedTime}
            onChangeText={setEstimatedTime}
          />
        </View>

        {/* Distance入力フィールド */}
        <View style={styles.distanceCard}>
          <Text style={styles.distanceLabel}>Distance (km)</Text>
          <TextInput
            style={styles.distanceInput}
            placeholder=""
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={distance}
            onChangeText={setDistance}
          />
        </View>

        <Text style={styles.platformSelectLabel}>Select Platform:</Text>
        <View style={styles.platformContainer}>
          {platforms.map((platform) => (
            <TouchableOpacity
              key={platform}
              style={[
                styles.platformButton,
                selectedPlatform === platform && styles.platformButtonSelected,
              ]}
              onPress={() => setSelectedPlatform(platform)}
            >
              <Text
                style={[
                  styles.platformButtonText,
                  selectedPlatform === platform && styles.platformButtonTextSelected,
                ]}
              >
                {platform}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {deliveryStartTime ? (
          <TouchableOpacity
            style={styles.endDeliveryButton}
            onPress={handleFinishDelivery}
          >
            <Text style={styles.endDeliveryButtonText}>End Delivery</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.startDeliveryButton}
            onPress={handleStartDelivery} 
          >
            <Text style={styles.deliveryButtonText}>Start Delivery</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.goOfflineButton} onPress={handleToggleOnline}>
          <Text style={styles.goOfflineButtonText}>OFFLINE</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* 今週の収益カード */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>This Week's Earnings</Text>
          <View style={styles.earningsContainer}>
            <Text style={styles.earningsAmount}>¥{Math.floor(weeklyEarnings).toLocaleString()}</Text>
            <Text style={styles.earningsCents}>.{String(Math.floor((weeklyEarnings % 1) * 100)).padStart(2, '0')}</Text>
            <View style={styles.percentageBadge}>
              <Icon name="arrow-up" size={16} color="#00C853" />
              <Text style={styles.percentageText}>+18%</Text>
            </View>
          </View>
          <View style={styles.subStatsContainer}>
            <View style={styles.subStatItem}>
              <Text style={styles.subStatLabel}>DELIVERIES</Text>
              <Text style={styles.subStatValue}>{weeklyDeliveries}</Text>
            </View>
            <View style={styles.subStatItem}>
              <Text style={styles.subStatLabel}>HOURS</Text>
              <Text style={styles.subStatValue}>{weeklyWorkingHours}</Text>
            </View>
          </View>
        </View>

        {/* 統計グリッド */}
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <View style={styles.glowDot} />
            <Text style={styles.gridItemLabel}>AVG PRICE</Text>
            <Text style={styles.gridItemValue}>¥{Math.floor(averagePrice)}</Text>
            <Text style={styles.gridItemSubText}>Per delivery</Text>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.glowDot} />
            <Text style={styles.gridItemLabel}>AVG HOURLY</Text>
            <Text style={styles.gridItemValue}>¥{Math.floor(weeklyAverageHourlyRate)}</Text>
            <Text style={styles.gridItemSubText}>Per hour</Text>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.glowDot} />
            <Text style={styles.gridItemLabel}>GOAL RATE</Text>
            <Text style={styles.gridItemValue}>{Math.round(weeklyGoalRate)}%</Text>
            <Text style={styles.gridItemSubText}>Weekly target</Text>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.glowDot} />
            <Text style={styles.gridItemLabel}>TODAY TARGET</Text>
            <Text style={styles.gridItemValue}>¥{dailyTarget.toLocaleString()}</Text>
            <Text style={styles.gridItemSubText}>Daily goal</Text>
          </View>
        </View>

        {/* Start Workingボタン */}
        <TouchableOpacity style={styles.startWorkingButton} onPress={handleToggleOnline}>
          <View style={styles.startButtonIndicator} />
          <Text style={styles.startWorkingButtonText}>Start Working</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  onlineContainer: {
    flex: 1,
    backgroundColor: '#0B1426',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    marginBottom: 30,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subGreetingText: {
    fontSize: 16,
    color: '#8892B0',
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00BFFF',
    marginRight: 6,
  },
  onlineStatusText: {
    fontSize: 14,
    color: '#00BFFF',
    fontWeight: '600',
  },
  mainCard: {
    backgroundColor: '#1E2A3A',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2DD4BF',
    shadowColor: '#2DD4BF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  mainCardTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  earningsAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsCents: {
    fontSize: 20,
    color: '#94A3B8',
    marginLeft: 2,
    marginBottom: 6,
  },
  percentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  percentageText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
    marginLeft: 4,
  },
  subStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subStatItem: {
    alignItems: 'flex-start',
  },
  subStatLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subStatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  gridItem: {
    backgroundColor: '#1E2A3A',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'flex-start',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2DD4BF',
    position: 'absolute',
    top: 16,
    right: 12,
    shadowColor: '#2DD4BF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
  },
  gridItemLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridItemValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gridItemSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  ratingStarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startWorkingButton: {
    backgroundColor: '#2DD4BF',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    shadowColor: '#2DD4BF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0B1426',
    marginRight: 8,
  },
  startWorkingButtonText: {
    fontSize: 16,
    color: '#0B1426',
    fontWeight: '600',
  },
  // オンライン時のスタイル
  timeCard: {
    backgroundColor: '#1E2A3A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  timeIcon: {
    marginRight: 15,
  },
  timeLabel: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
  },
  timeValue: {
    fontSize: 18,
    color: '#2DD4BF', 
    fontWeight: 'bold',
  },
  deliveryControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  deliveryButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 0,
  },
  deliveryButtonActive: {
    backgroundColor: '#2DD4BF',
  },
  deliveryButtonInactive: {
    backgroundColor: '#1A2332',
  },
  endDeliveryButton: {
    backgroundColor: '#1A2332', // カード背景色に近い暗い色
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10, // 角丸を維持
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '100%',
    borderWidth: 1, // 縁取り追加
    borderColor: '#DC2626', // 縁取りの色を赤系に
    shadowColor: '#DC2626', // グローの色を赤系に
    shadowOffset: {
      width: 0,
      height: 0, // 全方向に光る
    },
    shadowOpacity: 0.3, // 影の濃さ
    shadowRadius: 8, // 影の広がり
    elevation: 6, // Android用の影
  },
  deliveryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // End Delivery ボタンのテキストスタイル（赤系）
  endDeliveryButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rewardCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  rewardLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 6,
  },
  rewardInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1426',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#94A3B8',
    marginRight: 5,
  },
  rewardInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  platformSelectLabel: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 5,
  },
  platformContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  platformButton: {
    backgroundColor: '#1A2332',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 8,
    minWidth: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A2332',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  platformButtonSelected: {
    backgroundColor: '#2DD4BF',
    borderColor: '#2DD4BF',
  },
  platformButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  platformButtonTextSelected: {
    color: '#0B1426',
  },
  startDeliveryButton: {
    backgroundColor: '#1A2332', // カード背景色に近い暗い色
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10, // 元のボタンの角丸を維持
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '100%',
    borderWidth: 1, // 縁取り追加
    borderColor: '#2DD4BF', // 縁取りの色
    shadowColor: '#2DD4BF', // グローの色
    shadowOffset: {
      width: 0,
      height: 0, // 全方向に光る
    },
    shadowOpacity: 0.3, // 影の濃さ
    shadowRadius: 8, // 影の広がり
    elevation: 6, // Android用の影
  },
  goOfflineButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
    width: '100%',
    elevation: 0,
  },
  goOfflineButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  estimatedTimeCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  estimatedTimeLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 6,
  },
  estimatedTimeInput: {
    backgroundColor: '#0B1426',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  distanceCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  distanceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 6,
  },
  distanceInput: {
    backgroundColor: '#0B1426',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  onlineScrollContent: {
    paddingBottom: 80,
  },
});

export default HomeScreen;
