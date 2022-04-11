import * as vscode from 'vscode';
import { renderHtml } from '../utils/webviewHelper';
import {parse, transform, stringify} from 'csv/sync';

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
			this.updateTextDocumentByCell(document, params.row, params.col, params.text)
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
				const data: string[][] = this.csvTxt2Arrar(text)

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

	private updateTextDocumentByCell(
		document: vscode.TextDocument,
		row: number,
		col: number,
		text: string
	) {
		try {
			const edit = new vscode.WorkspaceEdit()
			const lineStr: vscode.TextLine = document.lineAt(row)
			let lineInfo: string[][] = this.csvTxt2Arrar(lineStr.text)
			lineInfo[0][col] = text
			let newLine = stringify(lineInfo)

			edit.replace(
				document.uri,
				lineStr.range,
				newLine.trimEnd()
			);

			vscode.workspace.applyEdit(edit);
		} catch (error) {
			
		}
	}

	private csvTxt2Arrar(txt: string): string[][] {
		if (!txt) {
			return [[]]
		}
		const rawRecords = parse(txt);
		let data: any = transform(rawRecords, function(data){
			return data
		});

		return data
	}
}
