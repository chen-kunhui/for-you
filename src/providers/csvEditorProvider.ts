import * as vscode from 'vscode';
import { renderHtml } from '../utils/webviewHelper';

export class CSVEditorProvider implements vscode.CustomTextEditorProvider {
	private static readonly viewType = 'for-you.csv-editor';

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new CSVEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(CSVEditorProvider.viewType, provider);
		return providerRegistration;
	}

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true
		};

		webviewPanel.webview.html = renderHtml(
			webviewPanel.webview,
			this.context.extensionUri,
			'csvEditor',
			{includeCommonResource: true}
		);

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				// 文本被更新了
				console.log("========changeDocumentSubscription e========", e)
			}
		});

		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		webviewPanel.webview.onDidReceiveMessage(e => {
			this.onDidReceiveMessageDo(webviewPanel.webview, e, document)
		});
	}

	private onDidReceiveMessageDo(webview: vscode.Webview, request: any, document: vscode.TextDocument) {
		if (request.uri === '/update/document') {
			let params = request.params
			this.updateTextDocument(document, params.row, params.col, params.text)
		} else if (request.uri === '/get/document') {
			let startLine = request.params.page <= 1 ? 0 : (request.params.page - 1) * request.params.prePage
			let endLine = request.params.page <= 1 ? request.params.prePage : request.params.prePage * request.params.page
			let lineCount = document.lineCount
			endLine = endLine > lineCount ? lineCount : endLine

			if (startLine > lineCount) {
				webview.postMessage({
					requestId: request.requestId,
					startLine: startLine,
					endLine: endLine,
					page: request.params.page,
					prePage: request.params.prePage,
					lineCount: lineCount,
					data: []
				})
			} else {
				let range = new vscode.Range(startLine, 0, endLine, 9999);
				let text = document.getText(range)
				let data: any = []
				text.split(/\n|\r\n/).forEach(str => {
					data.push(str.split(','))
				})
				webview.postMessage({
					requestId: request.requestId,
					startLine: startLine,
					endLine: endLine,
					page: request.params.page,
					prePage: request.params.prePage,
					lineCount: lineCount,
					data: data
				})
			}
			
		}
	}

	private updateTextDocument(
		document: vscode.TextDocument,
		row: number,
		col: number,
		text: string
	) {
		try {
			const edit = new vscode.WorkspaceEdit()
			const lineStr: vscode.TextLine = document.lineAt(row)
			let offset = col === 0 ? 0 : 1;
			let startCharacter = lineStr.text.split(',').slice(0, col).join(',').length + offset
			let endCharacter = startCharacter + lineStr.text.split(',')[col].length
			let range = new vscode.Range(row, startCharacter, row, endCharacter)

			edit.replace(
				document.uri,
				range,
				text
			);

			vscode.workspace.applyEdit(edit);
		} catch (error) {
			
		}
	}
}
