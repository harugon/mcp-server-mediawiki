#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import Bot from "nodemw";


// MCPサーバーの設定を環境変数から取得する
function getMediaWikiConfig(): any {
    const config = {
        protocol: process.env.MEDIAWIKI_PROTOCOL || "https",
        server: process.env.MEDIAWIKI_SERVER,
        path: process.env.MEDIAWIKI_PATH || "/w",
        username: process.env.MEDIAWIKI_USERNAME,
        password: process.env.MEDIAWIKI_PASSWORD,
        userAgent: process.env.MEDIAWIKI_USER_AGENT || "MediaWiki-MCP-Server/1.0",
        concurrency: Number(process.env.MEDIAWIKI_CONCURRENCY) || 3,
        debug: false//
    };

    if (!config.server) {
        console.error("MEDIAWIKI_SERVER environment variable is not set");
        process.exit(1);
    }

    return config;
}

// nodemwクライアントの初期化
const config = getMediaWikiConfig();
const mwClient = new Bot(config);

// ユーザーログイン用のツール
const LOGIN_TOOL: Tool = {
    name: "mediawiki_login",
    description: "Login to MediaWiki site",
    inputSchema: {
        type: "object",
        properties: {
            username: {
                type: "string",
                description: "Username"
            },
            password: {
                type: "string",
                description: "Password"
            },
            domain: {
                type: "string",
                description: "Domain (optional)"
            }
        },
        required: ["username", "password"]
    }
};

// 記事の取得用のツール
const GET_ARTICLE_TOOL: Tool = {
    name: "mediawiki_get_article",
    description: "Get article content and redirect information",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            },
            redirect: {
                type: "boolean",
                description: "Whether to resolve redirects (default: true)"
            }
        },
        required: ["title"]
    }
};

// 記事の編集用のツール
const EDIT_ARTICLE_TOOL: Tool = {
    name: "mediawiki_edit_article",
    description: "Create or edit an article",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            },
            content: {
                type: "string",
                description: "Article content"
            },
            summary: {
                type: "string",
                description: "Edit summary"
            },
            minor: {
                type: "boolean",
                description: "Mark as minor edit"
            }
        },
        required: ["title", "content", "summary"]
    }
};

// 記事末尾への追加用のツール
const APPEND_CONTENT_TOOL: Tool = {
    name: "mediawiki_append",
    description: "Append content to the end of an article",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            },
            content: {
                type: "string",
                description: "Content to append"
            },
            summary: {
                type: "string",
                description: "Edit summary"
            }
        },
        required: ["title", "content", "summary"]
    }
};

// 記事先頭への追加用のツール
const PREPEND_CONTENT_TOOL: Tool = {
    name: "mediawiki_prepend",
    description: "Prepend content to the beginning of an article",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            },
            content: {
                type: "string",
                description: "Content to prepend"
            },
            summary: {
                type: "string",
                description: "Edit summary"
            }
        },
        required: ["title", "content", "summary"]
    }
};

// 記事を削除
const DELETE_ARTICLE_TOOL: Tool = {
    name: "mediawiki_delete",
    description: "Delete an article",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Title of the article to delete"
            },
            reason: {
                type: "string",
                description: "Reason for deletion"
            }
        },
        required: ["title", "reason"]
    }
};

// ページの移動用のツール
const MOVE_ARTICLE_TOOL: Tool = {
    name: "mediawiki_move",
    description: "Move (rename) an article",
    inputSchema: {
        type: "object",
        properties: {
            from: {
                type: "string",
                description: "Source article title"
            },
            to: {
                type: "string",
                description: "Destination article title"
            },
            summary: {
                type: "string",
                description: "Move reason"
            }
        },
        required: ["from", "to", "summary"]
    }
};

// ファイルをアップロード
const UPLOAD_FILE_TOOL: Tool = {
    name: "mediawiki_upload",
    description: "Upload a file",
    inputSchema: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "File name"
            },
            content: {
                type: "string",
                description: "File content (Base64 encoded)"
            },
            summary: {
                type: "string",
                description: "Upload summary"
            }
        },
        required: ["filename", "content", "summary"]
    }
};

