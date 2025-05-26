import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGps } from '../context/GpsContext';
import { DriveLog } from '../types/driveLog';

const DriveLogsScreen = () => {
  const { driveLogs, isLoading, loadDriveLogs } = useGps();
  const [selectedLog, setSelectedLog] = useState<DriveLog | null>(null);

  useEffect(() => {
    loadDriveLogs();
  }, [loadDriveLogs]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  };

  const formatSpeed = (kmh: number): string => {
    return `${Math.round(kmh)}km/h`;
  };

  const handleLogPress = (log: DriveLog) => {
    setSelectedLog(selectedLog?.id === log.id ? null : log);
  };

  const handleDeleteLog = async (_logId: string) => {
    Alert.alert(
      '走行ログ削除',
      'この走行ログを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              // DriveLogServiceの削除機能を呼び出し
              // await driveLogService.deleteDriveLog(logId);
              await loadDriveLogs(); // 再読み込み
            } catch (error) {
              Alert.alert('エラー', '走行ログの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const renderLogItem = ({ item }: { item: DriveLog }) => (
    <View style={styles.logItem}>
      <TouchableOpacity onPress={() => handleLogPress(item)}>
        <View style={styles.logHeader}>
          <View style={styles.logBasicInfo}>
            <Icon name="map-marker-path" size={20} color="#4CAF50" />
            <View style={styles.logMainInfo}>
              <Text style={styles.logDate}>{formatDate(item.startTime)}</Text>
              <Text style={styles.logDistance}>{formatDistance(item.totalDistanceMeters)}</Text>
            </View>
          </View>
          <View style={styles.logStats}>
            <Text style={styles.logDuration}>{formatDuration(item.durationSeconds)}</Text>
            <Icon 
              name={selectedLog?.id === item.id ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#9E9E9E" 
            />
          </View>
        </View>
      </TouchableOpacity>

      {selectedLog?.id === item.id && (
        <View style={styles.logDetails}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>平均速度</Text>
              <Text style={styles.detailValue}>
                {item.averageSpeedKmh ? formatSpeed(item.averageSpeedKmh) : '--'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>最高速度</Text>
              <Text style={styles.detailValue}>
                {item.maxSpeedKmh ? formatSpeed(item.maxSpeedKmh) : '--'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>記録点数</Text>
              <Text style={styles.detailValue}>{item.routePath.length}点</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>勤務セッション</Text>
              <Text style={styles.detailValue}>
                {item.workSessionId ? 'あり' : 'なし'}
              </Text>
            </View>
          </View>
          
          <View style={styles.timeDetails}>
            <Text style={styles.timeDetailLabel}>開始時刻</Text>
            <Text style={styles.timeDetailValue}>
              {item.startTime.toLocaleString('ja-JP')}
            </Text>
            <Text style={styles.timeDetailLabel}>終了時刻</Text>
            <Text style={styles.timeDetailValue}>
              {item.endTime.toLocaleString('ja-JP')}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => {
                // TODO: 地図表示機能を実装
                Alert.alert('準備中', '地図表示機能は開発中です');
              }}
            >
              <Icon name="map" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>地図で表示</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteLog(item.id)}
            >
              <Icon name="delete" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>走行ログを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="map-marker-path" size={24} color="#4CAF50" />
        <Text style={styles.headerTitle}>走行ログ</Text>
        <TouchableOpacity onPress={loadDriveLogs} style={styles.refreshButton}>
          <Icon name="refresh" size={20} color="#9E9E9E" />
        </TouchableOpacity>
      </View>

      {driveLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="map-marker-off" size={64} color="#424242" />
          <Text style={styles.emptyTitle}>走行ログがありません</Text>
          <Text style={styles.emptySubtitle}>
            GPS追跡を開始して走行ログを記録しましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={driveLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 60,
  },
  headerTitle: {
    color: '#E0E0E0',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1426',
  },
  loadingText: {
    color: '#9E9E9E',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#E0E0E0',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9E9E9E',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logMainInfo: {
    marginLeft: 12,
    flex: 1,
  },
  logDate: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  logDistance: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '700',
  },
  logStats: {
    alignItems: 'flex-end',
  },
  logDuration: {
    color: '#9E9E9E',
    fontSize: 14,
    marginBottom: 4,
  },
  logDetails: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    padding: 16,
    backgroundColor: '#1A1A1A',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#9E9E9E',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
  },
  timeDetails: {
    marginBottom: 16,
  },
  timeDetailLabel: {
    color: '#9E9E9E',
    fontSize: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  timeDetailValue: {
    color: '#E0E0E0',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DriveLogsScreen; 