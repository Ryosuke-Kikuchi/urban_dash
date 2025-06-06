# デリバリー業務支援アプリ「Urban Dash」詳細設計書

## 0. はじめに

本ドキュメントは、デリバリー配達員向け業務支援アプリ「Urban Dash」のMVP（Minimum Viable Product）開発に関する詳細な設計仕様を定義するものです。既存の `project.md` をベースとし、各項目をより具体的に記述しています。本ドキュメントは、開発者が具体的な実装作業に着手するための詳細情報を提供することを目的とします。

本設計書は、依頼者との対話および既存の設計案に基づいて作成されています。実際の開発においては、ユーザビリティテストの結果や技術的な実現可能性に基づき、適宜仕様の調整や詳細化が必要となる場合があります。開発者は、本設計書を基に、依頼者と密接にコミュニケーションを取りながらプロジェクトを推進してください。

## 1. プロジェクト概要

### 1.1. アプリ名
Urban Dash (アーバン ダッシュ)

### 1.2. 目的と提供価値
デリバリー配達員の日々の業務効率化、収入管理の容易化、データに基づいた稼働支援、記録を通じたモチベーション維持・向上を目指します。配達員がよりスマートに、より収益性の高い働き方を実現できるようサポートします。

### 1.3. ターゲットユーザー
フードデリバリーサービス（例: Uber Eats, 出前館など）や、その他のデリバリー業務に従事する全ての配達員。

### 1.4. 収益化モデル（将来構想）
月額980円（税込）のサブスクリプションモデルを想定しています。App StoreおよびGoogle Play経由での課金を計画しています。MVP（Minimum Viable Product）段階では課金機能は実装せず、無料での提供となります。

## 2. MVP (Minimum Viable Product) 詳細仕様

### 2.1. 対象プラットフォーム
Android OS (初期リリース)
将来的にはiOSへの展開も視野に入れますが、MVPではAndroidに注力します。

### 2.2. バックエンド技術
Firebase を全面的に採用します。
- **Authentication**: ユーザー認証（メールアドレス/パスワード、Google認証など将来的に拡張）
- **Firestore**: メインデータベースとして、ユーザー情報、勤務セッション、配達案件などを格納
- **Cloud Functions (将来的に検討)**: 定期的な集計処理や通知機能など、サーバーサイドロジックの実装
- **Cloud Storage (将来的に検討)**: プロフィール画像などのファイルストレージ

### 2.3. データモデル詳細 (Firestore)

#### 2.3.1. `users` コレクション
各ユーザーの基本情報を格納します。

- **ドキュメントID**: Firebase User UID (string)
- **フィールド**:
    - `email` (string, 必須): ログインに使用するメールアドレス。一意性を担保。
    - `nickname` (string, 必須): アプリ内で表示されるニックネーム。2文字以上20文字以内。
    - `profileImageUrl` (string, 任意): プロフィール画像のURL。MVPでは設定機能は提供せず、デフォルトアイコンまたは未設定状態。
    - `createdAt` (timestamp, 必須, serverTimestamp): アカウント作成日時。
    - `updatedAt` (timestamp, 必須, serverTimestamp): アカウント情報最終更新日時。
    - `lastLoginAt` (timestamp, 任意): 最終ログイン日時。

#### 2.3.2. `workSessions` コレクション
ユーザーの1回の勤務（オンラインからオフラインまで）に関する情報を格納します。

