/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import OverlayService from './src/services/OverlayService';

// App起動時にOverlayServiceを初期化（オーバーレイは非表示状態で開始）
const overlayService = OverlayService.getInstance();
// アプリがフォアグラウンドにいる間はオーバーレイを確実に非表示にする
overlayService.hideOverlay();

function App(): React.JSX.Element {
  return (
    <>
      <AppNavigator />
      <Toast />
    </>
  );
}

export default App;
