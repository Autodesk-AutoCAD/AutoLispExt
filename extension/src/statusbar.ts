import * as vscode from 'vscode';
import { isSupportedLispFile } from './platform';
import * as os from 'os';
import { AutoLispExt } from './extension';

export function registerLoadLispButton(context: vscode.ExtensionContext) {
	let lspLoadButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	let title = AutoLispExt.localize("autolispext.loadlisp.title", "Load lisp");
	lspLoadButton.text = "📄" + title;
	lspLoadButton.color = 'white';
	lspLoadButton.tooltip = AutoLispExt.localize("autolispext.loadlisp.tooltip", "Load the Current File");
	lspLoadButton.command = "autolisp.loadActiveFile";
	lspLoadButton.show();
	context.subscriptions.push(vscode.commands.registerCommand("autolisp.loadActiveFile", () => {
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			//execute load progress 
			if (vscode.debug.activeDebugSession !== undefined) {
				vscode.debug.activeDebugSession.customRequest("customLoad", currentLSPDoc);
			} else {
				const message = AutoLispExt.localize("autolispext.loadlisp.attach", "First, attach to or launch a host application before loading this file.");
				vscode.window.showErrorMessage(message);
			}
		} else {
			let platform = os.type();
			if(platform === 'Windows_NT'){
				const message = AutoLispExt.localize("autolispext.loadlisp.fileformat.win", "This file format isn’t supported. Activate a window containing a DCL, LSP, or MNL file.");
				vscode.window.showErrorMessage(message);
			}
			else{
				const message = AutoLispExt.localize("autolispext.loadlisp.fileformat.mac", "This file format isn’t supported. Activate a window containing a DCL or LSP file.");
				vscode.window.showErrorMessage(message);
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