- **ドキュメントID**: 自動生成ID (string)
- **フィールド**:
    - `userId` (string, 必須): `users`コレクションのドキュメントID。データ整合性のために必須。インデックス設定推奨。
    - `date` (string, 必須): 勤務開始日 (フォーマット: `YYYY-MM-DD`)。検索や集計の容易性のために冗長化。
    - `startTime` (timestamp, 必須): 勤務開始日時。
    - `endTime` (timestamp, 任意): 勤務終了日時。勤務中は `null`。
    - `status` (string, 必須): 勤務状態。以下のいずれか。
        - `"working"`: 勤務中
        - `"on_break"`: 休憩中
        - `"finished"`: 勤務終了
    - `totalBreakTimeSeconds` (number, 必須, default: 0): その勤務セッションにおける総休憩時間（秒単位）。
    - `memo` (string, 任意, maxLength: 500): 勤務セッションに関する自由記述メモ。
    - `createdAt` (timestamp, 必須, serverTimestamp): ドキュメント作成日時。
    - `updatedAt` (timestamp, 必須, serverTimestamp): ドキュメント最終更新日時。
    - `_totalReward` (number, default: 0): (集計用フィールド) この勤務セッションでの総報酬額（チップ含む）。`deliveryCases`から集計。
    - `_totalCases` (number, default: 0): (集計用フィールド) この勤務セッションでの総案件数。`deliveryCases`から集計。
    - `_totalWorkingDurationSeconds` (number, default: 0): (集計用フィールド) この勤務セッションでの実働時間（秒単位）。 `(endTime - startTime) - totalBreakTimeSeconds` で計算。
    - `_totalJizoTimeSeconds` (number, default: 0): (集計用フィールド) この勤務セッションでの総地蔵時間（秒単位）。

#### 2.3.3. `deliveryCases` コレクション
個々の配達案件に関する情報を格納します。

- **ドキュメントID**: 自動生成ID (string)
- **フィールド**:
    - `workSessionId` (string, 必須): 紐づく `workSessions`コレクションのドキュメントID。インデックス設定推奨。
    - `userId` (string, 必須): `users`コレクションのドキュメントID。データ所有者の明確化とセキュリティルールのため。インデックス設定推奨。
    - `deliveryService` (string, 必須): 利用したデリバリーサービス名。選択肢（例: "Uber Eats", "出前館", "Wolt", "menu", "その他"）。
    - `customDeliveryServiceName` (string, 任意): `deliveryService`が「その他」の場合にユーザーが入力する具体的なサービス名。
    - `reward` (number, 必須): 配達報酬額（円）。0以上の整数。バリデーション必須。
    - `tip` (number, 必須, default: 0): チップ額（円）。0以上の整数。バリデーション必須。
    - `durationMinutes` (number, 任意): 案件所要時間（分単位）。ユーザー入力。
    - `orderTime` (timestamp, 必須): 案件受注時刻または完了時刻（ユーザーがどちらを入力するか明確にする必要あり。推奨は完了時刻）。
    - `distanceKm` (number, 任意): 配達距離（km単位）。ユーザー入力。
    - `memo` (string, 任意, maxLength: 300): 案件に関する自由記述メモ。
    - `createdAt` (timestamp, 必須, serverTimestamp): ドキュメント作成日時。

### 2.4. 機能仕様詳細

#### 2.4.1. アカウント機能
- **ユーザー登録**:
    - 入力項目: メールアドレス、パスワード（確認入力含む）、ニックネーム。
    - 処理: Firebase Authentication を利用してユーザーを作成。成功後、`users`コレクションに対応するドキュメントを作成・保存。
    - バリデーション: メールアドレス形式、パスワード強度（例: 8文字以上、英数字混在など）、ニックネーム文字数制限。
- **ログイン**:
    - 入力項目: メールアドレス、パスワード。
    - 処理: Firebase Authentication で認証。成功後、アプリ内セッションを開始。
    - 「パスワードを記憶する」オプション（セキュアストレージ利用）。
- **パスワードリセット**:
    - 入力項目: 登録済みメールアドレス。
    - 処理: Firebase Authentication の機能を利用し、パスワードリセット用のメールを送信。
- **ログアウト**:
    - 処理: Firebase Authentication のセッションを破棄し、ローカルに保存されたユーザー情報をクリア。
- **アカウント情報編集 (MVPではニックネームのみ検討)**:
    - ニックネーム変更機能。
    - メールアドレス変更、パスワード変更はFirebaseの標準機能を利用しつつ、アプリUIを提供。