// URLからファイルをアップロード
const UPLOAD_BY_URL_TOOL: Tool = {
    name: "mediawiki_upload_by_url",
    description: "Upload a file by specifying a URL",
    inputSchema: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "File name"
            },
            url: {
                type: "string",
                description: "File URL"
            },
            summary: {
                type: "string",
                description: "Upload summary"
            }
        },
        required: ["filename", "url", "summary"]
    }
};

// カテゴリを取得
const GET_CATEGORIES_TOOL: Tool = {
    name: "mediawiki_get_categories",
    description: "Get a list of all categories in the wiki",
    inputSchema: {
        type: "object",
        properties: {
            prefix: {
                type: "string",
                description: "Category name prefix (optional)"
            }
        },
        required: []
    }
};

// カテゴリ内のページを取得
const GET_PAGES_IN_CATEGORY_TOOL: Tool = {
    name: "mediawiki_get_pages_in_category",
    description: "Get a list of pages in the specified category",
    inputSchema: {
        type: "object",
        properties: {
            category: {
                type: "string",
                description: "Category name"
            }
        },
        required: ["category"]
    }
};

// すべてのページを取得
const GET_ALL_PAGES_TOOL: Tool = {
    name: "mediawiki_get_all_pages",
    description: "Get a list of all pages in the main namespace (excluding redirects)",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    }
};

// 記事のリビジョンを取得
const GET_ARTICLE_REVISIONS_TOOL: Tool = {
    name: "mediawiki_get_article_revisions",
    description: "Get all revisions of an article",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            }
        },
        required: ["title"]
    }
};

// 記事のカテゴリを取得
const GET_ARTICLE_CATEGORIES_TOOL: Tool = {
    name: "mediawiki_get_article_categories",
    description: "Get all categories an article belongs to",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            }
        },
        required: ["title"]
    }
};

// 検索を実行
const SEARCH_TOOL: Tool = {
    name: "mediawiki_search",
    description: "Search within the wiki",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search query"
            }
        },
        required: ["query"]
    }
};

// バックリンクを取得
const GET_BACKLINKS_TOOL: Tool = {
    name: "mediawiki_get_backlinks",
    description: "Get all articles that link to the specified article",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            }
        },
        required: ["title"]
    }
};

// 記事の画像を取得
const GET_IMAGES_FROM_ARTICLE_TOOL: Tool = {
    name: "mediawiki_get_images_from_article",
    description: "Get a list of all images used in the specified page",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Article title"
            }
        },
        required: ["title"]
    }
};

// ウィキテキストをパース
const PARSE_TOOL: Tool = {
    name: "mediawiki_parse",
    description: "Parse wikitext",
    inputSchema: {
        type: "object",
        properties: {
            content: {
                type: "string",
                description: "Wikitext to parse"
            },
            title: {
                type: "string",
                description: "Title of the article for context (optional)"
            }
        },
        required: ["content"]
    }
};

/* 
    Resources 　副作用なし
Resources are how you expose data to LLMs. They're similar to GET endpoints in a REST API -
 they provide data but shouldn't perform significant computation or have side effects:
  */
const MEDIAWIKI_RESOURCES = [] as const;


/*
 Tools　副作用あり
 Tools let LLMs take actions through your server. Unlike resources, 
 tools are expected to perform computation and have side effects:
*/
const MEDIAWIKI_TOOLS = [
    LOGIN_TOOL,
    GET_ARTICLE_TOOL,
    EDIT_ARTICLE_TOOL,
    APPEND_CONTENT_TOOL,
    PREPEND_CONTENT_TOOL,
    DELETE_ARTICLE_TOOL,
    MOVE_ARTICLE_TOOL,
    UPLOAD_FILE_TOOL,
    UPLOAD_BY_URL_TOOL,
    GET_CATEGORIES_TOOL,
    GET_PAGES_IN_CATEGORY_TOOL,
    GET_ALL_PAGES_TOOL,
    GET_ARTICLE_REVISIONS_TOOL,
    GET_ARTICLE_CATEGORIES_TOOL,
    SEARCH_TOOL,
    GET_BACKLINKS_TOOL,
    GET_IMAGES_FROM_ARTICLE_TOOL,
    PARSE_TOOL
] as const;

