import { Uri, Webview } from 'vscode';

export function renderHtml(webview: Webview, extensionUri: Uri, name: string, options: any = {}) {
    let sidebar: boolean = !!options.sidebar
    let includeCommonResource = !!options.includeCommonResource
    const commonjs = webview.asWebviewUri(Uri.joinPath(extensionUri, 'dist', 'webviews', 'common.style.js'));
    const commoncss = webview.asWebviewUri(Uri.joinPath(extensionUri, 'dist', 'webviews', 'common.style.css'));
    const pagejs = webview.asWebviewUri(Uri.joinPath(extensionUri, 'dist', 'webviews', `${name}.js`));
    const pagecss = webview.asWebviewUri(Uri.joinPath(extensionUri, 'dist', 'webviews', `${name}.css`));

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${includeCommonResource ? `<link rel="stylesheet" href="${commoncss}">`: ''}
        <link rel="stylesheet" href="${pagecss}">
        <title>Cat Coding</title>
    </head>
    <body class="${sidebar ? 'vscode-sidebar' : 'vscode-editor' }">
        <div id="vue-app"></div>
        ${includeCommonResource ? `<script src="${commonjs}"></script>`: ''}
        <script src="${pagejs}"></script>
    </body>
    </html>
    `;
}