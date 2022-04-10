import * as vscode from 'vscode';
import { CSVEditorProvider } from './providers/csvEditorProvider';


export function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage("你好，加油~")
	context.subscriptions.push(CSVEditorProvider.register(context));
}

export function deactivate() {}
