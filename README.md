# MediaWiki MCP サーバー

MediaWiki MCPサーバーは、ClaudeのようなAIアシスタントがMediaWikiインスタンスと対話するための強力なツールセットを提供します
nodemwを使用してMediaWiki APIと通信し、MediaWikiのページコンテンツを取得します。

## 主な機能

* **ページコンテンツの取得**: WikiページのHTML内容とメタデータを取得
* **Wiki検索**: キーワードに基づいてページを検索
* **カテゴリ情報の取得**: ページのカテゴリ情報の取得
* **リンク分析**: ページ内の内部リンクの抽出

## 前提条件

- Node.js 18以上
- npm または yarn

## 使用方法

### インストール

### Claude設定での使用例
claude_desktop_config.json
Claude設定ファイルでの設定例:

```json:
{
  "mcpServers": {
   "mediawiki": {
      "command": "npm",
      "args": ["@harugon/mediawiki-mcp-server"],
      "env": {
        "MEDIAWIKI_PROTOCOL": "https",
        "MEDIAWIKI_SERVER": "ja.wikipedia.org",
        "MEDIAWIKI_PATH": "/w",
        "MEDIAWIKI_USER_AGENT": "MediaWiki-MCP-Server/1.0",
        "MEDIAWIKI_CONCURRENCY": "3",
        "DEBUG": "1"
      }
    }
  }
}
```

## 利用可能な機能

## 環境変数の一覧

| 環境変数名 | 必須 | デフォルト値 | 説明 |
|------------|------|--------------|------|
| MEDIAWIKI_PROTOCOL | × | https | MediaWikiサーバーとの通信プロトコル |
| MEDIAWIKI_SERVER | ○ | - | MediaWikiサーバーのホスト名（例: ja.wikipedia.org） |
| MEDIAWIKI_PATH | × | /w | MediaWikiのパス |
| MEDIAWIKI_USERNAME | × | - | ログイン用のユーザー名 |
| MEDIAWIKI_PASSWORD | × | - | ログイン用のパスワード |
| MEDIAWIKI_USER_AGENT | × | MediaWiki-MCP-Server/1.0 | APIリクエスト時のユーザーエージェント |
| MEDIAWIKI_CONCURRENCY | × | 3 | 同時接続数の制限 |
| DEBUG | × | 0 | デバッグモード（1で有効） |

## 既知の問題
- 記事が大きすぎる場合、ページの取得に失敗することがあります　（チャンク機能が必要です）
- nodemwに依存しているため、機能に制限があります

## link

- [For Server Developers \- Model Context Protocol](https://modelcontextprotocol.io/quickstart/server)
- [Introduction \- Model Context Protocol](https://modelcontextprotocol.io/quickstart/server)
- [macbre/nodemw: MediaWiki API and WikiData client written in Node\.js](https://github.com/macbre/nodemw/tree/devel)
