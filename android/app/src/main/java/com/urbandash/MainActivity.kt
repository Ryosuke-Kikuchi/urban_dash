package com.urbandash

import android.os.Bundle
import android.content.Intent
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "UrbanDash"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
  }

  override fun onDestroy() {
    super.onDestroy()
    // アプリ終了時にオーバーレイサービスを停止
    try {
      val serviceIntent = Intent(this, OverlayModule.OverlayService::class.java)
      serviceIntent.action = "STOP_SERVICE"
      startService(serviceIntent)
      
      // 強制停止も実行
      val stopIntent = Intent(this, OverlayModule.OverlayService::class.java)
      stopService(stopIntent)
      
      Log.d("MainActivity", "Overlay service stop requested on app destroy")
    } catch (e: Exception) {
      Log.e("MainActivity", "Error stopping overlay service on destroy", e)
    }
  }
}
