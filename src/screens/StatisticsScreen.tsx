import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Text,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { WorkSessionData, DeliveryCaseData } from '../services/FirebaseService';
import firestore from '@react-native-firebase/firestore';
import LinearGradient from 'react-native-linear-gradient';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart,
  ContributionGraph,
} from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

// Modern color scheme inspired by the image
const COLORS = {
  background: '#0A0A0A',
  cardBackground: '#1A1A2E',
  cardGradientStart: '#16213E',
  cardGradientEnd: '#0F3460',
  primary: '#00D9FF',      // Cyan
  secondary: '#FF3B30',    // Red
  accent: '#30D158',       // Green
  warning: '#FF9500',      // Orange
  purple: '#AF52DE',       // Purple
  pink: '#FF2D92',         // Pink
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: 'rgba(255, 255, 255, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

// Chart configuration
const chartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: COLORS.cardGradientStart,
  backgroundGradientTo: COLORS.cardGradientEnd,
  backgroundGradientFromOpacity: 0,
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
  strokeWidth: 3,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: COLORS.primary,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: 'rgba(255, 255, 255, 0.1)',
    strokeWidth: 1,
  },
  propsForLabels: {
    fontSize: 12,
    fontWeight: '600',
    fill: COLORS.textSecondary,
  },
};

type Period = 'today' | 'week' | 'month' | 'all';
type WorkSession = WorkSessionData & { id: string };
type DeliveryCase = DeliveryCaseData & { id: string };

