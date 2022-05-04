import * as vscode from 'vscode';
import { CSVEditorProvider } from './providers/csvEditorProvider';


export function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage("你好，加油~")
	context.subscriptions.push(CSVEditorProvider.register(
		context,
		'for-you.csv-editor',
		'https://code.visualstudio.com/api/references/theme-color#editor-groups-tabs',
		'https://code.visualstudio.com/api/references/theme-color#editor-groups-tabs'
	));
	context.subscriptions.push(vscode.commands.registerCommand('for-you.open-with-csv-editor', (uri: vscode.Uri) => {
		if (uri.scheme === 'file' && uri.path.endsWith('csv')) {
			vscode.commands.executeCommand('vscode.openWith', uri, 'for-you.csv-editor')
		} else {
			vscode.window.showWarningMessage("仅支持打开 .csv 后缀的文件")
		}
	}))
}

export function deactivate() {}
