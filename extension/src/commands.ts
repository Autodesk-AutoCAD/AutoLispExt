import * as vscode from "vscode";
import * as nls from 'vscode-nls';
import { AutoLispExt } from './extension';
import { LispContainer } from './format/sexpression';
import { openWebHelp } from './help/openWebHelp';
import { generateDocumentationSnippet, getDefunArguments, getDefunAtPosition } from './help/userDocumentation';
import { showErrorMessage } from './project/projectCommands';
import { AutolispDefinitionProvider } from './providers/gotoProvider';
import * as shared from './providers/providerShared';

const localize = nls.loadMessageBundle();

export function registerCommands(context: vscode.ExtensionContext){

	// Associated with the right click "Open Online Help" menu item
	context.subscriptions.push(vscode.commands.registerCommand('autolisp.openWebHelp', async () => {
		try {
			await openWebHelp();
		}
		catch (err) {
			if (err){
				let msg = localize("autolispext.help.commands.openWebHelp", "Failed to load the webHelpAbstraction.json file");
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
				let msg = localize("autolispext.commands.addFoldingRegion", "Failed to insert snippet");
				showErrorMessage(msg, err);
			}
		}
	}));


	// Associated with the right click "Generate Documentation" menu item
	context.subscriptions.push(vscode.commands.registerCommand('autolisp.generateDocumentation', async () => {
		try {
			const pos = vscode.window.activeTextEditor.selection.start;
			const vsDoc = vscode.window.activeTextEditor.document;
			const lf = vsDoc.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
			const doc = AutoLispExt.Documents.getDocument(vsDoc);
			
			// find the root LispContainer of the current cursor position
			const exp = doc.atomsForest.find(p => p.contains(pos));

			// Locate the Defun to decorate
			const def = await getDefunAtPosition(exp, pos);

			// extract the Defun arguments for @Param documentation
			const args =  getDefunArguments(def);
			
			// generate a dynamic snippet multi-line comment to represent the defun and its arguments
			const snip = generateDocumentationSnippet(lf, args);

			vscode.window.activeTextEditor.insertSnippet(snip, def.getRange().start);
		}
		catch (err) {
			if (err) {
				let msg = localize("autolispext.help.commands.generateDocumentation", "A valid defun name could not be located");
				showErrorMessage(msg, err);
			}
		}
	}));

	AutoLispExt.Subscriptions.push(vscode.languages.registerDefinitionProvider([ 'autolisp', 'lisp'], new AutolispDefinitionProvider()));
}