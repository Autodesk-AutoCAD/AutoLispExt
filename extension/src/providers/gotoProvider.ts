import { utils } from 'mocha';
import * as vscode from 'vscode';
import { AutoLispExt } from '../extension';
import { Sexpression } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { escapeRegExp } from "../utils";


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
						selected = atom.symbol.replace(/^[']*/, '');
					}
				}
			});
		}
		if (['(', ')', '\'', '.'].includes(selected)){
			return;
		}
		try {
			// This has a "preference" for opened and project documents for actual definitions, but will only handle variables on the opened document.
			const locations: vscode.Location[] = [];
			const parentContainer = rDoc.atomsForest.find(p => p instanceof Sexpression && p.contains(position)) as Sexpression;
			const innerContainer = parentContainer?.getSexpressionFromPos(position);
			const possibleDefun = innerContainer ? parentContainer.getParentOfSexpression(innerContainer) : null;
			const firstChild = innerContainer?.getNthKeyAtom(0);
			const altFirstChild = parentContainer?.getNthKeyAtom(0);

			let isFunction = false;
			if (firstChild && !(firstChild instanceof Sexpression) && selected === firstChild.symbol) {
				isFunction = true; // most likely a function
			} else if (altFirstChild && selected === altFirstChild.symbol) {
				isFunction = true; // added to capture document root level function calls
			}
			if (isFunction && possibleDefun && /^DEFUN$|^DEFUN-Q$|^LAMBDA$/i.test(possibleDefun.getNthKeyAtom(0).symbol)) {
				const symbolType = possibleDefun.getNthKeyAtom(0).symbol;
				const varHeader = possibleDefun.getNthKeyAtom(symbolType.toUpperCase() === 'LAMBDA' ? 1 : 2);
				if (innerContainer.line === varHeader.line && innerContainer.column === varHeader.column){
					isFunction = false; // course correct for the first argument in a variable header being interpreted as a function call
				}
			}


			// This condition determines the likelyhood of this being a function definition request or (else) a variable definition request
			if (isFunction) {
				let possible = this.findDefunMatches(selected, AutoLispExt.Documents.OpenedDocuments.concat(AutoLispExt.Documents.ProjectDocuments));
				if (possible.length === 0) {
					possible = this.findDefunMatches(selected, AutoLispExt.Documents.WorkspaceDocuments);
				}
				possible.forEach(item => {
					locations.push(item);
				});
			} else if (parentContainer) {
				this.findFirstVariableMatch(rDoc, position, selected, parentContainer).forEach(item => {
					locations.push(item);
				});
			}
			return locations;
		} catch (error) {
			return;	// I don't believe this requires a localized error since VSCode has a default "no definition found" response
		}
	}

	
	private findFirstVariableMatch(doc: ReadonlyDocument, start: vscode.Position, searchFor: string, searchIn: Sexpression): vscode.Location[] {
		const result: vscode.Location[] = [];
		const ucName = searchFor.toUpperCase();
		let context = searchIn.getSexpressionFromPos(start);
		let flag = true;
		do {
			const parent = searchIn.getParentOfSexpression(context);
			const atom = parent?.getNthKeyAtom(0);
			if (atom && /^DEFUN$|^DEFUN-Q|^LAMBDA$/i.test(atom.symbol)) {
				let headers = parent.getNthKeyAtom(1);
				if (headers?.symbol.toUpperCase() === ucName){ // adds defun names to possible result. Especially useful for quoted function names.
					result.push(new vscode.Location(vscode.Uri.file(doc.fileName), new vscode.Position(headers.line, headers.column)));
				}
				if (!(headers instanceof Sexpression)){
					headers = parent.getNthKeyAtom(2);
				}
				if (headers instanceof Sexpression){
					const found = headers.atoms.find(p => p.symbol.toUpperCase() === ucName);
					if (found) {
						result.push(new vscode.Location(vscode.Uri.file(doc.fileName), new vscode.Position(found.line, found.column)));
					}
				}
			} else if (atom && /^FOREACH$|^VLAX-FOR$/i.test(atom.symbol)) {
				const tmpVar = parent.getNthKeyAtom(1);
				if (!(tmpVar instanceof Sexpression) && tmpVar.symbol.toUpperCase() === ucName){
					result.push(new vscode.Location(vscode.Uri.file(doc.fileName), new vscode.Position(tmpVar.line, tmpVar.column)));
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
						result.push(new vscode.Location(vscode.Uri.file(doc.fileName), new vscode.Position(atom.line, atom.column)));
					}
					cIndex = setq.nextKeyIndex(cIndex);
					isVar = !isVar;
				} while (cIndex && cIndex > -1);
			});
		}
		return result;
	}

	private findDefunMatches(searchFor: string, searchIn: ReadonlyDocument[]): vscode.Location[] {
		const result: vscode.Location[] = [];
		const regx = new RegExp('\\((DEFUN|DEFUN-Q)' + escapeRegExp(searchFor) + '\\(', 'ig');
		searchIn.forEach((doc: ReadonlyDocument) => {
			if (regx.test(doc.fileContent.replace(/\s/g, ''))){
				doc.atomsForest.forEach(atom => {
					if (atom instanceof Sexpression){
						const defs = atom.findChildren(/^DEFUN$|^DEFUN-Q$/i, true);
						defs.forEach(sexp => {
							const ptr = sexp.getNthKeyAtom(2);
							if (ptr.symbol.toUpperCase() === searchFor.toUpperCase()){
								result.push(new vscode.Location(vscode.Uri.file(doc.fileName), new vscode.Position(ptr.line, ptr.column)));
							}
						});
					}
				});
			}
		});
		return result;
	}

}