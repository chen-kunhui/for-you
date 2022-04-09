import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
	

	console.log('Congratulations, your extension "for-you" is now active!');

	let disposable = vscode.commands.registerCommand('for-you.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from for you!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
