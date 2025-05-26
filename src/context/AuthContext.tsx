import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface User {
  uid: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        try {
          // Firestoreからユーザー情報を取得
          const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              nickname: userData?.nickname || firebaseUser.displayName || '',
              profileImageUrl: userData?.profileImageUrl,
            });
          } else {
            // Firestoreにユーザー情報がない場合は、Firebase Authの情報を使用
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              nickname: firebaseUser.displayName || '',
            });
          }
        } catch (error) {
          console.error('ユーザー情報の取得に失敗しました:', error);
          // エラーが発生した場合でも、Firebase Authの基本情報は設定
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            nickname: firebaseUser.displayName || '',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error('ログアウトに失敗しました:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
