import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { DeliveryCaseData } from '../services/FirebaseService';
import firestore from '@react-native-firebase/firestore';

// 案件データの型定義
type DeliveryCase = DeliveryCaseData & { 
  id: string;
  deliveryStartTime?: Date;
  deliveryEndTime?: Date;
  actualDurationSeconds?: number;
};

interface CaseCardProps {
  deliveryCase: DeliveryCase;
}

const CaseCard: React.FC<CaseCardProps> = ({ deliveryCase }) => {
  const formatTime = (date: Date) => {
    // 日本時間（JST）に変換
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    // 日本時間（JST）に変換
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getUTCDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const formatCurrency = (amount: number) => {
    return Math.floor(amount).toLocaleString();
  };

  const getServiceColor = (service: string) => {
    const colors: { [key: string]: string } = {
      'Uber Eats': '#00D4AA',
      '出前館': '#FF6B35',
      'menu': '#4A90E2',
      'Wolt': '#00C2E8',
      'foodpanda': '#E91E63',
      'DiDi Food': '#FF5722',
      'Rocket now': '#9C27B0',
    };
    return colors[service] || '#FF3B30';
  };

  return (
    <View style={styles.caseCard}>
      {/* ヘッダー部分 */}
      <View style={styles.cardHeader}>
        <View style={styles.serviceInfo}>
          <View style={[styles.serviceBadge, { backgroundColor: getServiceColor(deliveryCase.service) }]}>
            <Text style={styles.serviceText}>{deliveryCase.service}</Text>
          </View>
          <View style={styles.dateTimeInfo}>
            <Text style={styles.dateText}>{formatDate(deliveryCase.timestamp)}</Text>
            <Text style={styles.timeText}>{formatTime(deliveryCase.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.earningsInfo}>
          <Text style={styles.earningsAmount}>¥{formatCurrency(deliveryCase.earnings)}</Text>
          {deliveryCase.tip > 0 && (
            <Text style={styles.tipAmount}>+¥{formatCurrency(deliveryCase.tip)}</Text>
          )}
        </View>
      </View>

      {/* 詳細情報 */}
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon name="schedule" size={16} color="#94A3B8" />
            <Text style={styles.infoLabel}>予定時間</Text>
            <Text style={styles.infoValue}>{deliveryCase.duration}分</Text>
          </View>
        </View>

        {(deliveryCase.deliveryStartTime && deliveryCase.deliveryEndTime) && (
          <View style={styles.deliveryTimeRow}>
            <Icon name="local-shipping" size={16} color="#94A3B8" />
            <Text style={styles.deliveryTimeLabel}>配達時間</Text>
            <Text style={styles.deliveryTimeValue}>
              {formatTime(deliveryCase.deliveryStartTime)} - {formatTime(deliveryCase.deliveryEndTime)}
            </Text>
          </View>
        )}

        {deliveryCase.memo && (
          <View style={styles.memoRow}>
            <Icon name="note" size={16} color="#94A3B8" />
            <Text style={styles.memoText}>{deliveryCase.memo.replace('配達時間:', '所要時間:')}</Text>
          </View>
        )}
      </View>

      {/* 効率指標 */}
      {deliveryCase.actualDurationSeconds && (
        <View style={styles.cardFooter}>
          <View style={styles.efficiencyInfo}>
            <Text style={styles.efficiencyLabel}>時給換算</Text>
            <Text style={styles.efficiencyValue}>
              ¥{Math.round((deliveryCase.earnings + deliveryCase.tip) / (deliveryCase.actualDurationSeconds / 3600)).toLocaleString()}
            </Text>
          </View>
          <View style={styles.efficiencyInfo}>
            <Text style={styles.efficiencyLabel}>効率</Text>
            <Text style={[
              styles.efficiencyValue,
              { color: deliveryCase.actualDurationSeconds <= deliveryCase.duration * 60 ? '#4CAF50' : '#FF9800' }
            ]}>
              {deliveryCase.actualDurationSeconds <= deliveryCase.duration * 60 ? '良好' : '遅延'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const HistoryScreen = () => {
  const { user } = useAuth();
  const [deliveryCases, setDeliveryCases] = useState<DeliveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const loadDeliveryCases = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[HISTORY_SCREEN] Loading delivery cases for period:', selectedPeriod);
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      const now = new Date();

      switch (selectedPeriod) {
        case 'today':
          // 今日の00:00:00から23:59:59まで
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'all':
          startDate = undefined;
          endDate = undefined;
          break;
      }

      console.log('[HISTORY_SCREEN] Date filter:', { startDate, endDate });

      let query = firestore()
        .collection('deliveryCases')
        .where('userId', '==', user.uid);

      if (startDate) {
        query = query.where('timestamp', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('timestamp', '<=', endDate);
      }

      const snapshot = await query
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      console.log('[HISTORY_SCREEN] Query result:', snapshot.size, 'documents found');

      const cases: DeliveryCase[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || data.timestamp;
        console.log('[HISTORY_SCREEN] Document data:', doc.id, {
          ...data,
          timestamp: timestamp,
          timestampString: timestamp instanceof Date ? timestamp.toLocaleString('ja-JP') : timestamp
        });
        return {
          id: doc.id,
          ...data,
          timestamp: timestamp,
          deliveryStartTime: data.deliveryStartTime?.toDate?.() || data.deliveryStartTime,
          deliveryEndTime: data.deliveryEndTime?.toDate?.() || data.deliveryEndTime,
        } as DeliveryCase;
      });

      console.log('[HISTORY_SCREEN] Processed cases:', cases.length);
      setDeliveryCases(cases);
    } catch (error) {
      console.error('[HISTORY_SCREEN] 案件履歴の取得に失敗しました:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    loadDeliveryCases();
  }, [loadDeliveryCases]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeliveryCases();
  };

  const renderCase = ({ item }: { item: DeliveryCase }) => (
    <CaseCard deliveryCase={item} />
  );

  const getTotalEarnings = () => {
    return deliveryCases.reduce((total, case_) => total + case_.earnings + case_.tip, 0);
  };

  const getTotalCases = () => {
    return deliveryCases.length;
  };

  const getAverageEarnings = () => {
    const total = getTotalEarnings();
    const count = getTotalCases();
    return count > 0 ? total / count : 0;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>履歴を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>配達履歴</Text>
        
        {/* 期間選択 */}
        <View style={styles.periodSelector}>
          {[
            { key: 'today', label: '今日' },
            { key: 'week', label: '1週間' },
            { key: 'month', label: '1ヶ月' },
            { key: 'all', label: '全期間' },
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.key as any)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* サマリー */}
        {deliveryCases.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>総案件数</Text>
              <Text style={styles.summaryValue}>{getTotalCases()}件</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>総報酬</Text>
              <Text style={styles.summaryValue}>¥{Math.floor(getTotalEarnings()).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>平均報酬</Text>
              <Text style={styles.summaryValue}>¥{Math.floor(getAverageEarnings()).toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>

      {/* 案件リスト */}
      {deliveryCases.length > 0 ? (
        <FlatList
          data={deliveryCases}
          keyExtractor={(item) => item.id}
          renderItem={renderCase}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF3B30"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="delivery-dining" size={64} color="#94A3B8" />
          <Text style={styles.emptyText}>まだ配達履歴がありません</Text>
          <Text style={styles.emptySubText}>配達を完了すると履歴が表示されます</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1426',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#1E2A3A',
  },
  periodButtonActive: {
    backgroundColor: '#2DD4BF',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#0B1426',
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E2A3A',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  caseCard: {
    backgroundColor: '#1E2A3A',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dateTimeInfo: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  earningsInfo: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tipAmount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deliveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryTimeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
    marginRight: 8,
  },
  deliveryTimeValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  memoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  memoText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
    flex: 1,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2A3441',
  },
  efficiencyInfo: {
    alignItems: 'center',
  },
  efficiencyLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  efficiencyValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default HistoryScreen;
