import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import OverlayContext from '../../contexts/OverlayContext'; // Import OverlayContext

export interface DeliveryCaseInput {
  deliveryService: string;
  customDeliveryServiceName?: string;
  reward: string;
  tip: string;
  estimatedDurationMinutes?: string;
  orderTime: Date;
  memo?: string;
}

interface OverlayInputFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: DeliveryCaseInput) => Promise<void>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OverlayInputForm: React.FC<OverlayInputFormProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const overlayContext = useContext(OverlayContext);
  const opacity = overlayContext?.overlaySettings.opacity ?? 0.7; // Default to 0.7 if context is not available
  const [deliveryService, setDeliveryService] = useState('Uber Eats');
  const [reward, setReward] = useState('');
  const [tip, setTip] = useState('0');
  const [isSaving, setIsSaving] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // ドラッグ用
  const pan = useRef(new Animated.ValueXY({ x: 50, y: 200 })).current;

  // アニメーション用
  const animatedWidth = useRef(new Animated.Value(320)).current;
  const animatedHeight = useRef(new Animated.Value(320)).current;
  const animatedOpacity = useRef(new Animated.Value(opacity)).current;

  // 画面端に食い込んだか判定
  const checkEdge = (x: number) => {
    // 画面左端200px以内で必ずminimized
    if (x < 200) return true;
    return false;
  };

  const animateMinimize = () => {
    Animated.parallel([
      Animated.timing(animatedWidth, { toValue: 40, duration: 200, useNativeDriver: false }),
      Animated.timing(animatedHeight, { toValue: 40, duration: 200, useNativeDriver: false }),
      Animated.timing(animatedOpacity, { toValue: 0.15, duration: 200, useNativeDriver: false }),
    ]).start();
  };
  const animateRestore = () => {
    Animated.parallel([
      Animated.timing(animatedWidth, { toValue: 320, duration: 200, useNativeDriver: false }),
      Animated.timing(animatedHeight, { toValue: 320, duration: 200, useNativeDriver: false }),
      Animated.timing(animatedOpacity, { toValue: opacity, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([
        null,
        { dx: pan.x, dy: pan.y },
      ], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        // 画面端に近ければ最小化
        const currentX = (pan.x as any).__getValue();
        const currentY = (pan.y as any).__getValue();
        const finalX = currentX + gesture.dx;
        const finalY = currentY + gesture.dy;
        if (checkEdge(finalX)) {
          setMinimized(true);
          console.log('minimized: true');
          animateMinimize();
          Animated.spring(pan, {
            toValue: { x: finalX < SCREEN_WIDTH / 2 ? -120 : SCREEN_WIDTH - 60, y: finalY },
            useNativeDriver: false,
          }).start();
        } else {
          setMinimized(false);
          console.log('minimized: false');
          animateRestore();
          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // 最小化状態でタップしたら元に戻す
  const handleRestore = () => {
    setMinimized(false);
    animateRestore();
    Animated.spring(pan, {
      toValue: { x: 50, y: 200 },
      useNativeDriver: false,
    }).start();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: minimized ? 0.01 : 1,
          width: minimized ? 40 : 320,
          height: minimized ? 40 : 320,
          borderRadius: minimized ? 20 : 16,
          backgroundColor: minimized ? 'rgba(0,0,0,0.01)' : 'rgba(11,20,38,0.7)',
          position: 'absolute',
          left: pan.x,
          top: pan.y,
          zIndex: 9999,
          overflow: 'hidden',
        },
      ]}
      {...panResponder.panHandlers}
    >
      {minimized ? (
        <TouchableOpacity style={styles.minimizedArea} onPress={handleRestore}>
          <Text style={{ color: '#fff', fontSize: 12 }}>MINIMIZED!</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>案件記録</Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={deliveryService}
              onValueChange={setDeliveryService}
              style={styles.picker}
              dropdownIconColor="#FFFFFF"
            >
              {['Uber Eats', '出前館', 'Wolt', 'menu', 'その他'].map((service) => (
                <Picker.Item
                  key={service}
                  label={service}
                  value={service}
                  color="#FFFFFF"
                />
              ))}
            </Picker>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>報酬</Text>
            <TextInput
              style={styles.input}
              value={reward}
              onChangeText={setReward}
              placeholder="500"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <Text style={styles.currency}>円</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>チップ</Text>
            <TextInput
              style={styles.input}
              value={tip}
              onChangeText={setTip}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <Text style={styles.currency}>円</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, (!reward.trim() || isSaving) && styles.disabledButton]}
              onPress={async () => {
                if (!reward.trim()) return;
                setIsSaving(true);
                try {
                  await onSave({
                    deliveryService,
                    reward: reward.trim(),
                    tip: tip.trim() || '0',
                    orderTime: new Date(),
                  });
                  setReward('');
                  setTip('0');
                  onClose();
                } catch (error) {
                  console.error('Error saving delivery case:', error);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={!reward.trim() || isSaving}
            >
              <Text style={styles.saveButtonText}>{isSaving ? '保存中...' : '保存'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(11, 20, 38, 0.7)',
    borderWidth: 1,
    borderColor: '#2DD4BF',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  minimizedArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 20,
  },
  container: {
    backgroundColor: '#1E2A3A',
    borderRadius: 16,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#2DD4BF',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // ホーム画面のテキスト色
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: '#0B1426', // ホーム画面の入力欄背景色
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2DD4BF', // 枠線色統一
  },
  picker: {
    height: 44,
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#94A3B8', // サブテキスト色
    width: 70,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#0B1426', // ホーム画面の入力欄背景色
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2DD4BF', // 枠線色統一
  },
  currency: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#2DD4BF', // ホーム画面のボタン色
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#0B1426', // ホーム画面のボタンテキスト色
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#1A2332', // ホーム画面の暗いボタン色
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#94A3B8', // サブテキスト色
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#1E2A3A', // 無効時はフォーム背景色
    opacity: 0.7,
  },
});

export default OverlayInputForm;