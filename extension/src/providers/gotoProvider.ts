import { utils } from 'mocha';
import * as vscode from 'vscode';
import { AutoLispExt } from '../extension';
import { Sexpression } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { escapeRegExp } from "../utils";
import { SearchPatterns, SearchHandlers } from './providerShared';

export class AutolispDefinitionProvider implements vscode.DefinitionProvider{
	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Location | vscode.Location[]> {
		const rDoc = AutoLispExt.Documents.getDocument(document);
		let selected = '';
		rDoc.atomsForest.forEach(sexp => {
			if (sexp instanceof Sexpression && sexp.contains(position)){
				const atom = sexp.getAtomFromPos(position);
				if (atom && !atom.isComment()) {
					selected = atom.symbol.replace(/^[']*/, '');
				}
			}
		});
		if (selected === '' || ['(', ')', '\'', '.', ';'].includes(selected)){
			return;
		}
		try {
			// determine scope
			const {isFunction, parentContainer} = SearchHandlers.getSelectionScopeOfWork(rDoc, position, selected);
			const locations: vscode.Location[] = [];
			if (isFunction) {
				// This has a "preference" for opened and project documents for actual definitions, but will only handle variables on the opened document.
				let possible = this.findDefunMatches(selected, [AutoLispExt.Documents.ActiveDocument]);
				if (possible.length === 0) {
					possible = this.findDefunMatches(selected, AutoLispExt.Documents.OpenedDocuments.concat(AutoLispExt.Documents.ProjectDocuments));
				}
				if (possible.length === 0) {
					possible = this.findDefunMatches(selected, AutoLispExt.Documents.WorkspaceDocuments);
				}
				possible.forEach(item => {
					locations.push(item);
				});
			} else if (parentContainer) { // Most likely a variable, but ultimately the scope of work is now only in the active document.
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
			if (atom && SearchPatterns.LOCALIZES.test(atom.symbol)) {
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
			} else if (atom && SearchPatterns.ITERATES.test(atom.symbol)) {
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
			this.findInSetqs(doc, ucName).forEach(x => { result.push(x); });
		}
		return result;
	}

	private findInSetqs(doc: ReadonlyDocument, ucName: string): vscode.Location[] {
		const result: vscode.Location[] = [];
		doc.findExpressions(SearchPatterns.ASSIGNS).forEach(setq => {
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
		return result;
	}

	private findDefunMatches(searchFor: string, searchIn: ReadonlyDocument[]): vscode.Location[] {
		const result: vscode.Location[] = [];
		const regx = new RegExp('\\((DEFUN|DEFUN-Q)' + escapeRegExp(searchFor) + '\\(', 'ig');
		searchIn.forEach((doc: ReadonlyDocument) => {
			if (regx.test(doc.fileContent.replace(/\s/g, ''))){
				doc.atomsForest.forEach(atom => {
					if (atom instanceof Sexpression){
						const defs = atom.findChildren(SearchPatterns.DEFINES, true);
						defs.forEach(sexp => {
							const ptr = sexp.getNthKeyAtom(1);
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