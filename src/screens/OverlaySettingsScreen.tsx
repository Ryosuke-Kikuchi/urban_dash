import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOverlay } from '../contexts/OverlayContext';
import { useWork } from '../context/WorkContext';
import Toast from 'react-native-toast-message';

const OverlaySettingsScreen: React.FC = () => {
  const {
    isOverlayEnabled,
    overlaySettings,
    enableOverlay,
    disableOverlay,
    updateOverlaySettings,
    checkPermission,
    requestPermission,
  } = useOverlay();

  const { state } = useWork();
  const [localSettings, setLocalSettings] = useState(overlaySettings);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    setLocalSettings(overlaySettings);
  }, [overlaySettings]);

  useEffect(() => {
    const checkPermissionStatus = async () => {
      const permission = await checkPermission();
      setHasPermission(permission);
    };
    
    checkPermissionStatus();
  }, [checkPermission]);

  const handleToggleOverlay = async (value: boolean) => {
    console.log('Toggle overlay requested:', value);
    
    if (value) {
      // オーバーレイを有効にする
      console.log('Enabling overlay, checking permission...');
      if (!hasPermission) {
        console.log('Permission not granted, requesting...');
        const granted = await requestPermission();
        if (!granted) {
          console.log('Permission denied');
          Toast.show({
            type: 'error',
            text1: 'オーバーレイ権限が必要です',
            text2: '設定から権限を許可してください',
          });
          return;
        }
        console.log('Permission granted');
        setHasPermission(true);
      }

      console.log('Calling enableOverlay...');
      const success = await enableOverlay();
      console.log('enableOverlay result:', success);
      
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'オーバーレイを有効にしました',
          text2: '他のアプリでも案件記録フォームが表示されます',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'オーバーレイの有効化に失敗しました',
        });
      }
    } else {
      // オーバーレイを無効にする
      console.log('Disabling overlay...');
      await disableOverlay();
      console.log('Overlay disabled');
      Toast.show({
        type: 'info',
        text1: 'オーバーレイを無効にしました',
      });
    }
  };

  const handleOpacityChange = async (value: number) => {
    const newSettings = { ...localSettings, opacity: value };
    setLocalSettings(newSettings);
    await updateOverlaySettings({ opacity: value });
  };

  const handleSizeChange = async (value: number) => {
    const newSettings = { ...localSettings, size: value };
    setLocalSettings(newSettings);
    await updateOverlaySettings({ size: value });
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      setHasPermission(true);
      Toast.show({
        type: 'success',
        text1: '権限が許可されました',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: '権限が拒否されました',
        text2: '設定から手動で許可してください',
      });
    }
  };

  const showOverlayInfo = () => {
    Alert.alert(
      'オーバーレイ機能について',
      'オーバーレイ機能を有効にすると、他のアプリを使用中でも画面上にフローティングボタンが表示され、素早く案件を記録できます。\n\n注意：この機能を使用するには「他のアプリの上に表示」権限が必要です。',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>オーバーレイ機能</Text>
            <TouchableOpacity onPress={showOverlayInfo} style={styles.infoButton}>
              <Text style={styles.infoButtonText}>?</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>オーバーレイを有効にする</Text>
              <Text style={styles.settingDescription}>
                他のアプリでも案件記録フォームを表示
              </Text>
            </View>
            <Switch
              value={isOverlayEnabled}
              onValueChange={handleToggleOverlay}
              trackColor={{ false: '#3C3C3C', true: '#FF3B30' }}
              thumbColor={isOverlayEnabled ? '#FFFFFF' : '#E0E0E0'}
            />
          </View>

          {!hasPermission && (
            <View style={styles.permissionWarning}>
              <Text style={styles.warningText}>
                ⚠️ オーバーレイ権限が許可されていません
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={handleRequestPermission}
              >
                <Text style={styles.permissionButtonText}>権限を要求</Text>
              </TouchableOpacity>
            </View>
          )}

          {state.status === 'idle' && isOverlayEnabled && (
            <View style={styles.workStatusWarning}>
              <Text style={styles.warningText}>
                💡 勤務中のみオーバーレイフォームが表示されます
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表示設定</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>透明度</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.customSlider}>
                <TouchableOpacity
                  style={[styles.sliderButton, localSettings.opacity <= 0.3 && styles.disabledButton]}
                  onPress={() => handleOpacityChange(Math.max(0.3, localSettings.opacity - 0.1))}
                  disabled={!isOverlayEnabled}
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      { width: `${((localSettings.opacity - 0.3) / 0.7) * 100}%` }
                    ]} 
                  />
                </View>
                <TouchableOpacity
                  style={[styles.sliderButton, localSettings.opacity >= 1.0 && styles.disabledButton]}
                  onPress={() => handleOpacityChange(Math.min(1.0, localSettings.opacity + 0.1))}
                  disabled={!isOverlayEnabled}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sliderValue}>
                {Math.round(localSettings.opacity * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>ボタンサイズ</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.customSlider}>
                <TouchableOpacity
                  style={[styles.sliderButton, localSettings.size <= 40 && styles.disabledButton]}
                  onPress={() => handleSizeChange(Math.max(40, localSettings.size - 5))}
                  disabled={!isOverlayEnabled}
                >
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderFill, 
                      { width: `${((localSettings.size - 40) / 40) * 100}%` }
                    ]} 
                  />
                </View>
                <TouchableOpacity
                  style={[styles.sliderButton, localSettings.size >= 80 && styles.disabledButton]}
                  onPress={() => handleSizeChange(Math.min(80, localSettings.size + 5))}
                  disabled={!isOverlayEnabled}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sliderValue}>
                {Math.round(localSettings.size)}px
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>使用方法</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1</Text>
            <Text style={styles.instructionText}>
              勤務を開始してからオーバーレイを有効にしてください
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2</Text>
            <Text style={styles.instructionText}>
              他のアプリを使用中でも画面上にフォームが表示されます
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3</Text>
            <Text style={styles.instructionText}>
              フォームに入力して案件を素早く記録できます
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>4</Text>
            <Text style={styles.instructionText}>
              フォームをドラッグして位置を調整できます
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0',
    flex: 1,
  },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3C3C3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#999',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  customSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#3C3C3C',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#3C3C3C',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 2,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  permissionWarning: {
    backgroundColor: '#2C1810',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  workStatusWarning: {
    backgroundColor: '#1A2C1A',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  warningText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 8,
  },
  permissionButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginRight: 12,
    marginTop: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#E0E0E0',
    flex: 1,
    lineHeight: 20,
  },
});

export default OverlaySettingsScreen; 