#### 2.4.2. 勤務ステータス管理と時間記録機能
- **アクションボタン**: ホーム画面に現在の状態に応じたアクションボタンを表示。
    - 未勤務時: 「勤務開始」
    - 勤務中時: 「休憩開始」「勤務終了」
    - 休憩中時: 「休憩終了」「勤務終了」
- **状態遷移とデータ更新**:
    - 「勤務開始」: 新しい `workSessions` ドキュメントを作成。`status` を `"working"`、`startTime` を現在時刻に設定。
    - 「休憩開始」: 現在の `workSessions` ドキュメントの `status` を `"on_break"` に更新。休憩開始時刻を一時的に記録（`totalBreakTimeSeconds` 計算用）。
    - 「休憩終了」: `status` を `"working"` に更新。休憩時間を計算し、`totalBreakTimeSeconds` に加算。
    - 「勤務終了」: `status` を `"finished"` に更新。`endTime` を現在時刻に設定。最終的な集計データ（`_totalReward`, `_totalCases`, `_totalWorkingDurationSeconds`, `_totalJizoTimeSeconds`）を計算し保存。
- **リアルタイム表示**: ホーム画面で現在の勤務状態（未勤務、勤務中、休憩中）と、それぞれの状態に応じた経過時間（総勤務時間、現在の休憩時間など）をリアルタイムに表示。
- **バックグラウンド対応**: アプリがバックグラウンドに移行しても、タイマーが継続するように考慮（Foreground Serviceの利用など）。ただし、MVPではフォアグラウンド動作を主とする。

#### 2.4.3. 案件記録機能
- **入力インターフェース**: 勤務中にフローティングアクションボタン（FAB）などからモーダルダイアログまたは専用画面で入力。
- **入力項目**:
    - 必須: デリバリーサービス（選択式＋「その他」の場合の自由入力）、報酬額、案件時刻（DateTimePickerで日時選択）。
    - 任意: チップ額、所要時間（分）、配達距離（km）、メモ。
- **データ保存**: 入力された情報を `deliveryCases` コレクションに新しいドキュメントとして保存。`workSessionId` と `userId` を紐付ける。
- **サマリー更新**: 案件保存後、ホーム画面の日次サマリー（総報酬、案件数など）および `workSessions` の集計用フィールドをリアルタイム（またはそれに近いタイミング）で更新。
- **入力補助**: デリバリーサービス名は頻繁に使うものをリスト上位に表示、前回入力値をデフォルト表示するなどの工夫。

#### 2.4.4. "地蔵時間"（待機時間）の計算ロジック
- **定義**: 勤務中で、かつ配達案件に従事していない時間（休憩時間を除く）。配達員が次の案件を待っているアイドル時間。
- **計算方法の詳細**:
    1. 勤務開始 (`workSessions.startTime`) から最初の案件の `deliveryCases.orderTime` までの時間。
    2. ある案件の (`deliveryCases.orderTime` + `deliveryCases.durationMinutes`[入力がある場合]) から、次の案件の `deliveryCases.orderTime` までの時間。
    3. 最後の案件の (`deliveryCases.orderTime` + `deliveryCases.durationMinutes`[入力がある場合]) から勤務終了 (`workSessions.endTime`) までの時間。
    - `durationMinutes` が未入力の場合は、その案件の処理時間は0として計算するか、ユーザーに推定入力を促す。
- **保存タイミング**: 勤務終了時に、当該 `workSessions` の `_totalJizoTimeSeconds` フィールドに総地蔵時間を計算して保存。
- **リアルタイム表示**: ホーム画面で、現在の勤務セッションにおける暫定的な地蔵時間を表示することも検討（計算負荷に注意）。

#### 2.4.5. 実質時給の計算ロジック
- **計算式**: `総報酬 / (実働時間(秒) / 3600)`
    - `総報酬`: 当該 `workSessions` の `_totalReward`（チップ含む）。
    - `実働時間(秒)`: `(endTime または現在時刻 - startTime) - totalBreakTimeSeconds`。
