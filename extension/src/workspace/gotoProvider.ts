import * as vscode from 'vscode';
import * as utils from '../utils';
import { workspaceDocuments, activeDocuments } from "./workspaceInit";


export class AutolispGoToProvider implements vscode.DefinitionProvider{
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location | vscode.Location[]> {
		const editor: vscode.TextEditor = vscode.window.activeTextEditor;
		let selected: string = editor.document.getText(editor.selection);	
		// I tried using this 'addSelectionToNextFindMatch' trick, but it somehow not firing in time to trigger the event		
		//			if (selected === "") {
		//				await vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch');
		//				selected = editor.document.getText(editor.selection);
		//			}
		// Settled on using a regex with a wide net and didn't use any (obvious) i18 vialoation characters 
		if (selected === "") {
			selected = editor.document.getText(editor.document.getWordRangeAtPosition(position, /\(\s*[\w\d\:\_\&\$\*\>\-]{1,99}/)).slice(1).trim();
		}
		return findGoToLocation(selected);
	}
}


function findGoToLocation(searchFor: string): Promise<vscode.Location | vscode.Location[]> {
	let kwRegex: RegExp = new RegExp("\\(\\s*(DEFUN|DEFUN-Q)\\s+" + utils.escapeRegExp(searchFor.toUpperCase()) + "(\\s|\\(|;)", "gi");
	let found: Map<string, vscode.Position> = new Map();
	// Try to find the definition in the currently opened documents
	activeDocuments.forEach(doc =>{
		for (let lnum = 0; lnum < doc.lineCount; lnum++) {
			const line: vscode.TextLine = doc.lineAt(lnum);
			const value: string = line.text.toUpperCase();
			if (value.search(kwRegex) !== -1 && !found.has(doc.fileName)){
				found.set(doc.fileName, new vscode.Position(lnum, value.search(kwRegex)));
			}
		}			
	});
	let keys: string[] = [...found.keys()];

	// Only-If a definition was not found in the currently opened documents will it check the in-memory workspace document set
	if (keys.length === 0){
		workspaceDocuments.forEach(doc =>{
			for (let lnum = 0; lnum < doc.lineCount; lnum++) {
				const line: vscode.TextLine = doc.lineAt(lnum);
				const value: string = line.text.toUpperCase();
				if (value.search(kwRegex) !== -1 && !found.has(doc.fileName)){
					found.set(doc.fileName, new vscode.Position(lnum, value.search(kwRegex)));
				}
			}
		});
	}

	// return the possible definitions
	keys = [...found.keys()];
	if (keys.length >= 1) {		
		const locations: vscode.Location[] = [];		
		keys.forEach(k =>{
			locations.push(new vscode.Location(vscode.Uri.file(k), found.get(k)));
		});
		return new Promise(resolve =>{ resolve(locations); });			
	} else {
		return;
	}
}
