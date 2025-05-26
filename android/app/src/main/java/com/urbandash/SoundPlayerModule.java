package com.urbandash;

import android.content.Context;
import android.media.MediaPlayer;
import android.net.Uri;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class SoundPlayerModule extends ReactContextBaseJavaModule {
    private MediaPlayer mediaPlayer;
    private ReactApplicationContext reactContext;

    public SoundPlayerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SoundPlayer";
    }

    @ReactMethod
    public void playSound(String soundName, Promise promise) {
        try {
            // 既存のMediaPlayerがあれば停止・解放
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
            }

            // リソースIDを取得
            Context context = reactContext.getApplicationContext();
            int resourceId = context.getResources().getIdentifier(soundName, "raw", context.getPackageName());
            
            if (resourceId == 0) {
                promise.reject("SOUND_NOT_FOUND", "Sound file not found: " + soundName);
                return;
            }

            // MediaPlayerを作成して音声を再生
            mediaPlayer = MediaPlayer.create(context, resourceId);
            if (mediaPlayer != null) {
                mediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                    @Override
                    public void onCompletion(MediaPlayer mp) {
                        mp.release();
                        mediaPlayer = null;
                    }
                });
                
                mediaPlayer.start();
                promise.resolve("Sound played successfully");
            } else {
                promise.reject("MEDIA_PLAYER_ERROR", "Failed to create MediaPlayer");
            }
        } catch (Exception e) {
            promise.reject("SOUND_PLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopSound(Promise promise) {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.stop();
                mediaPlayer.release();
                mediaPlayer = null;
                promise.resolve("Sound stopped successfully");
            } else {
                promise.resolve("No sound playing");
            }
        } catch (Exception e) {
            promise.reject("SOUND_STOP_ERROR", e.getMessage());
        }
    }
} 