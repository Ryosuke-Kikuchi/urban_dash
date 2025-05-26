import React from 'react';
import { View, StyleSheet, Alert, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/AppNavigator';

type AccountSettingsNavigationProp = StackNavigationProp<MainStackParamList, 'OverlaySettings'>;

const AccountSettingsScreen = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<AccountSettingsNavigationProp>();

  const handleSignOut = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('ログアウトエラー:', error);
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleOverlaySettings = () => {
    navigation.navigate('OverlaySettings');
  };

  return (
    <ScrollView style={styles.container}>
      {/* プロフィール情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プロフィール</Text>
        
        <View style={styles.listItem}>
          <Icon name="person" size={20} color="#2DD4BF" style={styles.listItemIcon} />
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>ニックネーム</Text>
            <Text style={styles.listItemSubtitle}>
              {user?.nickname || '未設定'}
            </Text>
          </View>
        </View>

        <View style={styles.listItem}>
          <Icon name="email" size={20} color="#2DD4BF" style={styles.listItemIcon} />
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>メールアドレス</Text>
            <Text style={styles.listItemSubtitle}>
              {user?.email || '未設定'}
            </Text>
          </View>
        </View>
      </View>

      {/* 機能設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>機能設定</Text>
        
        <TouchableOpacity
          onPress={handleOverlaySettings}
          style={styles.listItem}
        >
          <Icon name="picture-in-picture" size={20} color="#FF3B30" style={styles.listItemIcon} />
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>オーバーレイ設定</Text>
            <Text style={styles.listItemSubtitle}>
              他のアプリでも案件記録ボタンを表示
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* アカウント操作 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>
        
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.logoutButton}
        >
          <Icon
            name="logout"
            size={20}
            color="#DC2626"
            style={styles.logoutButtonIcon}
          />
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      {/* アプリ情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ情報</Text>
        
        <View style={styles.listItem}>
          <Icon name="info" size={20} color="#2DD4BF" style={styles.listItemIcon} />
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle}>バージョン</Text>
            <Text style={styles.listItemSubtitle}>1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1426',
    padding: 20,
    paddingTop: 60,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  listItemIcon: {
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountSettingsScreen;
