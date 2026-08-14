# こいけ不動産 静的サイト

Cloudflare Pagesでビルド不要で公開できる静的HTMLサイトです。公開ディレクトリはリポジトリ直下、ビルドコマンドは空欄にしてください。

## ブランド素材
`/assets/brand/` は正式素材専用です。ロゴ・バナーは削除、上書き、描き直し、ファイル名変更を禁止します。元ファイルのバックアップは `/assets/brand/backup/` に保持します。

GitHub確認時点で `koike-exact-logo.png` と `koike-exact-logo-full.png` はリポジトリ内に存在しませんでした。正式ファイルを入手後、内容を変更せず `/assets/brand/` と `/assets/brand/backup/` に追加してください。

## 問い合わせフォーム設定
現在は送信先未設定です。次のいずれかを設定してください。
1. Formspree等でフォームを作り、`contact/index.html` の `form action=""` に発行URLを設定。
2. Cloudflare Pages Functionsで `/api/contact` を作成し、formのactionを `/api/contact` に変更。メール送信サービスのAPIキーはCloudflareの環境変数に保存し、HTMLに書かないでください。

## 公開前の要確認
会社名、代表者、所在地、免許番号、電話番号、メール、営業時間、定休日、Googleマップ、代表写真、事務所写真、フォーム送信先、正式ドメイン。canonical・OGP・sitemapは正式ドメイン決定後に置換してください。
