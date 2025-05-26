GPS走行ログ機能 実装 ToDoリスト
Phase 1: 基盤準備とバックエンド設定 (Firebase)
Data Model Design & Firestore Setup:

[x] driveLogs コレクションの最終的なフィールドを確定する。
userId (string, 必須)
workSessionId (string, 任意)
deliveryCaseId (string, 任意)
startTime (timestamp, 必須)
endTime (timestamp, 必須)
totalDistanceMeters (number, 必須)
durationSeconds (number, 必須)
averageSpeedKmh (number, 任意)
maxSpeedKmh (number, 任意)
routePath (array of geopoints: {lat, lng, time, speed?} - 命名規則を統一)
createdAt (timestamp, 必須)
[x] Firestore のセキュリティルールを driveLogs コレクションに対して設定する (ユーザー自身のログのみ読み書き可能など)。
[ ] workSessions コレクションに走行ログ関連の集計フィールドを追加検討 (例: _totalDriveDistanceMeters, _totalDriveDurationSeconds)。
Project Setup & Dependencies:

[x] GPS関連ライブラリをプロジェクトに追加 (例: react-native-geolocation-service / expo-location for RN, geolocator / location for Flutter)。
[x] 地図表示ライブラリをプロジェクトに追加 (例: react-native-maps / flutter_map)。
[x] 必要な権限 (位置情報: ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, バックグラウンド実行: FOREGROUND_SERVICE for Android) を AndroidManifest.xml / Info.plist に追加。
Phase 2: コアGPSトラッキングロジック 🛰️
Foreground GPS Tracking:

[x] 位置情報取得のパーミッションリクエスト処理を実装。
[x] GPSトラッキングサービス/モジュールを作成 (位置情報の取得、更新)。
[x] 現在位置を定期的に取得し、画面に表示するテスト機能を作成。
[x] ログ記録開始/停止の基本的なロジックを実装 (手動トリガー)。
Background GPS Tracking (Android Foreground Service):

[ ] Foreground Service を実装 (通知チャンネル作成、常駐通知表示)。
[ ] アプリがバックグラウンドに移行してもGPSトラッキングが継続するように実装。
[ ] Foreground Service の開始/停止ライフサイクル管理を実装。
[ ] (iOS) バックグラウンド位置情報更新の設定と実装 (Capabilities設定、allowsBackgroundLocationUpdates)。
Data Calculation:

[x] 2点間の距離計算ロジックを実装 (例: Haversine formula)。
[x] 累積移動距離の計算ロジックを実装。
[x] 経過時間の計算ロジックを実装。
[x] 平均速度、最高速度の計算ロジックを実装。
Phase 3: データ保存と取得 (Firestore連携) 💾
Saving Drive Logs:

[x] GPSトラッキング中に収集した routePath (緯度経度配列) を一時的に保持するロジックを実装。
[x] ログ記録停止時に、計算されたサマリーデータ (totalDistanceMeters, durationSeconds など) と routePath を driveLogs コレクションに保存する処理を実装。
[ ] オフライン時の一時データ保存とオンライン復帰時の同期処理を検討・実装 (Firestoreのオフライン機能を利用)。
[x] データ保存時のエラーハンドリングを実装。
Retrieving Drive Logs:

[x] 特定の userId や workSessionId に紐づく driveLogs を取得するクエリを実装。
[x] 取得したログデータをリスト表示する準備。
Phase 4: UI/UX 実装 🗺️
Tracking Controls & Status Display:

[x] ホーム画面にトラッキング開始/停止ボタンを配置 (既存の勤務開始/終了と連動させるか検討)。
[x] トラッキング中に現在のステータス (記録中であること、現在の移動距離、時間など) を簡易表示するUIコンポーネントを作成。
[x] 位置情報パーミッションが拒否された場合の案内UIを実装。
Drive Log List & Detail View:

[x] 履歴画面または専用画面で、過去の走行ログ一覧を表示するUIを実装。
各ログには日付、距離、時間などを表示。
[ ] 走行ログ詳細画面を作成。
地図コンポーネントを使用して routePath をポリラインで描画。
開始/終了地点にマーカーを表示。
走行サマリー (距離、時間、平均速度など) を表示。
地図のズーム/パン操作を可能にする。
Phase 5: パフォーマンス最適化とテスト ⚙️🧪
Performance Optimization:

[ ] GPS取得頻度と精度の設定オプションを検討・実装 (例: バッテリー節約モード、バランスモード、高精度モード)。
[ ] routePath のデータ量を最適化する手法を調査・検討 (例: ポリラインエンコーディング、データの間引き)。まずは基本実装し、必要に応じて適用。
[ ] 地図表示時のパフォーマンスを検証 (大量ポイント描画時のカクつきなど)。
地図ライブラリの最適化オプションを利用。
表示範囲外のデータは描画しないなどの工夫。
[ ] バックグラウンド実行時のCPU使用率、メモリ使用量を監視・最適化。
Battery Consumption:

[ ] 様々なデバイスや条件下でバッテリー消費量をテスト。
[ ] バッテリー消費を抑えるための設定やロジック調整 (例: 長時間停止時にGPS更新頻度を大幅に下げる)。
Testing:

[ ] 単体テスト: 距離計算、時間計算などのロジック。
[ ] 結合テスト: GPSサービスとデータ保存処理の連携。
[ ] UIテスト: トラッキング開始/停止、地図表示などの操作。
[ ] 実地テスト: 実際に移動しながら様々なシナリオ (トンネル、ビル街、電波の悪い場所など) でテスト。
ログの精度、途切れにくさ、バッテリー消費を確認。
Phase 6: 既存機能との連携 🔗
[ ] 走行ログを workSessions と紐付け (UI上での関連付け、データモデルでの workSessionId 利用)。
[ ] 勤務開始/終了とGPSトラッキングの開始/終了を連動させるロジックを実装 (オプションとして)。
[ ] workSessions のサマリーに走行距離などを反映させる場合、その集計ロジックを実装 (Cloud Functionsでのバッチ処理も視野に入れる)。
[ ] 案件記録(deliveryCases)と走行ログを紐付ける場合、その関連付け方法を設計・実装。
Phase 7: ドキュメントと最終確認 📄✅
[ ] 実装した機能に関する内部向けドキュメントを作成 (データ構造、主要ロジックなど)。
[ ] ユーザー向けヘルプ/FAQにGPS機能に関する説明を追加 (パーミッション、バッテリー消費など)。
[ ] コードレビューを実施。
[ ] 全体的な動作確認、リグレッションテスト。