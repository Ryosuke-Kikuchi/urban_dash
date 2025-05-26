import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SignUpScreen from '../screens/SignUpScreen';
import LoginScreen from '../screens/LoginScreen';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import OverlaySettingsScreen from '../screens/OverlaySettingsScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { WorkProvider } from '../context/WorkContext';
import { OverlayProvider } from '../contexts/OverlayContext';

export type AuthStackParamList = {
  SignUp: undefined;
  Login: undefined;
  PasswordReset: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Statistics: undefined;
  AccountSettings: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  OverlaySettings: undefined;
};

export type RootStackParamList = AuthStackParamList & MainStackParamList;

const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createStackNavigator<MainStackParamList>();

// 認証が必要な画面のナビゲーター
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator initialRouteName="Login">
      <AuthStack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          title: 'ログイン',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#E0E0E0',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <AuthStack.Screen 
        name="SignUp" 
        component={SignUpScreen}
        options={{
          title: 'アカウント作成',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#E0E0E0',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <AuthStack.Screen 
        name="PasswordReset" 
        component={PasswordResetScreen}
        options={{
          title: 'パスワード再設定',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#E0E0E0',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </AuthStack.Navigator>
  );
};

// メイン画面のナビゲーター（タブナビゲーション）
const MainNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#2C2C2C',
        },
        tabBarActiveTintColor: '#FF3B30',
        tabBarInactiveTintColor: '#E0E0E0',
        headerStyle: {
          backgroundColor: '#121212',
        },
        headerTintColor: '#E0E0E0',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <MainTab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: '履歴',
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen 
        name="Statistics" 
        component={StatisticsScreen}
        options={{
          title: '統計',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen 
        name="AccountSettings" 
        component={AccountSettingsScreen}
        options={{
          title: 'アカウント設定',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </MainTab.Navigator>
  );
};

// メイン画面のスタックナビゲーター
const MainStackNavigator = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="MainTabs" 
        component={MainNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="OverlaySettings" 
        component={OverlaySettingsScreen}
        options={{
          title: 'オーバーレイ設定',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#E0E0E0',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </MainStack.Navigator>
  );
};

// 認証状態に基づいて画面を切り替えるコンポーネント
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return user ? (
    <WorkProvider>
      <OverlayProvider>
        <MainStackNavigator />
      </OverlayProvider>
    </WorkProvider>
  ) : (
    <AuthNavigator />
  );
};

const AppNavigator = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default AppNavigator;
