/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';

function App(): React.JSX.Element {
  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
}

export default App;
