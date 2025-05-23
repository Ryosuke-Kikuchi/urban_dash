/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import firebase from '@react-native-firebase/app';
import AppNavigator from './src/navigation/AppNavigator';

const firebaseConfig = {
  apiKey: "AIzaSyCe8eX8M0fjlES5oNgO5fEqYhbl28VtMDE",
  authDomain: "urban-dash-65508.firebaseapp.com",
  projectId: "urban-dash-65508",
  storageBucket: "urban-dash-65508.firebasestorage.app",
  messagingSenderId: "354069605491",
  appId: "1:354069605491:android:3ea56fe74351d6d1ecce06"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

function App(): React.JSX.Element {
  return <AppNavigator />;
}

export default App;
