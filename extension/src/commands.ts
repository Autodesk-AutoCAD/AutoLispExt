import * as vscode from "vscode";
import { AutoLispExt } from './extension';
import { openWebHelp } from './help/openWebHelp';
import { showErrorMessage } from './project/projectCommands';
import { AutolispDefinitionProvider } from './providers/gotoProvider';


export function registerCommands(context: vscode.ExtensionContext){

	// Associated with the right click "Open Online Help" menu item
	context.subscriptions.push(vscode.commands.registerCommand('autolisp.openWebHelp', async () => {
		try {
			await openWebHelp();
		}
		catch (err) {
			if (err){
				let msg = AutoLispExt.localize("autolispext.help.commands.openWebHelp", "Failed to load the webHelpAbstraction.json file");
				showErrorMessage(msg, err);
			}
		}
	}));
	

	// Associated with the right click "Insert Region" menu item
	context.subscriptions.push(vscode.commands.registerCommand("autolisp.insertFoldingRegion", async () => {
		try {
			let commentChar = vscode.window.activeTextEditor.document.fileName.toUpperCase().slice(-4) === ".DCL" ? "//" : ";";
			const snip = new vscode.SnippetString(commentChar + "#region ${1:description}\n${TM_SELECTED_TEXT}\n" + commentChar + "#endregion");
			await vscode.window.activeTextEditor.insertSnippet(snip);
		}
		catch (err) {
			if (err){
				let msg = AutoLispExt.localize("autolispext.commands.addFoldingRegion", "Failed to insert snippet");
				showErrorMessage(msg, err);
			}
		}
	}));


	AutoLispExt.Subscriptions.push(vscode.languages.registerDefinitionProvider([ 'autolisp', 'lisp'], new AutolispDefinitionProvider()));
}