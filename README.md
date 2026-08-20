# 株式会社こいけ不動産 公式Webサイト

遠方の相続不動産、空き家、古家、地方不動産の売却・活用相談を案内する静的HTMLサイトです。

## 技術構成と公開
- 静的HTML / CSS / JavaScript（ビルド不要）
- GitHub: `koikefudosan/koike-fudosan-website`
- 本番ブランチ: `main`
- Cloudflare Pages: リポジトリ直下を公開
- 正規ドメイン: `https://koike-fudousan.com/`
- Cloudflare Pages URL: `https://koike-fudosan-website.pages.dev/`

Cloudflare Pagesではビルドコマンドを空欄、出力ディレクトリをリポジトリ直下にします。

## 主なページ
`/`, `/sale/`, `/inheritance/`, `/minpaku/`, `/area/`, `/cases/`, `/company/`, `/faq/`, `/contact/`, `/privacy/`

## ローカル確認
リポジトリ直下で静的HTTPサーバーを起動し、相対リンク・404・モバイル表示を確認します。例: `python -m http.server 8000`

## SEO関連ファイル
- `robots.txt`: 正規サイトマップを通知
- `sitemap.xml`: 公開対象URLのみを掲載
- `404.html`: Cloudflare Pages用404
- `_headers`: セキュリティと静的アセットのキャッシュ
- `_redirects`: 既知の重複URLを正規化

ページ追加時は固有のtitle、description、canonical、OGP、H1、パンくず、内部リンクを設定し、公開対象のみsitemapへ追加してください。lastmodは実際の更新日に合わせます。

## 実績・記事の追加
架空の事例は作成しません。地域、物件種別、相談背景、対応、結果、掲載許可を確認してから追加します。法律・税務・登記情報は確認日と一次情報を明記します。

## 画像
重要画像は適正サイズのJPEG/WebP等を使用し、画面外画像にはlazy loading、適切なalt、width/heightを設定します。実際の物件・社員・実績と誤認させる画像は使用しません。

## 外部サービスの設定状況
- 問い合わせフォーム: 送信先未設定。現在は電話・メールのみ表示
- Google Search Console: 登録状況未確認
- GA4 / GTM: 測定ID未確認、タグ未導入
- Google Business Profile: 管理権限・登録状況未確認

## 問い合わせフォームを有効化する場合
Cloudflare Pages Functionsやフォームサービスを利用し、APIキーはCloudflare環境変数に保存します。氏名、メール、電話、物件所在地、相談内容、同意、エラー、スパム対策、二重送信対策を実装・検証してから画面に表示します。

## 注意事項
会社情報、サービス条件、実績、営業時間、定休日、料金、外部サービスIDは推測で追加しません。秘密情報をリポジトリへコミットしないでください。

## 問い合わせフォーム実装
- エンドポイント: `/api/contact`（Cloudflare Pages Functions）
- Turnstile設定取得: `/api/contact-config`
- メールAPI: Resend HTTPS API
- フロントエンド: `contact-form.js`

### Production / Previewに必要な環境変数
- `CONTACT_TO_EMAIL`（正式値: info@koike-fudousan.com）
- `CONTACT_REPLY_TO_EMAIL`（正式値: info@koike-fudousan.com）
- `CONTACT_FROM_EMAIL`（Resendで認証済みの送信元）
- `MAIL_API_KEY`（Secret）
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`（Secret）

任意でKV Namespaceを`CONTACT_RATE_LIMIT`としてバインドすると、IP単位の短時間連続送信制限が有効になります。秘密値をリポジトリへ保存しないでください。
