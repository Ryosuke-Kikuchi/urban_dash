import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ProgressBarProps {
  currentAmount: number;
  targetAmount: number;
  title?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentAmount, 
  targetAmount, 
  title = "Today's Progress" 
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  const progressPercentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
  const isGoalAchieved = currentAmount >= targetAmount && targetAmount > 0;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage, animatedWidth]);

  const formatCurrency = (amount: number) => {
    return `¥${Math.floor(amount).toLocaleString()}`;
  };

  const getProgressColor = () => {
    if (isGoalAchieved) return '#00C853'; // 達成時は緑
    if (progressPercentage >= 80) return '#FF9800'; // 80%以上はオレンジ
    return '#FF3B30'; // デフォルトは赤
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {isGoalAchieved && (
          <Icon name="check-circle" size={20} color="#00C853" />
        )}
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={styles.currentAmount}>{formatCurrency(currentAmount)}</Text>
        <Text style={styles.targetAmount}>/ {formatCurrency(targetAmount)}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>
        <Text style={styles.percentageText}>{Math.round(progressPercentage)}%</Text>
      </View>
      
      {targetAmount === 0 && (
        <Text style={styles.noTargetText}>目標金額を設定してください</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  targetAmount: {
    fontSize: 16,
    color: '#94A3B8',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#2C2C2C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
    minWidth: 40,
    textAlign: 'right',
  },
  noTargetText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default ProgressBar; 