interface StatisticsData {
  totalEarnings: number;
  totalWorkTime: number;
  totalBreakTime: number;
  totalIdleTime: number;
  totalCases: number;
  averageHourlyRate: number;
  averageCaseEarnings: number;
  totalSessions: number;
}

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  gradientColors 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
  gradientColors: [string, string];
}) => (
  <LinearGradient
    colors={gradientColors}
    style={styles.statCard}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View style={styles.statCardHeader}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statCardTitle}>{title}</Text>
    </View>
    <Text style={[styles.statCardValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
  </LinearGradient>
);

// Chart Card Component
const ChartCard = ({ 
  title, 
  children, 
  height = 220 
}: {
  title: string;
  children: React.ReactNode;
  height?: number;
}) => (
  <LinearGradient
    colors={[COLORS.cardGradientStart, COLORS.cardGradientEnd]}
    style={[styles.chartCard, { height }]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <Text style={styles.chartTitle}>{title}</Text>
    {children}
  </LinearGradient>
);

// Period Selector Component
const PeriodSelector = ({ 
  selected, 
  onSelect 
}: {
  selected: Period;
  onSelect: (period: Period) => void;
}) => {
  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: '今日' },
    { key: 'week', label: '今週' },
    { key: 'month', label: '今月' },
    { key: 'all', label: '全期間' },
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.periodButton,
            selected === key && styles.periodButtonActive,
          ]}
          onPress={() => onSelect(key)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selected === key && styles.periodButtonTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const StatisticsScreen = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalEarnings: 0,
    totalWorkTime: 0,
    totalBreakTime: 0,
    totalIdleTime: 0,
    totalCases: 0,
    averageHourlyRate: 0,
    averageCaseEarnings: 0,
    totalSessions: 0,
  });
  const [sessionsData, setSessionsData] = useState<WorkSession[]>([]);
  const [casesData, setCasesData] = useState<DeliveryCase[]>([]);

  // Generate sample data for demonstration
  const generateSampleData = () => {
    return {
      totalEarnings: 45600,
      totalWorkTime: 28800, // 8 hours
      totalBreakTime: 3600,  // 1 hour
      totalIdleTime: 1800,   // 30 minutes
      totalCases: 24,
      averageHourlyRate: 1900,
      averageCaseEarnings: 1900,
      totalSessions: 5,
    };
  };

  const loadStatistics = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // For now, using sample data
      setStatistics(generateSampleData());
    } catch (error) {
      console.error('統計データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStatistics().finally(() => setRefreshing(false));
  };

  // Chart data
  const earningsData = {
    labels: ['月', '火', '水', '木', '金', '土', '日'],
    datasets: [{
      data: [8500, 12300, 15600, 9800, 18700, 22100, 16400],
      color: (opacity = 1) => `rgba(0, 217, 255, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  const casesData24h = {
    labels: ['00', '06', '12', '18', '24'],
    datasets: [{
      data: [2, 8, 15, 12, 3],
      color: (opacity = 1) => `rgba(48, 209, 88, ${opacity})`,
      strokeWidth: 3,
    }],
  };

  const workTimeBreakdown = [
    {
      name: '稼働時間',
      population: statistics.totalWorkTime,
      color: COLORS.primary,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: '休憩時間',
      population: statistics.totalBreakTime,
      color: COLORS.warning,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: '待機時間',
      population: statistics.totalIdleTime,
      color: COLORS.secondary,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
  ];

  const progressData = {
    labels: ['時給効率', 'ケース効率', '稼働率'],
    data: [0.85, 0.72, 0.91],
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={[COLORS.background, '#1A1A2E']}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>統計ダッシュボード</Text>
            <Text style={styles.headerSubtitle}>配達業務の詳細分析</Text>
          </View>

          {/* Period Selector */}
          <PeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />

          {/* Main Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              title="総収益"
              value={formatCurrency(statistics.totalEarnings)}
              subtitle="前日比 +12.3%"
              icon="attach-money"
              color={COLORS.primary}
              gradientColors={['rgba(0, 217, 255, 0.2)', 'rgba(0, 217, 255, 0.05)']}
            />
            <StatCard
              title="稼働時間"
              value={formatDuration(statistics.totalWorkTime)}
              subtitle="効率: 91%"
              icon="schedule"
              color={COLORS.accent}
              gradientColors={['rgba(48, 209, 88, 0.2)', 'rgba(48, 209, 88, 0.05)']}
            />
            <StatCard
              title="配達件数"
              value={`${statistics.totalCases}件`}
              subtitle="時間当たり 3.2件"
              icon="local-shipping"
              color={COLORS.warning}
              gradientColors={['rgba(255, 149, 0, 0.2)', 'rgba(255, 149, 0, 0.05)']}
            />
            <StatCard
              title="時給"
              value={formatCurrency(statistics.averageHourlyRate)}
              subtitle="目標達成率 85%"
              icon="trending-up"
              color={COLORS.secondary}
              gradientColors={['rgba(255, 59, 48, 0.2)', 'rgba(255, 59, 48, 0.05)']}
            />
          </View>

          {/* Charts Section */}
          <View style={styles.chartsSection}>
            {/* Earnings Trend */}
            <ChartCard title="収益トレンド（7日間）" height={280}>
              <LineChart
                data={earningsData}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withShadow={false}
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
              />
            </ChartCard>

            {/* Cases by Hour */}
            <ChartCard title="時間別配達件数" height={280}>
              <BarChart
                data={casesData24h}
                width={screenWidth - 60}
                height={220}
                yAxisLabel=""
                yAxisSuffix="件"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(48, 209, 88, ${opacity})`,
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                withCustomBarColorFromData={false}
              />
            </ChartCard>

            {/* Work Time Breakdown */}
            <ChartCard title="稼働時間内訳" height={280}>
              <PieChart
                data={workTimeBreakdown}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[10, 0]}
                style={styles.chart}
              />
            </ChartCard>

            {/* Performance Metrics */}
            <ChartCard title="パフォーマンス指標" height={280}>
              <ProgressChart
                data={progressData}
                width={screenWidth - 60}
                height={220}
                strokeWidth={16}
                radius={32}
                chartConfig={{
                  ...chartConfig,
                  color: (_opacity = 1, _index?: number) => {
                    const colors = [COLORS.primary, COLORS.accent, COLORS.warning];
                    return colors[_index || 0] || COLORS.primary;
                  },
                }}
                style={styles.chart}
                hideLegend={false}
              />
            </ChartCard>
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodButtonTextActive: {
    color: COLORS.background,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartsSection: {
    paddingBottom: 30,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  chart: {
    borderRadius: 16,
  },
});

export default StatisticsScreen;