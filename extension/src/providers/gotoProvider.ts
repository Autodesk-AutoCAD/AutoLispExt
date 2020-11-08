import * as vscode from 'vscode';
import { AutoLispExt } from '../extension';
import { Sexpression } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';

interface LocatedItem {
	line: number;
	column: number;
	fspath: string;
}

export class AutolispDefinitionProvider implements vscode.DefinitionProvider{
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location | vscode.Location[]> {
		const editor: vscode.TextEditor = vscode.window.activeTextEditor;		
		let selected: string =  editor.document.getText(editor.selection);
		if (selected === "") {
			ReadonlyDocument.getMemoryDocument(document).atomsForest.forEach(sexp => {
				if (sexp instanceof Sexpression && sexp.contains(position)){
					const atom = sexp.getAtomFromPos(position);
					if (atom) {
						selected = atom.symbol;
					}		
				}
			});			
		}
		try {
			return this.findGoToLocations(selected);
		} catch (error) {
			return;	// I don't believe this requires a localized error since VSCode has a default "no definition found" response
		}
	} 

	// This was designed around the idea of "preference" for opened and workspace documents
	private findGoToLocations(searchFor: string): vscode.Location[] {
		const locations: vscode.Location[] = [];
		let possible = this.findDefunMatches(searchFor, AutoLispExt.Documents.OpenedDocuments.concat(AutoLispExt.Documents.ProjectDocuments));
		if (possible.length === 0) {
			possible = this.findDefunMatches(searchFor, AutoLispExt.Documents.WorkspaceDocuments);
		}
		possible.forEach(item => {			
			locations.push(new vscode.Location(vscode.Uri.file(item.fspath), new vscode.Position(item.line, item.column)));
		});	
		return locations;
	}

	private findDefunMatches(searchFor: string, searchIn: ReadonlyDocument[]): LocatedItem[] {
		const result: LocatedItem[] = [];
		searchIn.forEach((doc: ReadonlyDocument) => {
			doc.atomsForest.forEach(atom => {
				if (atom instanceof Sexpression){
					const defs = atom.findChildren(/^DEFUN$|^DEFUN-Q$/i, true);
					defs.forEach(sexp => {
						const ptr = sexp.atoms[sexp.nextKeyIndex(sexp.nextKeyIndex(0))];
						if (ptr.symbol.toUpperCase() === searchFor.toUpperCase()){
							result.push({ line: ptr.line, column: ptr.column, fspath: doc.fileName });		
						}
					});
				}
			});
		});
		return result;
	}


	
	
}