- **表示**: ホーム画面で、現在の勤務セッションにおける実質時給をリアルタイムに更新表示。\勤務終了後はそのセッションの最終的な実質時給を表示。
- **注意点**: 実働時間が0または極端に短い場合の表示（例: "--円/時" や計算しないなど）を考慮。

#### 2.4.6. データ表示機能
- **ホーム画面サマリー**:
    - 表示項目: 当該日（または現在の勤務セッション）の総報酬、実質時給、完了案件数、総勤務時間、総休憩時間、総地蔵時間。
    - デザイン: カード形式で見やすく表示。
- **履歴画面**:
    - 表示形式: 過去の `workSessions` を日付の降順でリスト表示。
    - 各リストアイテム: 日付、勤務時間帯（例: 10:00 - 18:30）、総報酬、実質時給、案件数を表示。
    - 詳細表示: リストアイテムをタップすると、その勤務セッションに紐づく `deliveryCases` の一覧（サービス名、報酬、チップ、案件時刻など）を展開表示または別画面で表示。
    - フィルタリング/ソート機能（将来的に検討）: 期間指定、サービス名でのフィルタなど。

#### 2.4.7. 基本的な統計データの集計・表示機能
- **統計画面**:
    - 集計期間選択: 「今日」「昨日」「今週 (月曜始まり)」「先週」「今月」「先月」「全期間」などのプリセット期間をChipGroupやTabsで選択可能にする。
    - 表示項目 (選択期間に応じて集計):
        - 総売上（総報酬合計）
        - 平均実質時給
        - 総勤務時間
        - 総案件数
        - 平均案件単価 (`総売上 / 総案件数`)
        - 総休憩時間
        - 総地蔵時間 / 平均地蔵時間（1勤務あたり）
        - デリバリーサービス別売上割合（円グラフなどで表示、将来検討）
- **集計ロジック**: Firestoreから必要なデータを取得し、クライアントサイドで集計処理を行う（MVP）。データ量が増えた場合はCloud Functionsでのバッチ集計も検討。

## 3. UI/UXデザイン指針

### 3.1. デザインコンセプト: Urban Dash
- **キーワード**: ミニマル、効率的、クリア、プロフェッショナル、モダン、シャープでエッジの効いたダークテーマ。
- **ユーザー体験**: 配達員が迅速に情報を入力・確認でき、ストレスなく業務に集中できるような直感的な操作性を提供。

### 3.2. カラーパレット
- **プライマリー (背景)**: ブラック (`#000000`) または ベリーダークグレー (`#121212`)。目に優しく、バッテリー消費も抑える効果を期待。
- **セカンダリー (カード、モーダル背景など)**: ダークグレー (`#1E1E1E` または `#2C2C2C`)。プライマリーとのコントラストを確保。
- **テキスト/アイコン (基本)**: オフホワイト (`#E0E0E0` や `#F5F5F5`)。可読性を重視。
- **アクセントカラー**: 鮮やかな赤 (`#FF3B30`) またはエレクトリックブルー (`#007AFF`)。重要なアクションやアクティブ状態の表示に使用。
- **成功/収益関連**: グリーン系 (`#34C759`)。
- **注意/警告**: オレンジ系 (`#FF9500`) またはイエロー系 (`#FFCC00`)。

### 3.3. タイポグラフィ
- **フォントファミリー**: Roboto (Android標準) をメインに採用。可読性が高く、多様なウェイトを持つため表現豊か。
- **フォントウェイト**: 見出し (Bold, Medium)、本文 (Regular)、キャプション (Light) など、情報の階層に応じて使い分ける。
- **フォントサイズ**: 基本サイズを定め、見出し、本文、ボタンテキストなどで相対的に調整。アクセシビリティも考慮。

### 3.4. 主要画面仕様

