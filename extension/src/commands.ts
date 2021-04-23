import * as vscode from "vscode";
import * as nls from 'vscode-nls';
import { AutoLispExt } from './extension';
import { LispContainer } from './format/sexpression';
import { openWebHelp } from './help/openWebHelp';
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
			const doc = AutoLispExt.Documents.getDocument(vscode.window.activeTextEditor.document);
			const exp = doc.atomsForest.find(p => p.contains(pos));

			// Locate all the Defun & Defun-Q statements or an empty array if no actionable scope was found
			let defs = exp?.body?.findChildren(shared.SearchPatterns.DEFINES, true).filter(p => p.contains(pos)) ?? [];
			if (defs.length === 0) {
				return;
			}
			if (defs.length > 1) {
				// if this was performed within a nested defun, then the user has to select which defun to document
				const quickPicks = defs.map(d => d.getNthKeyAtom(1).symbol);
				let outResult = '';
				await vscode.window.showQuickPick(quickPicks).then(response => { outResult = response; });
				defs = defs.filter(d => d.getNthKeyAtom(1).symbol === outResult);
			}			
			// Now we know what defun we are documenting, so we extract arguments; if applicable
			const def = defs[0];
			let args = def.atoms.find(p => p instanceof LispContainer).body?.atoms.filter(a => !a.isComment()) ?? [];
			const dividerIndex = args.findIndex(a => a.symbol === '/');
			if (dividerIndex === -1 && args.length > 2) {
				args = args.slice(1, args.length - 1);
			} else if (dividerIndex === -1) {
				args = [];
			} else {
				args = args.slice(1, dividerIndex);
			}

			// generate a dynamic snippet multi-line comment to represent the defun and its arguments
			const lf = vscode.window.activeTextEditor.document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
			const defPos = def.getRange().start;
			let count = 1;
			let insert = `${lf};|${lf}  $` + `{${count++}:description}${lf}`;
			args.forEach(a => {
				insert += `  @Param ${a.symbol} $` + `{${count++}:?}${lf}`;
			});
			insert += '  @Returns ${' + `${count}:type?}${lf}|;${lf}`;
			const snip = new vscode.SnippetString(insert);
			vscode.window.activeTextEditor.insertSnippet(snip, defPos);
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