/**
 * Prompt  ユーザーとの対話
 * Prompts are reusable templates that help LLMs interact with your server effectively:
 * 
 */
const MEDIAWIKI_PROMPTS = [] as const;

// Promise化のためのヘルパー関数
function promisify<T>(fn: Function, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        fn.call(mwClient, ...args, (err: Error | null, data: T) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

// ログイン処理を実行
async function handleLogin(username: string, password: string, domain?: string) {
    try {
        await promisify(mwClient.logIn, username, password, domain);
        return {
            content: [{
                type: "text",
                text: `Successfully logged in as ${username}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Login failed: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事の内容を取得
async function handleGetArticle(title: string, redirect = true) {
    try {
        const article = await (redirect
            ? promisify<string>(mwClient.getArticle, title)
            : promisify<string>(mwClient.getArticle, title, false));

        return {
            content: [{
                type: "text",
                text: article || `Article ${title} not found`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get article: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事を編集
async function handleEditArticle(title: string, content: string, summary: string, minor = false) {
    try {
        await promisify(mwClient.edit, title, content, summary, minor);
        return {
            content: [{
                type: "text",
                text: `Edited article ${title}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to edit article: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事にコンテンツを追加
async function handleAppendContent(title: string, content: string, summary: string) {
    try {
        await promisify(mwClient.append, title, content, summary);
        return {
            content: [{
                type: "text",
                text: `Appended content to article ${title}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to append content: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事の先頭にコンテンツを追加
async function handlePrependContent(title: string, content: string, summary: string) {
    try {
        await promisify(mwClient.prepend, title, content, summary);
        return {
            content: [{
                type: "text",
                text: `Prepended content to article ${title}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to prepend content: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事を削除
async function handleDeleteArticle(title: string, reason: string) {
    try {
        //@ts-ignore
        await promisify(mwClient.delete, title, reason);
        return {
            content: [{
                type: "text",
                text: `Deleted article ${title}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to delete article: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事を移動
async function handleMoveArticle(from: string, to: string, summary: string) {
    try {
        await promisify(mwClient.move, from, to, summary);
        return {
            content: [{
                type: "text",
                text: `Moved article from ${from} to ${to}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to move article: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// ファイルをアップロード
async function handleUpload(filename: string, content: string, summary: string) {
    try {
        // Base64デコード
        const buffer = Buffer.from(content, 'base64');

        await promisify(mwClient.upload, filename, buffer, summary);
        return {
            content: [{
                type: "text",
                text: `Uploaded file ${filename}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// URLからファイルをアップロード
async function handleUploadByUrl(filename: string, url: string, summary: string) {
    try {
        await promisify(mwClient.uploadByUrl, filename, url, summary);
        return {
            content: [{
                type: "text",
                text: `Uploaded file ${filename} from URL ${url}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// カテゴリを取得
async function handleGetCategories(prefix?: string) {
    try {
        const categories = await promisify<string[]>(mwClient.getCategories, prefix);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(categories, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get categories: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// カテゴリ内のページを取得
async function handleGetPagesInCategory(category: string) {
    try {
        const pages = await promisify<any[]>(mwClient.getPagesInCategory, category);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(pages, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get pages in category: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// すべてのページを取得
async function handleGetAllPages() {
    try {
        const pages = await promisify<string[]>(mwClient.getAllPages);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(pages, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get all pages: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事のリビジョンを取得
async function handleGetArticleRevisions(title: string) {
    try {
        const revisions = await promisify<any[]>(mwClient.getArticleRevisions, title);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(revisions, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get article revisions: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事のカテゴリを取得
async function handleGetArticleCategories(title: string) {
    try {
        const categories = await promisify<string[]>(mwClient.getArticleCategories, title);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(categories, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get article categories: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 検索を実行
async function handleSearch(query: string) {
    try {
        const results = await promisify<any[]>(mwClient.search, query);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(results, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to search: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// バックリンクを取得
async function handleGetBacklinks(title: string) {
    try {
        const pages = await promisify<string[]>(mwClient.getBacklinks, title);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(pages, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get backlinks: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// 記事の画像を取得
async function handleGetImagesFromArticle(title: string) {
    try {
        const images = await promisify<string[]>(mwClient.getImagesFromArticle, title);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(images, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to get images from article: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// ウィキテキストをパース
async function handleParse(content: string, title?: string) {
    try {
        const parsed = await promisify<any>(mwClient.parse, content, title);

        return {
            content: [{
                type: "text",
                text: JSON.stringify(parsed, null, 2)
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

// サーバーセットアップ
const server = new Server(
    {
        name: "mcp-server/mediawiki",
        version: "0.1.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
          },
    },
);

// リクエストハンドラの設定
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    prompts: MEDIAWIKI_PROMPTS,
    resources: MEDIAWIKI_RESOURCES,
    tools: MEDIAWIKI_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            case "mediawiki_login": {
                const { username, password, domain } = args as {
                    username: string;
                    password: string;
                    domain?: string
                };
                return await handleLogin(username, password, domain);
            }

            case "mediawiki_get_article": {
                const { title, redirect } = args as {
                    title: string;
                    redirect?: boolean
                };
                return await handleGetArticle(title, redirect);
            }

            case "mediawiki_edit_article": {
                const { title, content, summary, minor } = args as {
                    title: string;
                    content: string;
                    summary: string;
                    minor?: boolean
                };
                return await handleEditArticle(title, content, summary, minor);
            }

            case "mediawiki_append": {
                const { title, content, summary } = args as {
                    title: string;
                    content: string;
                    summary: string
                };
                return await handleAppendContent(title, content, summary);
            }

            case "mediawiki_prepend": {
                const { title, content, summary } = args as {
                    title: string;
                    content: string;
                    summary: string
                };
                return await handlePrependContent(title, content, summary);
            }

            case "mediawiki_delete": {
                const { title, reason } = args as {
                    title: string;
                    reason: string
                };
                return await handleDeleteArticle(title, reason);
            }

            case "mediawiki_move": {
                const { from, to, summary } = args as {
                    from: string;
                    to: string;
                    summary: string
                };
                return await handleMoveArticle(from, to, summary);
            }

            case "mediawiki_upload": {
                const { filename, content, summary } = args as {
                    filename: string;
                    content: string;
                    summary: string
                };
                return await handleUpload(filename, content, summary);
            }

            case "mediawiki_upload_by_url": {
                const { filename, url, summary } = args as {
                    filename: string;
                    url: string;
                    summary: string
                };
                return await handleUploadByUrl(filename, url, summary);
            }

            case "mediawiki_get_categories": {
                const { prefix } = args as { prefix?: string };
                return await handleGetCategories(prefix);
            }

            case "mediawiki_get_pages_in_category": {
                const { category } = args as { category: string };
                return await handleGetPagesInCategory(category);
            }

            case "mediawiki_get_all_pages": {
                return await handleGetAllPages();
            }

            case "mediawiki_get_article_revisions": {
                const { title } = args as { title: string };
                return await handleGetArticleRevisions(title);
            }

            case "mediawiki_get_article_categories": {
                const { title } = args as { title: string };
                return await handleGetArticleCategories(title);
            }

            case "mediawiki_search": {
                const { query } = args as { query: string };
                return await handleSearch(query);
            }

            case "mediawiki_get_backlinks": {
                const { title } = args as { title: string };
                return await handleGetBacklinks(title);
            }

            case "mediawiki_get_images_from_article": {
                const { title } = args as { title: string };
                return await handleGetImagesFromArticle(title);
            }

            case "mediawiki_parse": {
                const { content, title } = args as { content: string; title?: string };
                return await handleParse(content, title);
            }

            default:
                return {
                    content: [{
                        type: "text",
                        text: `Unknown tool: ${name}`
                    }],
                    isError: true
                };
        }
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
});

// サーバーを起動
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    //JSON-RPC 以外のメッセージが完全に出力されないように注意 console出力しないように！！
    //console.error("MediaWiki MCP Server running on stdio");
    //console.error(`Config: ${JSON.stringify(config, null, 2)}`);
}

runServer().catch((error) => {
    console.error("Fatal error occurred while running server:", error);
    process.exit(1);
});
