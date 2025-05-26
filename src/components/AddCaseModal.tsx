import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useWork } from '../context/WorkContext';
import SimpleProgressBar from './SimpleProgressBar';

interface AddCaseModalProps {
  visible: boolean;
  onClose: () => void;
}

const deliveryServices = [
  'Uber Eats',
  ' 出前館',
  'menu',
  'Wolt',
  'foodpanda',
  'DiDi Food',
  'その他',
];

const AddCaseModal: React.FC<AddCaseModalProps> = ({ visible, onClose }) => {
  const { addDeliveryCase, state } = useWork();
  
  // 目標金額（後で設定画面から取得予定）
  const dailyTarget = 10000;
  
  const [selectedService, setSelectedService] = useState('');
  const [customService, setCustomService] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [earnings, setEarnings] = useState('');
  const [tip, setTip] = useState('');
  const [duration, setDuration] = useState('');
  const [timestamp, setTimestamp] = useState(() => {
    // デフォルトで日本時間の現在時刻を設定
    const now = new Date();
    return new Date(now.getTime() + (9 * 60 * 60 * 1000));
  });
  const [memo, setMemo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const resetForm = () => {
    setSelectedService('');
    setCustomService('');
    setEstimatedTime('');
    setEarnings('');
    setTip('');
    setDuration('');
    // 日本時間の現在時刻にリセット
    const now = new Date();
    setTimestamp(new Date(now.getTime() + (9 * 60 * 60 * 1000)));
    setMemo('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const service = selectedService === 'その他' ? customService : selectedService;
    
    if (!service.trim()) {
      Alert.alert('エラー', 'デリバリーサービスを選択してください');
      return false;
    }
    
    // 予想時間のバリデーション（1分以上、480分以下）
    if (!estimatedTime.trim() || isNaN(Number(estimatedTime)) || Number(estimatedTime) <= 0) {
      Alert.alert('エラー', '正しい予想時間を入力してください（1分以上）');
      return false;
    }
    
    if (Number(estimatedTime) > 480) {
      Alert.alert('エラー', '予想時間は480分（8時間）以下で入力してください');
      return false;
    }
    
    // 報酬のバリデーション（0円以上、100,000円以下）
    if (!earnings.trim() || isNaN(Number(earnings)) || Number(earnings) < 0) {
      Alert.alert('エラー', '正しい報酬金額を入力してください（0円以上）');
      return false;
    }
    
    if (Number(earnings) > 100000) {
      Alert.alert('エラー', '報酬金額は100,000円以下で入力してください');
      return false;
    }
    
    // チップのバリデーション（0円以上、50,000円以下）
    if (tip.trim() && (isNaN(Number(tip)) || Number(tip) < 0)) {
      Alert.alert('エラー', '正しいチップ金額を入力してください（0円以上）');
      return false;
    }
    
    if (tip.trim() && Number(tip) > 50000) {
      Alert.alert('エラー', 'チップ金額は50,000円以下で入力してください');
      return false;
    }
    
    // 所要時間のバリデーション（1分以上、480分以下）
    if (!duration.trim() || isNaN(Number(duration)) || Number(duration) <= 0) {
      Alert.alert('エラー', '正しい所要時間を入力してください（1分以上）');
      return false;
    }
    
    if (Number(duration) > 480) {
      Alert.alert('エラー', '所要時間は480分（8時間）以下で入力してください');
      return false;
    }
    
    // 日時のバリデーション（未来の日時でないこと）
    const now = new Date();
    if (timestamp > now) {
      Alert.alert('エラー', '未来の日時は選択できません');
      return false;
    }
    
    // 日時のバリデーション（1年以上前でないこと）
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (timestamp < oneYearAgo) {
      Alert.alert('エラー', '1年以上前の日時は選択できません');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const service = selectedService === 'その他' ? customService : selectedService;
      
      await addDeliveryCase({
        service: service.trim(),
        estimatedTime: Number(estimatedTime),
        earnings: Number(earnings),
        tip: Number(tip) || 0,
        duration: Number(duration),
        timestamp,
        memo: memo.trim() || undefined,
      });

      Alert.alert('成功', '案件を追加しました', [
        { text: 'OK', onPress: handleClose }
      ]);
    } catch (error) {
      Alert.alert('エラー', '案件の追加に失敗しました');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newTimestamp = new Date(timestamp);
      newTimestamp.setFullYear(selectedDate.getFullYear());
      newTimestamp.setMonth(selectedDate.getMonth());
      newTimestamp.setDate(selectedDate.getDate());
      setTimestamp(newTimestamp);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newTimestamp = new Date(timestamp);
      newTimestamp.setHours(selectedTime.getHours());
      newTimestamp.setMinutes(selectedTime.getMinutes());
      setTimestamp(newTimestamp);
    }
  };

  const formatDateTime = (date: Date) => {
    // 日本時間（JST）に変換
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9時間
    
    const year = jstDate.getUTCFullYear();
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getUTCDate()).padStart(2, '0');
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes} JST`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>案件を追加</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* プログレスバー */}
        <View style={styles.progressContainer}>
          <SimpleProgressBar 
            currentAmount={state.totalEarnings}
            targetAmount={dailyTarget}
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 予想時間 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>予想時間 (分)</Text>
            <TextInput
              placeholder="15"
              value={estimatedTime}
              onChangeText={setEstimatedTime}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#999"
            />
          </View>

          {/* デリバリーサービス選択 */}
          <Text style={styles.sectionTitle}>デリバリーサービス</Text>
          <View style={styles.serviceContainer}>
            {deliveryServices.map((service, index) => (
              <TouchableOpacity
                key={`service-${index}-${service}`}
                style={[
                  styles.serviceChip,
                  selectedService === service && styles.serviceChipSelected,
                ]}
                onPress={() => setSelectedService(service)}
              >
                <Text
                  style={[
                    styles.serviceChipText,
                    selectedService === service && styles.serviceChipTextSelected,
                  ]}
                >
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* カスタムサービス名入力（「その他」選択時） */}
          {selectedService === 'その他' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>サービス名</Text>
              <TextInput
                placeholder="サービス名を入力"
                value={customService}
                onChangeText={setCustomService}
                style={styles.input}
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* 報酬金額 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>報酬金額 (円)</Text>
            <TextInput
              placeholder="500"
              value={earnings}
              onChangeText={setEarnings}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#999"
            />
          </View>

          {/* チップ */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>チップ (円)</Text>
            <TextInput
              placeholder="0"
              value={tip}
              onChangeText={setTip}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#999"
            />
          </View>

          {/* 所要時間 */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>所要時間 (分)</Text>
            <TextInput
              placeholder="20"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="#999"
            />
          </View>

          {/* 日時選択 */}
          <Text style={styles.sectionTitle}>配達日時</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formatDateTime(timestamp)}</Text>
            </TouchableOpacity>
          </View>

          {/* メモ */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>メモ (任意)</Text>
            <TextInput
              placeholder="メモを入力"
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.memoInput]}
              placeholderTextColor="#999"
            />
          </View>

          {/* 送信ボタン */}
          <TouchableOpacity
            style={[styles.submitButton, state.isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={state.isLoading}
          >
            <Text style={styles.submitButtonText}>
              {state.isLoading ? '追加中...' : '案件を追加'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 日付ピッカー */}
        {showDatePicker && (
          <DateTimePicker
            value={timestamp}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* 時間ピッカー */}
        {showTimePicker && (
          <DateTimePicker
            value={timestamp}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
  },
  serviceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  serviceChip: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  serviceChipSelected: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  serviceChipText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
  },
  serviceChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    marginBottom: 12,
  },
  dateTimeButton: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  dateTimeText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
});

export default AddCaseModal;
