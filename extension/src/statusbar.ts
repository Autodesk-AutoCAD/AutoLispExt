import * as vscode from 'vscode';
import { isSupportedLispFile } from './platform';
import * as os from 'os';

export function registerLoadLispButton(context: vscode.ExtensionContext) {
	let lspLoadButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	lspLoadButton.text = "📄Load lisp";
	lspLoadButton.color = 'white';
	lspLoadButton.tooltip = "Load the Current File";
	lspLoadButton.command = "extension.loadCurrentLisp";
	lspLoadButton.show();
	context.subscriptions.push(vscode.commands.registerCommand("extension.loadCurrentLisp", () => {
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			//execute load progress 
			if (vscode.debug.activeDebugSession !== undefined) {
				vscode.debug.activeDebugSession.customRequest("customLoad", currentLSPDoc);
			} else {
				vscode.window.showErrorMessage("First, attach to or launch a host application before loading this file.");
			}
		} else {
			let platform = os.type();
			if(platform === 'Windows_NT'){
				vscode.window.showErrorMessage("This file format isn’t supported. Activate a window containing a DCL, LSP, or MNL file.");
			}
			else{
				vscode.window.showErrorMessage("This file format isn’t supported. Activate a window containing a DCL or LSP file.");
			}	
		}
	}));
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			lspLoadButton.show();
		} else {
			lspLoadButton.hide();
		}
	}));
}