import * as vscode from 'vscode';
import { renderHtml } from '../utils/webviewHelper';
import { DocumentEditer } from './csv/documentEditer';
import { DocumentGeter } from './csv/documentGeter';
import { PageManager } from './csv/pageManager';

export class CSVEditorProvider implements vscode.CustomTextEditorProvider {
	private documentEditer: DocumentEditer | undefined;
	private documentGeter: DocumentGeter | undefined;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private docUrl: string,
		private feedbackUrl: string
	) { }

	public static register(
		context: vscode.ExtensionContext,
		viewType: string,
		docUrl: string,
		feedbackUrl: string
	): vscode.Disposable {
		const provider = new CSVEditorProvider(context, docUrl, feedbackUrl);
		const providerRegistration = vscode.window.registerCustomEditorProvider(viewType, provider);
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

		webviewPanel.webview.onDidReceiveMessage(e => {
			this.onDidReceiveMessageDo(webviewPanel.webview, e, document)
		});
	}

	private onDidReceiveMessageDo(webview: vscode.Webview, request: any, document: vscode.TextDocument) {
		switch (request.uri) {
			case '/init':
				let pageManager = new PageManager()
				pageManager.resetRows(document, 0)
				this.documentGeter = new DocumentGeter(document, pageManager, webview)
				this.documentEditer = new DocumentEditer(document, pageManager, webview);
				webview.postMessage({
					requestId: request.requestId,
					success: true
				})
				break;
			case '/update/document':
				let params = request.params
				this.documentEditer!.updateCell(params.row, params.col, params.text, request.requestId)
				break;
			case '/get/document':
				this.documentGeter?.getDocument(request);
				break;
			case '/save/document':
				document.save();
				break;
			case '/insert/row':
				this.documentEditer!.insertRow(request, this.documentGeter!);
				break;
			case '/open/doc':
				vscode.commands.executeCommand('vscode.open', this.docUrl);
				break;
			case '/open/feedback':
				vscode.commands.executeCommand('vscode.open', this.feedbackUrl);
				break;
			case '/get/test':
				vscode.commands.executeCommand('vscode.openWith', document.uri, 'for-you.csv-editor')
				break;
			default:
				break;
		}
	}
}
