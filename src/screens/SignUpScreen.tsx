import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // バリデーション関数
  const validateInputs = () => {
    if (!nickname || !email || !password) {
      setError('すべての項目を入力してください');
      return false;
    }

    if (nickname.length < 2 || nickname.length > 20) {
      setError('ニックネームは2～20文字で入力してください');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('メールアドレスの形式が正しくありません');
      return false;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      // Firebase Authでユーザー作成
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Firestoreのusersコレクションにユーザー情報を保存
      await firestore().collection('users').doc(user.uid).set({
        email: email,
        nickname: nickname,
        profileImageUrl: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      
      // Firebase Authのプロフィールにニックネームを保存
      await user.updateProfile({
        displayName: nickname
      });
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に使用されています');
      } else if (error.code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません');
      } else if (error.code === 'auth/weak-password') {
        setError('パスワードは6文字以上である必要があります');
      } else {
        setError('アカウントの作成に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign up</Text>
      </View>

      <View style={styles.content}>
        {/* Name Input */}
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          placeholder="Oliver Cederborg"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
          style={styles.inputText}
          placeholderTextColor="#666"
        />

        {/* Email Input */}
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          placeholder="tim@apple.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.inputText}
          placeholderTextColor="#666"
        />

        {/* Password Input */}
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          placeholder="Pick a strong password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          style={styles.inputText}
          placeholderTextColor="#666"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Create Account Button */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputContainerFilled: {
    borderColor: '#8B5CF6',
    backgroundColor: '#2A2A2A',
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  primaryButtonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: '#666',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#999',
    fontSize: 16,
  },
  loginLink: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
});

export default SignUpScreen;
