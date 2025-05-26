# UrbanDash Overlay Debug TODO

- [x] OverlayServiceの初期化・AppStateリスナー登録が本当に行われているか再確認
- [x] AppStateリスナー登録・handleAppStateChangeの冒頭に強制ログを追加
- [x] ネイティブ側サービス（OverlayModule/OverlayService）のonStartCommand/onDestroyに詳細Log.dを追加
- [x] 上記修正後に自動で再ビルド・再起動
- [x] adb logcatで再度ログを取得し、AppStateやOverlayServiceのログが出ているか確認
- [ ] ログから問題点を自動で特定し、必要な修正を自動で適用
- [ ] 修正後は自動で再ビルド・再起動・再監視
- [ ] すべての要件（アプリ内でオーバレイ非表示、他アプリで表示・最小化UIが消えない・触れる）が満たされているか自動で検証 