#### 3.4.1. 全画面共通事項
- **ローディングインジケータ**: 中央に円形のプログレスインジケータを表示。色はアクセントカラー。
- **エラー通知**: Snackbar/Toastコンポーネントを使用し、画面下部などに簡潔なエラーメッセージを表示。重要なエラーはダイアログ表示も検討。
- **空状態表示 (Empty State)**: リストやデータ表示領域が空の場合、「データがありません」「最初の案件を記録しましょう」などのメッセージと、関連するアイコンを表示し、ユーザーに次のアクションを促す。
- **ナビゲーション**: 基本はフッタータブバーによる主要画面遷移。詳細画面へはリストアイテムタップなどで遷移。

#### 3.4.2. サインアップ画面
- **レイアウト**: アプリロゴ、タイトル「アカウント作成」、入力フォーム（ニックネーム、メールアドレス、パスワード、パスワード確認）、利用規約・プライバシーポリシーへの同意チェックボックス（リンク付き）、アカウント作成ボタン、ログイン画面への遷移リンク。
- **入力フィールド**: 各フィールドにはプレースホルダーと、フォーカス時に表示されるラベルを設定。入力エラーはフィールド下にリアルタイム表示。
- **バリデーション**: 各フィールドに適切なリアルタイムバリデーションを実装（必須項目、文字数制限、メール形式、パスワード強度、パスワード一致確認）。

#### 3.4.3. ログイン画面
- **レイアウト**: アプリロゴ、タイトル「ログイン」、入力フォーム（メールアドレス、パスワード）、パスワードリセット画面への遷移リンク、ログインボタン、サインアップ画面への遷移リンク。
- **オプション**: 「パスワードを記憶する」チェックボックス（セキュアな方法で実装）。

#### 3.4.4. パスワードリセット要求画面
- **レイアウト**: タイトル「パスワード再設定」、説明文（登録メールアドレスに再設定リンクを送信する旨）、入力フォーム（メールアドレス）、送信ボタン。

#### 3.4.5. ホーム画面（ダッシュボード）
- **上部**: AppBar（アプリ名、右端に設定画面へのアイコン）、ユーザーへの挨拶メッセージ（例: 「こんにちは、[ニックネーム]さん」）、現在の勤務ステータス（例: 「勤務中」「休憩中」「未勤務」）と、それに応じた経過時間（例: 総勤務時間 02:30:15）。
- **中央**: 現在の勤務状態に応じた主要アクションボタンを大きく表示。
    - 未勤務時: 「勤務開始」ボタン。
    - 勤務中時: 「休憩開始」ボタン、「勤務終了」ボタン。
    - 休憩中時: 「休憩終了」ボタン、「勤務終了」ボタン。
- **右下**: 「案件を追加する」フローティングアクションボタン（FAB）。勤務中のみ表示され、タップで案件入力モーダルを開く。
- **下部**: 当日の日次サマリーカード。カード形式で、総報酬、実質時給、完了案件数、総勤務時間、総休憩時間、総地蔵時間を表示。各項目にはアイコンを添えて視認性を高める。
- **フッタータブバー**: 主要機能へのナビゲーション。「ホーム」「履歴」「統計」「アカウント設定」。アクティブなタブはアクセントカラーで強調。

#### 3.4.6. 案件入力画面（モーダルまたは専用画面）
- **タイトル**: 「案件を記録」または「配達を記録」。
- **フォーム要素**:
    - デリバリー会社: ChipGroupまたはDropdownで選択。選択肢に「その他」を含め、選択時は自由入力フィールドを表示。
    - 報酬額: 数値入力フィールド（テンキー推奨）。通貨記号をプレフィックス表示。
    - チップ額: 数値入力フィールド（テンキー推奨）。
    - 所要時間（分）: 数値入力フィールド（任意）。
    - 案件時刻: DateTimePickerコンポーネントで日時を選択。デフォルトは現在時刻。
    - 配達距離（km）: 数値入力フィールド（任意）。
    - メモ: 複数行入力可能なテキストフィールド（任意）。
- **アクションボタン**: 「キャンセル」ボタン、「保存する」ボタン。保存ボタンは必須項目が入力されるまで非活性化。

