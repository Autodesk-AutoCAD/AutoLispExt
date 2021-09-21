import * as vscode from 'vscode';
import { AutoLispExtPrepareRename, AutoLispExtProvideRenameEdits } from './renameProvider';


export function AutoLispExtProvideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location[]> {
	const initValidator = AutoLispExtPrepareRename(document, position);
	if (!initValidator) {
		return null;
	}
	// The arbitrary '-ANY' addition and the initValidator check should mean the 'context' variable is never null
	const context = AutoLispExtProvideRenameEdits(document, position, `${initValidator.placeholder}-ANY`);
	return convertEditsToLocations(context);
}


function convertEditsToLocations(editContext: vscode.WorkspaceEdit) : Array<vscode.Location> {
	const result: Array<vscode.Location> = [];
	const keys = editContext.entries().map(x => x[0]);
	for (let i = 0; i < keys.length; i++) {
		const uri = keys[i];
		editContext.get(uri).forEach(location => {
			result.push(new vscode.Location(uri, location.range));
		});
	}
	return result;
}
