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
		const rDoc = ReadonlyDocument.getMemoryDocument(document);
		let selected: string =  editor.document.getText(editor.selection);
		if (selected === '') {			
			rDoc.atomsForest.forEach(sexp => {
				if (sexp instanceof Sexpression && sexp.contains(position)){
					const atom = sexp.getAtomFromPos(position);
					if (atom) {
						selected = atom.symbol;
					}		
				}
			});			
		}
		try {
			// This has a "preference" for opened and project documents for actual definitions, but will only handle variables on the opened document.
			const locations: vscode.Location[] = [];
			const parentContainer = rDoc.atomsForest.find(p => p instanceof Sexpression && p.contains(position)) as Sexpression;
			const innerContainer = parentContainer?.getSexpressionFromPos(position);
			const firstChild = innerContainer?.atoms[innerContainer.nextKeyIndex(0)];
			// This condition determines the likelyhood of this being a function definition request or (else) a variable definition request
			if (firstChild && !(firstChild instanceof Sexpression) && selected === firstChild.symbol) {
				let possible = this.findDefunMatches(selected, AutoLispExt.Documents.OpenedDocuments.concat(AutoLispExt.Documents.ProjectDocuments));
				if (possible.length === 0) {
					possible = this.findDefunMatches(selected, AutoLispExt.Documents.WorkspaceDocuments);
				}
				possible.forEach(item => {
					locations.push(new vscode.Location(vscode.Uri.file(item.fspath), new vscode.Position(item.line, item.column)));
				});	
			} else {				
				this.findFirstVariableMatch(rDoc, position, selected, parentContainer).forEach(item => {
					locations.push(new vscode.Location(vscode.Uri.file(item.fspath), new vscode.Position(item.line, item.column)));
				});
			}
			return locations;
		} catch (error) {
			return;	// I don't believe this requires a localized error since VSCode has a default "no definition found" response
		}
	} 

	
	private findFirstVariableMatch(doc: ReadonlyDocument, start: vscode.Position, searchFor: string, searchIn: Sexpression): LocatedItem[] {
		const result: LocatedItem[] = [];
		const ucName = searchFor.toUpperCase();
		let context = searchIn.getSexpressionFromPos(start);
		let flag = true;
		do {
			const parent = searchIn.getParentOfSexpression(context);
			const first = parent?.nextKeyIndex(0);
			const atom = parent?.atoms[first];			
			if (atom && /^DEFUN$|^DEFUN-Q|^LAMBDA$/i.test(atom.symbol)) {
				let index = atom.symbol.toUpperCase() === 'LAMBDA' ? parent.nextKeyIndex(first) : parent.nextKeyIndex(parent.nextKeyIndex(first));
				const headers = parent.atoms[index];
				if (headers instanceof Sexpression){
					const found = headers?.atoms.find(p => p.symbol.toUpperCase() === ucName);
					if (found) {
						result.push({ line: found.line, column: found.column, fspath: doc.fileName });
					}
				}
			} else if (atom && /^FOREACH$|^VLAX-FOR$/i.test(atom.symbol)) {
				const anon = parent.atoms[parent.nextKeyIndex(first)];
				if (!(anon instanceof Sexpression) && anon.symbol.toUpperCase() === ucName){
					result.push({ line: anon.line, column: anon.column, fspath: doc.fileName });
				}
			}
			if (!parent || result.length > 0){
				flag = false;
			} else {
				context = parent;
			}
		} while (flag);		
		// If we still haven't found anything check the 1st occurrence of setq's. This will find globals setqs and nested ones possibly inside other defuns
		if (result.length === 0){
			doc.findExpressions(/^SETQ$/i).forEach(setq => {
				let isVar = false;
				let cIndex = setq.nextKeyIndex(0);
				do {
					const atom = setq.atoms[cIndex];
					if (isVar && atom?.symbol.toUpperCase() === ucName) {
						result.push({ line: atom.line, column: atom.column, fspath: doc.fileName});
					}
					cIndex = setq.nextKeyIndex(cIndex);
					isVar = !isVar;
				} while (cIndex && cIndex > -1);
			});
		}
		return result;
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