#### 3.4.7. 履歴画面
- **AppBar**: タイトル「履歴」。右上にフィルタやソートオプションのアイコン（将来検討）。
- **リスト表示**: `workSessions` を日付の降順でカード形式リスト表示。各カードには、日付、勤務時間帯（例: 10:00 - 18:30）、総報酬、実質時給、案件数を表示。
- **詳細表示**: カードをタップすると、その勤務セッションに紐づく `deliveryCases` の一覧をアコーディオン形式で展開表示、または専用の詳細画面に遷移。案件詳細には、サービス名、報酬、チップ、案件時刻などを表示。
- **スクロール**: 無限スクロールまたはページネーションで過去のデータを読み込み。

#### 3.4.8. 統計画面
- **AppBar**: タイトル「統計」。
- **期間選択**: ChipGroupやTabsコンポーネントで集計期間（「今日」「今週」「今月」「全期間」など）を選択。
- **データ表示**: 選択された期間に基づき集計された各種データをカードやリスト形式で表示。総売上、平均実質時給、総勤務時間、総案件数、平均案件単価、総休憩時間、総地蔵時間/平均地蔵時間など。数値だけでなく、シンプルな棒グラフや円グラフでの可視化も検討（MVPでは数値表示を優先）。

#### 3.4.9. アカウント設定画面
- **AppBar**: タイトル「アカウント設定」。
- **リスト項目形式**: 各設定項目をリスト形式で表示。
    - プロフィール情報: ニックネーム（タップで編集画面へ）、メールアドレス（表示のみ）。
    - パスワード変更: タップでパスワード変更画面へ。
    - ログアウト: タップで確認ダイアログ表示後、ログアウト処理。
    - アプリ情報: アプリバージョン表示。
    - (将来的なプレースホルダ): ランキング設定、グループ管理、利用規約、プライバシーポリシー、お問い合わせ、フィードバック送信など。

### 3.5. UIコンポーネントスタイルガイド
- **ボタン**: 
    - プライマリーボタン: 角丸 (4-8dp)。背景はアクセントカラー、文字色はオフホワイト。
    - セカンダリーボタン: 角丸 (4-8dp)。枠線はアクセントカラー、背景は透明またはセカンダリーカラー、文字色はアクセントカラー。
    - テキストボタン: 背景なし、文字色はアクセントカラー。
- **入力フォーム (TextField/Input)**: 背景はセカンダリーカラー。フォーカス時にはアクセントカラーの下線または枠線を表示。ラベルはフィールド上部に配置し、色はオフホワイト。エラーメッセージはフィールド下に赤系の色で表示。
- **カード (CardView)**: 背景はセカンダリーカラー。角丸 (8-12dp程度)。ごく薄いドロップシャドウ、または境界線なしで明度差によって区別。
- **アイコン (Icons)**: Material Design Icons を推奨。シンプルで認識しやすいライン系のアイコン。色はアクセントカラーまたはオフホワイト。
- **タブバー (BottomNavigationBar)**: 背景はプライマリーカラーまたはセカンダリーカラー。アクティブなタブのアイコンとラベルをアクセントカラーで強調。非アクティブなタブはオフホワイトまたはグレー系。
- **モーダルダイアログ (Modal/Dialog)**: 背景はセカンダリーカラー。角丸。画面の他の部分より前面に表示されることを明確にするため、背景にオーバーレイ（半透明の黒など）を敷く。

## 4. 将来的な拡張機能 (概要のみ)

MVPリリース後、ユーザーフィードバックや市場のニーズに応じて以下の機能拡張を検討します。

- **コミュニティ機能**:
    - リアルタイムランキング（日次、週次、月次での報酬額、案件数など）
    - 配達員同士のグループ機能（情報交換、目標共有など）
- **GPS連携機能**:
    - 走行ログの自動記録（移動距離、移動時間など）
    - 配達エリアの地図表示、ヒートマップ表示（高収益エリアの可視化）
