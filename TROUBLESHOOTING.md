# React Native UrbanDash トラブルシューティングマニュアル

## 📋 目次
1. [ポート8081使用中エラー](#ポート8081使用中エラー)
2. [位置情報関連エラー](#位置情報関連エラー)
3. [**Firestoreインデックスエラー**](#firestoreインデックスエラー)
4. [ビルドエラー](#ビルドエラー)
5. [Metro関連エラー](#metro関連エラー)
6. [依存関係エラー](#依存関係エラー)

---

## 🚨 ポート8081使用中エラー

### エラーメッセージ
```
error listen EADDRINUSE: address already in use :::8081
```

### 原因
- 以前のMetroサーバーが正しく終了されていない
- 他のReact Nativeプロジェクトが8081ポートを使用中
- プロセスが残存している

### 解決手順（優先度順）

#### 1. **最優先**: プロセスの確認と終了
```powershell
# ポート8081を使用しているプロセスを確認
netstat -ano | findstr :8081

# プロセスIDを確認して終了
taskkill /PID <プロセスID> /F

# 例: PID 12345の場合
taskkill /PID 12345 /F
```

#### 2. **代替手段**: 別ポートで起動
```powershell
npx react-native start --port 8082
```

#### 3. **緊急時**: システム再起動
Windowsを再起動してすべてのプロセスをクリアする

### 予防策
- Metro開発サーバーを停止する時は必ず`Ctrl+C`で正しく終了する
- 複数のReact Nativeプロジェクトを同時に実行しない
- VSCodeのターミナルを閉じる前にサーバーを停止する

---

## 📍 位置情報関連エラー

### エラーメッセージ
```
Could not invoke RNFusedLocation.getCurrentPosition
Found interface com.google.android.gms.location.FusedLocationProviderClient
```

### 原因と解決策

#### 1. **Google Play Services依存関係の不足**
```gradle
// android/app/build.gradle に追加
implementation("com.google.android.gms:play-services-location:21.3.0")
implementation("com.google.android.gms:play-services-maps:18.2.0")
implementation("com.google.android.gms:play-services-base:18.4.0")
```

#### 2. **Android Manifest権限の設定**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<uses-feature android:name="android.hardware.location" android:required="true" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
<uses-feature android:name="android.hardware.location.network" android:required="false" />
```

#### 3. **パッケージバージョン確認**
```json
// package.json で確認
"react-native-geolocation-service": "^5.3.1"
```

---

## 🔥 **Firestoreインデックスエラー** 

### エラーメッセージ
```
[firestore/failed-precondition] The query requires an index. You can create it here: https://console.firebase.google.com/...
```

### 原因
- Firestoreでコンポジットクエリを実行する際に必要なインデックスが作成されていない
- `userId`、`startTime`、`__name__`の複合インデックスが不足

### 🚀 **完全解決手順**

#### **方法1: 自動インデックス作成（推奨）**
1. **エラーログのURLをクリック**
   ```
   https://console.firebase.google.com/v1/r/project/urban-dash-65508/firestore/indexes?create_composite=...
   ```

2. **Firebase Consoleで自動作成**
   - URLをブラウザで開く
   - 「作成」ボタンをクリック
   - インデックス作成完了まで数分待機

#### **方法2: 手動インデックス作成**
1. **Firebase Console → Firestore → インデックス**
2. **「コンポジットインデックス」タブ**
3. **「インデックスを作成」ボタン**
4. **設定値:**
   ```
   コレクション: driveLogs
   フィールド:
   - userId (昇順)
   - startTime (降順)  
   - __name__ (降順)
   ```

#### **方法3: ローカルエミュレーター使用（開発時推奨）**
```bash
# Firebase エミュレーターを使用
firebase emulators:start --only firestore
```

### 🛠️ **根本的な予防策**

#### **DriveLogService.tsのクエリ修正**
```typescript
// 現在の問題のあるクエリを修正
const querySnapshot = await firestore()
  .collection('driveLogs')
  .where('userId', '==', userId)
  .orderBy('startTime', 'desc')  // インデックスが必要
  .limit(50)
  .get();
```

**修正版（インデックス不要）:**
```typescript
// シンプルなクエリに変更
const querySnapshot = await firestore()
  .collection('driveLogs')
  .where('userId', '==', userId)
  .get();

// JavaScriptでソート
const sortedLogs = logs.sort((a, b) => 
  new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
).slice(0, 50);
```

### 📋 **チェックリスト**
- [ ] エラーURLからインデックス作成
- [ ] インデックス作成完了の確認（数分待機）
- [ ] アプリ再起動
- [ ] エラー解消確認

### ⚠️ **注意事項**
- インデックス作成には時間がかかる（通常2-5分）
- 本番環境では必要なインデックスを事前に作成する
- 開発時はFirebase エミュレーターの使用を推奨

---

## 🔨 ビルドエラー

### エラーパターンと解決手順

#### **99%でビルドが停止する**
```powershell
# 1. node_modules削除と再インストール
Remove-Item -Path node_modules -Recurse -Force
npm install

# 2. Androidクリーンビルド
cd android
./gradlew clean
cd ..

# 3. Metroキャッシュクリア
npx react-native start --reset-cache
```

#### **CMakeエラー**
```powershell
# CMakeキャッシュ削除
Remove-Item -Path android\.cxx -Recurse -Force
```

#### **New Architecture関連エラー**
```gradle
// android/gradle.properties
newArchEnabled=false
```

---

## 🚇 Metro関連エラー

### **Metroサーバー起動前チェックリスト**

1. **ポート確認**
   ```powershell
   netstat -ano | findstr :8081
   ```

2. **既存プロセス終了**
   ```powershell
   taskkill /F /IM node.exe
   ```

3. **キャッシュクリア**
   ```powershell
   npx react-native start --reset-cache
   ```

4. **正常起動確認**
   ```powershell
   # 新しいターミナルで
   npx react-native run-android
   ```

---

## 📦 依存関係エラー

### **パッケージ競合解決**

#### **react-native-maps関連**
```powershell
# 1. パッケージ削除
npm uninstall react-native-maps

# 2. キャッシュクリア
npm cache clean --force

# 3. 安定版インストール
npm install react-native-maps@1.10.0
```

#### **Google Play Services競合**
```gradle
// android/app/build.gradle でバージョン統一
implementation("com.google.android.gms:play-services-location:21.3.0")
implementation("com.google.android.gms:play-services-maps:18.2.0")
implementation("com.google.android.gms:play-services-base:18.4.0")
```

---

## 🔄 完全リセット手順

### **すべてがうまくいかない場合の最終手段**

```powershell
# 1. プロセス全終了
taskkill /F /IM node.exe
taskkill /F /IM java.exe

# 2. キャッシュ完全削除
Remove-Item -Path node_modules -Recurse -Force
Remove-Item -Path android\.gradle -Recurse -Force
Remove-Item -Path android\.cxx -Recurse -Force
npm cache clean --force

# 3. 再インストール
npm install

# 4. Androidクリーンビルド
cd android
./gradlew clean
cd ..

# 5. 起動
npx react-native start --reset-cache
# 新しいターミナルで
npx react-native run-android
```

---

## 📝 開発時のベストプラクティス

### **毎回開発開始時**
1. ポート8081の確認
2. 不要なプロセスの終了
3. 新しいターミナルでMetroサーバー起動
4. **Firestoreインデックスエラーの確認**

### **エラー発生時**
1. このマニュアルを確認
2. エラーメッセージをコピーして該当セクションを探す
3. 段階的に解決策を実行

### **開発終了時**
1. `Ctrl+C`でMetroサーバーを正しく終了
2. Androidエミュレーター終了
3. ターミナル終了

---

## 🆘 緊急時連絡先

- **プロジェクトの状況**: このマニュアルを更新する
- **新しいエラー**: エラーメッセージと解決策をこのファイルに追記

**最終更新**: 2024年12月（Firestoreインデックスエラー対応追加） 