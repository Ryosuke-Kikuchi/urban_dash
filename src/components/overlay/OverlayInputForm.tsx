import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

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

const OverlayInputForm: React.FC<OverlayInputFormProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [deliveryService, setDeliveryService] = useState('Uber Eats');
  const [reward, setReward] = useState('');
  const [tip, setTip] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const deliveryServices = [
    'Uber Eats',
    '出前館',
    'Wolt',
    'menu',
    'その他'
  ];

  const handleSave = async () => {
    if (!reward.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const data: DeliveryCaseInput = {
        deliveryService,
        reward: reward.trim(),
        tip: tip.trim() || '0',
        orderTime: new Date(),
      };

      await onSave(data);
      
      // フォームをリセット
      setReward('');
      setTip('0');
      onClose();
    } catch (error) {
      console.error('Error saving delivery case:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setReward('');
    setTip('0');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>案件記録</Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={deliveryService}
              onValueChange={setDeliveryService}
              style={styles.picker}
              dropdownIconColor="#FFFFFF"
            >
              {deliveryServices.map((service) => (
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
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, (!reward.trim() || isSaving) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!reward.trim() || isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1E2A3A',
    borderRadius: 12,
    padding: 16,
    width: 280,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#0B1426',
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  picker: {
    height: 40,
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#E0E0E0',
    width: 50,
  },
  input: {
    flex: 1,
    backgroundColor: '#0B1426',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3C3C3C',
    marginLeft: 8,
  },
  currency: {
    fontSize: 14,
    color: '#E0E0E0',
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: '#3C3C3C',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
});

export default OverlayInputForm; 