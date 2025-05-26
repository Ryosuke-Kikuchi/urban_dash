import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type PasswordResetScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PasswordReset'>;

const PasswordResetScreen = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<PasswordResetScreenNavigationProp>();

  // バリデーション関数
  const validateEmail = () => {
    if (!email) {
      setError('メールアドレスを入力してください');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('メールアドレスの形式が正しくありません');
      return false;
    }

    return true;
  };

  const handlePasswordReset = async () => {
    if (!validateEmail()) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      await auth().sendPasswordResetEmail(email);
      setSuccess('パスワードリセットメールを送信しました。メールをご確認ください。');
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError('このメールアドレスは登録されていません');
      } else if (error.code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません');
      } else {
        setError('パスワードリセットメールの送信に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>パスワード再設定</Text>
      <Text style={styles.description}>
        登録されたメールアドレスにパスワードリセット用のリンクを送信します。
      </Text>
      
      <TextInput
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.inputText}
        placeholderTextColor="#888"
      />
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handlePasswordReset}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>リセットメールを送信</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.secondaryButtonText}>ログイン画面に戻る</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212', // ダークテーマ背景
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    color: '#E0E0E0',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  inputText: {
    color: '#E0E0E0',
    fontSize: 16,
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    borderBottomWidth: 0,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 15,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#FF3B30',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  successText: {
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PasswordResetScreen;
