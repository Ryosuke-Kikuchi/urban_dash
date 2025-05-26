import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SimpleProgressBarProps {
  currentAmount: number;
  targetAmount: number;
}

const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({ 
  currentAmount, 
  targetAmount 
}) => {
  const progressPercentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

  const formatCurrency = (amount: number) => {
    return `¥${Math.floor(amount).toLocaleString()}`;
  };

  const getProgressColor = () => {
    if (progressPercentage >= 100) return '#00C853'; // 達成時は緑
    if (progressPercentage >= 80) return '#FF9800'; // 80%以上はオレンジ
    return '#FF3B30'; // デフォルトは赤
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Today's Progress</Text>
        <Text style={styles.amount}>
          {formatCurrency(currentAmount)} / {formatCurrency(targetAmount)}
        </Text>
      </View>
      
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercentage}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>
      
      <Text style={styles.percentage}>{Math.round(progressPercentage)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  amount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#2C2C2C',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentage: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
  },
});

export default SimpleProgressBar; 