- **詳細なデータ可視化**:
    - 収益推移グラフ（日別、週別、月別）
    - 曜日別・時間帯別平均時給グラフ
    - デリバリーサービス別収益比較グラフ
- **高度なデータ活用・AI支援**:
    - 過去データに基づく案件単価予測
    - 最適な稼働時間帯やエリアのレコメンデーション
    - 税務申告用データのエクスポート機能
- **マルチプラットフォーム対応**: iOS版アプリの開発。
- **外部サービス連携**: カレンダーアプリとの連携、会計ソフトとの連携など。
- **通知機能の強化**: 目標達成通知、高単価案件アラート（もし可能であれば）など。

## 5. 技術スタック

- **フロントエンド**: Android (React Native または Flutter を推奨。既存プロジェクトがReact Nativeであればそれに準拠)
    - 理由: クロスプラットフォーム開発の可能性、豊富なライブラリ、活発なコミュニティ。
- **バックエンド**: Firebase
    - Authentication: ユーザー認証
    - Firestore: NoSQLデータベース
    - Cloud Functions: サーバーサイドロジック（将来的に）
    - Cloud Storage: ファイルストレージ（将来的に）
- **推奨UIライブラリ/フレームワーク**:
    - React Native の場合: React Native Elements, React Native Paper, NativeBase など、またはカスタムコンポーネント。
    - Flutter の場合: 標準のMaterial Designウィジェット、および pub.dev で公開されている各種パッケージ (例: `provider`, `flutter_bloc` for state management)。
- **状態管理 (State Management)**:
    - React Native: React Context API, Redux Toolkit, Zustand, Jotai などからプロジェクト規模や特性に応じて選択。
    - Flutter: Provider, Riverpod, BLoC/Cubit などから選択。
- **バージョン管理**: Git (GitHub, GitLabなど)
- **CI/CD**: GitHub Actions, Codemagic, Firebase App Distributionなどを活用し、ビルド・テスト・デプロイの自動化を目指す（将来的に）。

## 6. その他特記事項

- **利用規約・プライバシーポリシー**: アプリ公開と将来的な収益化のため、法務専門家のアドバイスを受けながら早期に準備を開始することを強く推奨します。アプリ内に明示し、ユーザーの同意を得るプロセスを設ける必要があります。
- **テスト戦略**:
    - **単体テスト (Unit Tests)**: 個々の関数やコンポーネントのロジックを検証。
    - **結合テスト (Integration Tests)**: 複数のコンポーネントやモジュールが連携して正しく動作するかを検証。
    - **UIテスト/E2Eテスト (End-to-End Tests)**: ユーザー操作をシミュレートし、実際のデバイスまたはエミュレータでアプリ全体のフローを検証。
    - **ユーザーシナリオテスト**: 実際の配達員に協力を依頼し、実際の業務フローに沿ったシナリオベースのテストを実施。ユーザビリティの課題発見に繋げる。
- **状態管理アーキテクチャ**: フロントエンドの状態管理手法（React Context/Redux/Zustand, Flutter Provider/Riverpod/Bloc等）は、プロジェクト初期段階で慎重に検討し、スケーラビリティとメンテナンス性を考慮した設計を導入してください。
- **オフライン対応**: Firestoreの強力なオフラインキャッシュ機能を最大限に活用し、ネットワーク接続が不安定な状況でも基本的なデータ閲覧や一時的な記録保存（オンライン復帰時に同期）に対応することを検討してください。MVPのスコープ外とする場合でも、将来的な対応を見据えた設計が望ましいです。
- **セキュリティ**: Firestoreのセキュリティルールを適切に設定し、ユーザーデータへの不正アクセスや改ざんを防止してください。クライアントサイドでのバリデーションに加え、サーバーサイド（Cloud Functionsなど）でのバリデーションも重要な箇所では実施を検討。
- **パフォーマンス**: 大量データ表示時のリスト仮想化、不要な再レンダリングの抑制、Firestoreクエリの最適化など、アプリのパフォーマンスに常に注意を払い、快適なユーザー体験を提供してください。

---
以上