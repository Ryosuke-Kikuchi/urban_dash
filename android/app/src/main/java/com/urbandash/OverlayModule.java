package com.urbandash;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.Toast;
import androidx.annotation.Nullable;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
import android.widget.TextView;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class OverlayModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "OverlayModule";
    private ReactApplicationContext reactContext;
    private static OverlayService overlayService;
    private static ReactApplicationContext staticReactContext;

    public OverlayModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        staticReactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean hasPermission = Settings.canDrawOverlays(reactContext);
                promise.resolve(hasPermission);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    promise.resolve(false); // ユーザーが設定画面で許可する必要がある
                } else {
                    promise.resolve(true);
                }
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.reject("PERMISSION_REQUEST_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void showOverlay(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                promise.reject("NO_PERMISSION", "Overlay permission not granted");
                return;
            }

            android.util.Log.d("OverlayModule", "showOverlay called");
            
            // 既にサービスが動作中の場合はスキップ
            if (OverlayService.isRunning()) {
                android.util.Log.d("OverlayModule", "Service already running, skipping");
                promise.resolve(true);
                return;
            }
            
            // 既存のサービスを完全に停止（複数回実行）
            android.util.Log.d("OverlayModule", "Force stopping all existing services");
            for (int i = 0; i < 3; i++) {
                Intent stopIntent = new Intent(reactContext, OverlayService.class);
                reactContext.stopService(stopIntent);
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            
            // 十分な待機時間を設けてから新しいサービスを開始
            new android.os.Handler().postDelayed(() -> {
                try {
                    // 再度チェック
                    if (OverlayService.isRunning()) {
                        android.util.Log.d("OverlayModule", "Service still running after cleanup, aborting");
                        return;
                    }
                    
                    android.util.Log.d("OverlayModule", "Starting new overlay service");
                    Intent serviceIntent = new Intent(reactContext, OverlayService.class);
                    serviceIntent.setAction("SHOW_OVERLAY");
                    reactContext.startService(serviceIntent);
                    android.util.Log.d("OverlayModule", "New overlay service started successfully");
                } catch (Exception e) {
                    android.util.Log.e("OverlayModule", "Error starting new overlay service", e);
                }
            }, 500); // 待機時間を500msに延長
            
            promise.resolve(true);
        } catch (Exception e) {
            android.util.Log.e("OverlayModule", "Error in showOverlay", e);
            promise.reject("SHOW_OVERLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void hideOverlay(Promise promise) {
        try {
            android.util.Log.d("OverlayModule", "hideOverlay called");
            
            // サービスが動作中でない場合はスキップ
            if (!OverlayService.isRunning()) {
                android.util.Log.d("OverlayModule", "No service running, skipping");
                promise.resolve(true);
                return;
            }
            
            // サービスに停止要求を送信
            android.util.Log.d("OverlayModule", "Sending stop service request");
            Intent serviceIntent = new Intent(reactContext, OverlayService.class);
            serviceIntent.setAction("STOP_SERVICE");
            reactContext.startService(serviceIntent);
            
            // 少し待ってから強制停止
            new android.os.Handler().postDelayed(() -> {
                try {
                    android.util.Log.d("OverlayModule", "Force stopping service");
                    Intent stopIntent = new Intent(reactContext, OverlayService.class);
                    reactContext.stopService(stopIntent);
                } catch (Exception e) {
                    android.util.Log.e("OverlayModule", "Error force stopping service", e);
                }
            }, 100);
            
            android.util.Log.d("OverlayModule", "Overlay service stop requested");
            promise.resolve(true);
        } catch (Exception e) {
            android.util.Log.e("OverlayModule", "Error in hideOverlay", e);
            promise.reject("HIDE_OVERLAY_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateOverlayPosition(double x, double y, Promise promise) {
        try {
            Intent intent = new Intent(reactContext, OverlayService.class);
            intent.setAction("UPDATE_POSITION");
            intent.putExtra("x", (int) x);
            intent.putExtra("y", (int) y);
            reactContext.startService(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("UPDATE_POSITION_ERROR", e.getMessage());
        }
    }

    public static void sendFormData(String deliveryService, String estimatedTime, String reward, String startTime, String finishTime, String memo, String distance, String durationMinutes) {
        if (staticReactContext != null) {
            try {
                WritableMap params = Arguments.createMap();
                params.putString("action", "form_submitted");
                params.putString("deliveryService", deliveryService);
                params.putString("estimatedTime", estimatedTime);
                params.putString("reward", reward);
                params.putString("startTime", startTime);
                params.putString("finishTime", finishTime);
                params.putString("memo", memo);
                params.putString("distance", distance);
                params.putString("durationMinutes", durationMinutes);
                
                android.util.Log.d("OverlayModule", "Sending form data: " + params.toString());
                
                staticReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("OverlayFormSubmitted", params);
            } catch (Exception e) {
                android.util.Log.e("OverlayModule", "Error sending form data", e);
            }
        } else {
            android.util.Log.e("OverlayModule", "React context is null, cannot send form data");
        }
    }

    // オーバーレイサービスクラス
    public static class OverlayService extends Service {
        private WindowManager windowManager;
        private View overlayView;
        private WindowManager.LayoutParams params;
        private static final String CHANNEL_ID = "OverlayServiceChannel";
        private static final int NOTIFICATION_ID = 1;
        private static OverlayService currentInstance = null;
        private static boolean isServiceRunning = false;

        @Override
        public void onCreate() {
            super.onCreate();
            
            android.util.Log.d("OverlayModule", "OverlayService onCreate called: " + this.hashCode());
            
            // 既存のインスタンスがある場合は先に削除
            if (currentInstance != null && currentInstance != this) {
                android.util.Log.d("OverlayModule", "Force cleanup existing instance: " + currentInstance.hashCode());
                try {
                    currentInstance.forceCleanup();
                    // 少し待ってから新しいインスタンスを設定
                    Thread.sleep(100);
                } catch (Exception e) {
                    android.util.Log.e("OverlayModule", "Error during cleanup", e);
                }
            }
            
            currentInstance = this;
            isServiceRunning = true;
            
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            createNotificationChannel();
            createOverlayView();
            
            android.util.Log.d("OverlayModule", "OverlayService created successfully: " + this.hashCode());
        }
        
        public static boolean isRunning() {
            return isServiceRunning && currentInstance != null;
        }
        
        private void forceCleanup() {
            try {
                android.util.Log.d("OverlayModule", "Force cleanup started for: " + this.hashCode());
                if (overlayView != null && overlayView.getParent() != null) {
                    windowManager.removeView(overlayView);
                    android.util.Log.d("OverlayModule", "Force cleanup overlay view removed");
                }
                stopForeground(true);
                stopSelf();
                android.util.Log.d("OverlayModule", "Force cleanup completed");
            } catch (Exception e) {
                android.util.Log.e("OverlayModule", "Error in force cleanup", e);
            }
        }

        private void createNotificationChannel() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Urban Dash オーバーレイサービス",
                    NotificationManager.IMPORTANCE_LOW
                );
                serviceChannel.setDescription("配達案件記録のためのオーバーレイフォームを表示します");
                
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(serviceChannel);
                }
            }
        }

        private void startForegroundService() {
            Intent notificationIntent = new Intent(this, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, 
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
            );

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Urban Dash")
                .setContentText("配達案件記録フォームが表示されています")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

            startForeground(NOTIFICATION_ID, notification);
        }

        @Override
        public int onStartCommand(Intent intent, int flags, int startId) {
            android.util.Log.d("OverlayModule", "onStartCommand called with action: " + (intent != null ? intent.getAction() : "null"));
            
            if (intent != null) {
                String action = intent.getAction();
                if ("SHOW_OVERLAY".equals(action)) {
                    startForegroundService();
                    if (overlayView == null) {
                        createOverlayView();
                    }
                    showOverlay();
                } else if ("HIDE_OVERLAY".equals(action)) {
                    hideOverlay();
                } else if ("UPDATE_POSITION".equals(action)) {
                    int x = intent.getIntExtra("x", 50);
                    int y = intent.getIntExtra("y", 200);
                    updatePosition(x, y);
                } else if ("STOP_SERVICE".equals(action)) {
                    // サービス停止要求
                    android.util.Log.d("OverlayModule", "Service stop requested");
                    hideOverlay();
                    stopSelf();
                    return START_NOT_STICKY; // 再起動しない
                }
            }
            
            // オーバーレイが表示されていない場合は自動終了
            if (overlayView == null || overlayView.getParent() == null) {
                android.util.Log.d("OverlayModule", "No overlay visible, stopping service");
                stopSelf();
                return START_NOT_STICKY; // 再起動しない
            }
            
            return START_NOT_STICKY; // START_STICKYから変更して自動再起動を防ぐ
        }

        private void createOverlayView() {
            overlayView = LayoutInflater.from(this).inflate(R.layout.overlay_form, null);
            
            // オーバーレイパラメータの設定
            int layoutFlag;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
            }

            params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.LEFT;
            params.x = 50;
            params.y = 200;

            // フォーム要素の取得
            Spinner serviceSpinner = overlayView.findViewById(R.id.service_spinner);
            EditText rewardInput = overlayView.findViewById(R.id.reward_input);
            EditText estimatedTimeInput = overlayView.findViewById(R.id.estimated_time_input);
            EditText distanceInput = overlayView.findViewById(R.id.distance_input);
            Button deliveryButton = overlayView.findViewById(R.id.delivery_button);
            TextView elapsedTimeDisplay = overlayView.findViewById(R.id.elapsed_time_display);

            // 配達時間計測用の変数
            final long[] startTime = {0};
            final long[] finishTime = {0};
            final boolean[] isDelivering = {false};
            final boolean[] isMinimized = {false};

            // 経過時間更新用のHandler
            final android.os.Handler handler = new android.os.Handler();
            final Runnable[] updateTimeRunnable = new Runnable[1];
            
            updateTimeRunnable[0] = new Runnable() {
                @Override
                public void run() {
                    if (isDelivering[0] && startTime[0] > 0) {
                        long currentTime = System.currentTimeMillis();
                        long elapsedMs = currentTime - startTime[0];
                        long elapsedMinutes = elapsedMs / (1000 * 60);
                        long elapsedSeconds = (elapsedMs / 1000) % 60;
                        
                        String timeText = String.format("経過時間: %02d:%02d", elapsedMinutes, elapsedSeconds);
                        elapsedTimeDisplay.setText(timeText);
                        
                        // 1秒後に再実行
                        handler.postDelayed(updateTimeRunnable[0], 1000);
                    }
                }
            };

            // 画面サイズを取得
            final int[] screenWidth = {0};
            final int[] screenHeight = {0};
            android.view.Display display = windowManager.getDefaultDisplay();
            android.graphics.Point size = new android.graphics.Point();
            display.getSize(size);
            screenWidth[0] = size.x;
            screenHeight[0] = size.y;

            // ミニマイズ表示用のビューを作成
            View minimizedView = new View(this);
            minimizedView.setLayoutParams(new android.view.ViewGroup.LayoutParams(60, 60));
            minimizedView.setBackgroundColor(0x80FF3B30); // 半透明の赤
            minimizedView.setVisibility(View.GONE);

            // オーバーレイの表示状態を更新
            final Runnable updateOverlayVisibility = new Runnable() {
                @Override
                public void run() {
                    try {
                        if (overlayView.getParent() != null) {
                            windowManager.removeView(overlayView);
                        }
                    } catch (Exception e) {
                        android.util.Log.e("OverlayModule", "Error updating overlay visibility", e);
                    }
                }
            };

            // 画面端への吸着機能
            final Runnable snapToEdge = new Runnable() {
                @Override
                public void run() {
                    if (overlayView == null || overlayView.getParent() == null) return;
                    
                    int overlayWidth = overlayView.getWidth();
                    if (overlayWidth == 0) {
                        // ビューがまだ測定されていない場合は少し待つ
                        handler.postDelayed(this, 100);
                        return;
                    }
                    
                    int centerX = params.x + overlayWidth / 2;
                    int targetX;
                    
                    if (centerX < screenWidth[0] / 2) {
                        // 左端に吸着（30pxだけ見える）
                        targetX = -overlayWidth + 30;
                    } else {
                        // 右端に吸着（30pxだけ見える）
                        targetX = screenWidth[0] - 30;
                    }
                    
                    android.util.Log.d("OverlayModule", "Snapping to edge: centerX=" + centerX + ", targetX=" + targetX + ", overlayWidth=" + overlayWidth);
                    
                    // アニメーション的に移動
                    android.animation.ValueAnimator animator = android.animation.ValueAnimator.ofInt(params.x, targetX);
                    animator.setDuration(300);
                    animator.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener() {
                        @Override
                        public void onAnimationUpdate(android.animation.ValueAnimator animation) {
                            params.x = (Integer) animation.getAnimatedValue();
                            if (overlayView != null && overlayView.getParent() != null) {
                                windowManager.updateViewLayout(overlayView, params);
                            }
                        }
                    });
                    animator.addListener(new android.animation.AnimatorListenerAdapter() {
                        @Override
                        public void onAnimationEnd(android.animation.Animator animation) {
                            isMinimized[0] = true;
                            android.util.Log.d("OverlayModule", "Minimized state set to true");
                        }
                    });
                    animator.start();
                }
            };

            // フル表示に戻す機能
            final Runnable expandToFull = new Runnable() {
                @Override
                public void run() {
                    if (overlayView == null || overlayView.getParent() == null) return;
                    
                    int overlayWidth = overlayView.getWidth();
                    if (overlayWidth == 0) {
                        // ビューがまだ測定されていない場合は少し待つ
                        handler.postDelayed(this, 100);
                        return;
                    }
                    
                    int targetX;
                    if (params.x < 0) {
                        // 左端から展開
                        targetX = 20;
                    } else {
                        // 右端から展開
                        targetX = screenWidth[0] - overlayWidth - 20;
                    }
                    
                    android.util.Log.d("OverlayModule", "Expanding to full: currentX=" + params.x + ", targetX=" + targetX);
                    
                    // アニメーション的に移動
                    android.animation.ValueAnimator animator = android.animation.ValueAnimator.ofInt(params.x, targetX);
                    animator.setDuration(300);
                    animator.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener() {
                        @Override
                        public void onAnimationUpdate(android.animation.ValueAnimator animation) {
                            params.x = (Integer) animation.getAnimatedValue();
                            if (overlayView != null && overlayView.getParent() != null) {
                                windowManager.updateViewLayout(overlayView, params);
                            }
                        }
                    });
                    animator.addListener(new android.animation.AnimatorListenerAdapter() {
                        @Override
                        public void onAnimationEnd(android.animation.Animator animation) {
                            isMinimized[0] = false;
                            android.util.Log.d("OverlayModule", "Minimized state set to false");
                        }
                    });
                    animator.start();
                }
            };

            // スピナーの設定
            String[] services = {"Uber Eats", "出前館", "Wolt", "menu", "その他"};
            ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, services);
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            serviceSpinner.setAdapter(adapter);

            // 入力フィールドのフォーカス設定
            rewardInput.setFocusableInTouchMode(true);
            estimatedTimeInput.setFocusableInTouchMode(true);
            distanceInput.setFocusableInTouchMode(true);

            // 配達ボタンのクリックリスナー（START/FINISH切り替え）
            deliveryButton.setOnClickListener(v -> {
                if (!isDelivering[0]) {
                    // START処理
                    startTime[0] = System.currentTimeMillis();
                    finishTime[0] = 0;
                    isDelivering[0] = true;
                    deliveryButton.setText("FINISH");
                    deliveryButton.setBackground(getDrawable(R.drawable.cancel_button_background));
                    elapsedTimeDisplay.setText("経過時間: 00:00");
                    
                    // 経過時間の更新を開始
                    handler.post(updateTimeRunnable[0]);
                    
                    Toast.makeText(this, "配達開始時間を記録しました", Toast.LENGTH_SHORT).show();
                } else {
                    // FINISH処理
                    if (startTime[0] > 0) {
                        finishTime[0] = System.currentTimeMillis();
                        isDelivering[0] = false;
                        
                        // 経過時間の更新を停止
                        handler.removeCallbacks(updateTimeRunnable[0]);
                        
                        long durationMs = finishTime[0] - startTime[0];
                        long durationMinutes = durationMs / (1000 * 60);
                        long durationSeconds = (durationMs / 1000) % 60;
                        
                        String finalTimeText = String.format("経過時間: %02d:%02d", durationMinutes, durationSeconds);
                        elapsedTimeDisplay.setText(finalTimeText);
                        
                        // 自動保存処理
                        String selectedService = serviceSpinner.getSelectedItem().toString();
                        String reward = rewardInput.getText().toString().trim();
                        String estimatedTimeStr = estimatedTimeInput.getText().toString().trim();
                        String distance = distanceInput.getText().toString().trim();

                        if (reward.isEmpty()) {
                            Toast.makeText(this, "報酬額を入力してから配達を完了してください", Toast.LENGTH_SHORT).show();
                            return;
                        }

                        // React Nativeにデータを送信（経過時間を所要時間として使用）
                        android.util.Log.d("OverlayModule", "Finish button clicked, auto-saving form data");
                        sendFormData(
                            selectedService, 
                            estimatedTimeStr.isEmpty() ? "0" : estimatedTimeStr,
                            reward, 
                            String.valueOf(startTime[0]),
                            String.valueOf(finishTime[0]),
                            "", // メモは削除されたので空文字
                            distance.isEmpty() ? "0" : distance,
                            String.valueOf(durationMinutes) // 経過時間（分）を所要時間として追加
                        );
                        
                        // フォームを自動リセット
                        rewardInput.setText("");
                        estimatedTimeInput.setText("");
                        distanceInput.setText("");
                        serviceSpinner.setSelection(0);
                        startTime[0] = 0;
                        finishTime[0] = 0;
                        deliveryButton.setText("START");
                        deliveryButton.setBackground(getDrawable(R.drawable.save_button_background));
                        elapsedTimeDisplay.setText("経過時間: 00:00");
                        
                        Toast.makeText(this, "配達完了！案件を自動保存しました", Toast.LENGTH_LONG).show();
                    }
                }
            });

            // ドラッグ機能（フォーム全体に適用）
            View dragHandle = overlayView; // フォーム全体をドラッグハンドルとして使用
            dragHandle.setOnTouchListener(new View.OnTouchListener() {
                private int initialX, initialY;
                private float initialTouchX, initialTouchY;
                private boolean isDragging = false;
                private static final int CLICK_DRAG_TOLERANCE = 10; // ピクセル
                private long touchStartTime = 0;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    // タッチ座標を取得
                    float x = event.getX();
                    float y = event.getY();
                    
                    // 入力フィールドやボタンの領域内かチェック
                    if (isTouchOnInputField(x, y)) {
                        return false; // 入力フィールドのタッチは通常処理に委ねる
                    }

                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            initialX = params.x;
                            initialY = params.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            isDragging = false;
                            touchStartTime = System.currentTimeMillis();
                            
                            // ミニマイズ状態の場合は展開
                            if (isMinimized[0]) {
                                expandToFull.run();
                                return true;
                            }
                            return true;
                        case MotionEvent.ACTION_MOVE:
                            float deltaX = event.getRawX() - initialTouchX;
                            float deltaY = event.getRawY() - initialTouchY;
                            
                            // ドラッグ判定
                            if (Math.abs(deltaX) > CLICK_DRAG_TOLERANCE || Math.abs(deltaY) > CLICK_DRAG_TOLERANCE) {
                                isDragging = true;
                                params.x = initialX + (int) deltaX;
                                params.y = initialY + (int) deltaY;
                                
                                // 画面境界内に制限
                                params.x = Math.max(-overlayView.getWidth() + 30, Math.min(screenWidth[0] - 30, params.x));
                                params.y = Math.max(0, Math.min(screenHeight[0] - overlayView.getHeight(), params.y));
                                
                                windowManager.updateViewLayout(overlayView, params);
                            }
                            return true;
                        case MotionEvent.ACTION_UP:
                            android.util.Log.d("OverlayModule", "ACTION_UP: isDragging=" + isDragging + ", isMinimized=" + isMinimized[0]);
                            
                            if (isDragging) {
                                // ドラッグ終了時に画面端に吸着
                                android.util.Log.d("OverlayModule", "Drag ended, snapping to edge");
                                handler.postDelayed(snapToEdge, 100);
                            } else {
                                // タップの場合
                                long touchDuration = System.currentTimeMillis() - touchStartTime;
                                android.util.Log.d("OverlayModule", "Tap detected, duration=" + touchDuration + "ms, isMinimized=" + isMinimized[0]);
                                
                                if (touchDuration < 200) { // 短いタップ
                                    if (isMinimized[0]) {
                                        android.util.Log.d("OverlayModule", "Expanding from minimized state");
                                        expandToFull.run();
                                    }
                                }
                            }
                            return isDragging; // ドラッグ中だった場合はtrueを返してクリックイベントを防ぐ
                    }
                    return false;
                }
                
                private boolean isTouchOnInputField(float x, float y) {
                    // 各入力フィールドの位置をチェック
                    View[] inputViews = {
                        rewardInput, estimatedTimeInput, distanceInput,
                        deliveryButton, serviceSpinner
                    };
                    
                    for (View view : inputViews) {
                        if (view != null && isTouchInsideView(view, x, y)) {
                            android.util.Log.d("OverlayModule", "Touch on input field: " + view.getClass().getSimpleName());
                            return true;
                        }
                    }
                    return false;
                }
                
                private boolean isTouchInsideView(View view, float x, float y) {
                    // ビューの画面上の位置を取得
                    int[] location = new int[2];
                    view.getLocationOnScreen(location);
                    int viewLeft = location[0];
                    int viewTop = location[1];
                    int viewRight = viewLeft + view.getWidth();
                    int viewBottom = viewTop + view.getHeight();

                    // タッチ座標を画面全体の絶対座標に変換 (onTouchイベントの座標はdragHandleからの相対座標)
                    int[] dragHandleLocation = new int[2];
                    overlayView.getLocationOnScreen(dragHandleLocation);
                    float screenX = dragHandleLocation[0] + x;
                    float screenY = dragHandleLocation[1] + y;
                    
                    android.util.Log.d("OverlayModule", "Touch check: screenX=" + screenX + ", screenY=" + screenY + 
                        ", view bounds (screen): left=" + viewLeft + ", top=" + viewTop + ", right=" + viewRight + ", bottom=" + viewBottom);
                    
                    return screenX >= viewLeft && screenX <= viewRight && screenY >= viewTop && screenY <= viewBottom;
                }
            });
        }

        private void showOverlay() {
            try {
                if (overlayView != null && overlayView.getParent() == null) {
                    windowManager.addView(overlayView, params);
                    android.util.Log.d("OverlayModule", "Overlay view added to window manager");
                } else {
                    android.util.Log.d("OverlayModule", "Overlay view already added or null");
                }
            } catch (Exception e) {
                android.util.Log.e("OverlayModule", "Error showing overlay", e);
            }
        }

        private void hideOverlay() {
            try {
                if (overlayView != null && overlayView.getParent() != null) {
                    windowManager.removeView(overlayView);
                    android.util.Log.d("OverlayModule", "Overlay view removed from window manager");
                }
                stopForeground(true);
                stopSelf();
            } catch (Exception e) {
                android.util.Log.e("OverlayModule", "Error hiding overlay", e);
            }
        }

        private void updatePosition(int x, int y) {
            params.x = x;
            params.y = y;
            if (overlayView.getParent() != null) {
                windowManager.updateViewLayout(overlayView, params);
            }
        }

        @Nullable
        @Override
        public IBinder onBind(Intent intent) {
            return null;
        }

        @Override
        public void onDestroy() {
            super.onDestroy();
            android.util.Log.d("OverlayModule", "OverlayService onDestroy called: " + this.hashCode());
            
            // オーバーレイビューを確実に削除
            try {
                if (overlayView != null && overlayView.getParent() != null) {
                    windowManager.removeView(overlayView);
                    android.util.Log.d("OverlayModule", "Overlay view removed in onDestroy");
                }
            } catch (Exception e) {
                android.util.Log.e("OverlayModule", "Error removing overlay view in onDestroy", e);
            }
            
            // フォアグラウンド通知を停止
            try {
                stopForeground(true);
            } catch (Exception e) {
                android.util.Log.e("OverlayModule", "Error stopping foreground in onDestroy", e);
            }
            
            // インスタンス管理
            if (currentInstance == this) {
                currentInstance = null;
                isServiceRunning = false;
                android.util.Log.d("OverlayModule", "Service instance cleared in onDestroy");
            }
            
            android.util.Log.d("OverlayModule", "OverlayService destroyed: " + this.hashCode());
        }
    }
} 