import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useGps } from '../context/GpsContext';

interface GpsStatusCardProps {
  isWorkingOnline: boolean;
}

const GpsStatusCard: React.FC<GpsStatusCardProps> = ({ isWorkingOnline }) => {
  const { trackingState, isLoading, startTracking, stopTracking } = useGps();

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };

  const formatSpeed = (kmh: number): string => {
    return `${Math.round(kmh)}km/h`;
  };

  const handleToggleTracking = async () => {
    if (trackingState.isTracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon 
          name="map-marker-radius" 
          size={20} 
          color={trackingState.isTracking ? '#4CAF50' : '#757575'} 
        />
        <Text style={styles.title}>GPS追跡</Text>
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: trackingState.isTracking ? '#4CAF50' : '#757575' }
        ]} />
      </View>

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>移動距離</Text>
            <Text style={styles.statValue}>
              {formatDistance(trackingState.totalDistance)}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>現在速度</Text>
            <Text style={styles.statValue}>
              {trackingState.currentSpeed ? formatSpeed(trackingState.currentSpeed) : '--'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.toggleButton,
            trackingState.isTracking ? styles.stopButton : styles.startButton,
            !isWorkingOnline && styles.disabledButton
          ]}
          onPress={handleToggleTracking}
          disabled={!isWorkingOnline || isLoading}
        >
          <Icon 
            name={trackingState.isTracking ? "stop" : "play"} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.buttonText}>
            {isLoading 
              ? '処理中...' 
              : trackingState.isTracking 
                ? '追跡停止' 
                : '追跡開始'
            }
          </Text>
        </TouchableOpacity>
      </View>

      {!isWorkingOnline && (
        <View style={styles.disabledOverlay}>
          <Text style={styles.disabledText}>
            GPS追跡は勤務中のみ利用できます
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#9E9E9E',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: '700',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#424242',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledText: {
    color: '#9E9E9E',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default GpsStatusCard; 