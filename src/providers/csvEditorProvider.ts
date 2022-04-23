import * as vscode from 'vscode';
import { renderHtml } from '../utils/webviewHelper';
import {parse, transform, stringify} from 'csv/sync';
import { EndOfLine } from 'vscode';

export class CSVEditorProvider implements vscode.CustomTextEditorProvider {
	private static readonly viewType = 'for-you.csv-editor';
	private searchResult: { count: number, data: any[][]} = {count: 0, data: []};
	private searchText: string = '';

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
		// this.enCodeCheck(document)
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
			if (request.params.search === '') {
				this.getDocumentWhenNoSearch(webview, request, document);
			} else {
				this.getDocumentOnSearch(webview, request, document);
			}
		} else if (request.uri === '/get/test') {
			vscode.commands.executeCommand('vscode.openWith', document.uri, 'for-you.csv-editor')
		}
	}

	private updateTextDocumentByCell(
		document: vscode.TextDocument,
		row: number,
		col: number,
		text: string
	) {
		try { // 替换已有行
			const edit = new vscode.WorkspaceEdit()
			let lineCount = document.lineCount;
			if (row < document.lineCount) {
				const lineStr: vscode.TextLine = document.lineAt(row)
				let lineInfo: string[][] = this.csvTxt2Arrar(lineStr.text)
				lineInfo[0][col] = text
				let isDelLine = true;
				for (const iterator of lineInfo[0]) {
					if (iterator) {
						isDelLine = false;
						break;
					}
				}
				let newLine = isDelLine? '' : stringify(lineInfo);
	
				if (isDelLine && row === document.lineCount - 1 && row !== 0) {
					const lastLine: vscode.TextLine = document.lineAt(row - 1)
					let range: vscode.Range = new vscode.Range(
						lastLine.range.end,
						lineStr.range.end,
					)
					edit.delete(
						document.uri,
						range
					);
				} else {
					edit.replace(
						document.uri,
						lineStr.range,
						newLine.trimEnd()
					);
				}
	
				vscode.workspace.applyEdit(edit);
			} else { // 插入新行
				let csv: string[] = []
				for (let start = 0; start <= col; start++) {
					if (col === start) {
						csv.push(text);
					} else {
						csv.push('');
					}
				}
				let str = stringify([csv])

				const lineStr: vscode.TextLine = document.lineAt(lineCount - 1)
				let lines = [lineStr.text];
				for (let start = lineCount; start <= row; start ++) {
					if (start === row) {
						lines.push(str.trimEnd());
					} else {
						lines.push('');
					}
				}

				let eol = document.eol === EndOfLine.LF ? "\n" : "\r\n";
				let newLine = lines.join(eol);
				edit.replace(
					document.uri,
					lineStr.range,
					newLine
				);
				vscode.workspace.applyEdit(edit);
			}
		} catch (error) {
			console.log(error)
		}
	}

	private csvTxt2Arrar(txt: string): string[][] {
		if (!txt) return [[]];

		let result: string[][]= [];
		txt.split(/\n|\r\n/).forEach(item => {
			try {
				const rawRecords = parse(item);
				let data: any = transform(rawRecords, function(data){
					return data;
				});
				result.push(data[0]);
			} catch (error) {
				result.push([item]);
			}
		});

		if (result.length === 0) result = [[]];

		return result;
	}

	private async enCodeCheck(document: vscode.TextDocument) {
		let start = new Date()
		let text = document.getText()
		if (text.indexOf('�') != -1) {
			
		}
		
	}

	private getDocumentWhenNoSearch(webview: vscode.Webview, request: any, document: vscode.TextDocument) {
		let startLine = request.params.page <= 1 ? 0 : (request.params.page - 1) * request.params.prePage
		let endLine = request.params.page <= 1 ? request.params.prePage -1 : request.params.prePage * request.params.page - 1
		let lineCount = document.lineCount;
		endLine = endLine > lineCount ? lineCount : endLine;
		this.searchText = '';

		if (startLine > lineCount) {
			webview.postMessage({
				requestId: request.requestId,
				page: request.params.page,
				prePage: request.params.prePage,
				lineCount: lineCount,
				lineInfo: [],
				data: []
			})
		} else {
			let range = new vscode.Range(startLine, 0, endLine, 9999);
			let text = document.getText(range);
			const data: string[][] = this.csvTxt2Arrar(text);
			let num = startLine;
			let lineInfo: any = [];
			data.forEach(() => {
				lineInfo.push(num)
				num += 1;
			});
			webview.postMessage({
				requestId: request.requestId,
				page: request.params.page,
				prePage: request.params.prePage,
				lineCount: lineCount,
				lineInfo: lineInfo,
				data: data
			})
		}
	}

	private getDocumentOnSearch(webview: vscode.Webview, request: any, document: vscode.TextDocument) {
		if (request.params.search !== this.searchText) {
			this.resetSearchResult(document, request.params.search);
		}

		let startLine = request.params.page <= 1 ? 0 : (request.params.page - 1) * request.params.prePage
		let endLine = request.params.page <= 1 ? request.params.prePage : request.params.prePage * request.params.page
		let lineCount = this.searchResult.count;

		if (startLine > lineCount) {
			webview.postMessage({
				requestId: request.requestId,
				page: request.params.page,
				prePage: request.params.prePage,
				lineCount: lineCount,
				lineInfo: [],
				data: []
			});
		} else {
			endLine = endLine > lineCount ? lineCount : endLine;
			let lineInfo = [];
			let str: any[] = [];
			for (let i = startLine; i < endLine; i++) {
				lineInfo.push(this.searchResult.data[i][0]);
				str.push(this.searchResult.data[i][1]);
			}
			const data: string[][] = this.csvTxt2Arrar(str.join("\n"));

			webview.postMessage({
				requestId: request.requestId,
				page: request.params.page,
				prePage: request.params.prePage,
				lineCount: lineCount,
				lineInfo: lineInfo,
				data: data
			})
		}
	}

	private resetSearchResult(document: vscode.TextDocument, search: string) {
		this.searchText = search;
		let regExp = new RegExp(this.searchText, 'i')
		this.searchResult.count = 0;
		this.searchResult.data = [];
		let text = document.getText();
		text.split(/\n|\r\n/).forEach((txt, line) => {
			if (regExp.test(txt)) {
				this.searchResult.count += 1;
				this.searchResult.data.push([line, txt]);
			}
		});
	}
}
