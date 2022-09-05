import * as vscode from 'vscode';
import { AutoLispExt } from '../context';
import { IRootSymbolHost, ISymbolHost, ISymbolReference, SymbolManager } from '../symbols';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { SharedAtomic } from './providerShared';
import { SymbolServices } from '../services/symbolServices';
import { DocumentServices } from '../services/documentServices';
import { getBlockCommentParamNameRange } from "../parsing/comments";
import { ILispFragment } from '../astObjects/ILispFragment';
import { primitiveRegex } from '../astObjects/lispAtom';


export function AutoLispExtPrepareRename(document: vscode.TextDocument, position: vscode.Position): { range: vscode.Range; placeholder: string; } 
{
	const roDoc = AutoLispExt.Documents.getDocument(document);
	let selectedAtom: ILispFragment = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, position);
	if (!selectedAtom){
		return null;
	}
	return { range: selectedAtom.getRange(), placeholder: selectedAtom.symbol };
}


export function AutoLispExtProvideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.WorkspaceEdit
{
	const roDoc = AutoLispExt.Documents.getDocument(document);
	const selectedAtom = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, position);	
	newName = RenameProviderSupport.normalizeUserProvidedValue(newName, selectedAtom.symbol);
	if (!newName) {
		return null;
	}

	const edits = RenameProviderSupport.provideRenameEditsWorker(roDoc, selectedAtom, newName);
	return edits;
}


namespace RenameProviderSupport {

	export function provideRenameEditsWorker(roDoc: ReadonlyDocument, selectedAtom: ILispFragment, newName: string): vscode.WorkspaceEdit|null 
	{
		const docSymbols = SymbolManager.getSymbolMap(roDoc);
		const selectedIndex = selectedAtom.flatIndex;
		const selectedKey = selectedAtom.symbol.toLowerCase();
		const editContext = new vscode.WorkspaceEdit();

		if (SymbolServices.isNative(selectedKey)) {
			editContext.replace(vscode.Uri.file(docSymbols.filePath), selectedAtom.getRange(), newName);
			return editContext;
		}

		const init = getTargetSymbolReference(docSymbols, selectedKey, selectedIndex);
		const parent = init?.findLocalizingParent();
		const possible = DocumentServices.findAllDocumentsWithCustomSymbolKey(selectedKey);
		if (!parent.equal(docSymbols) || !hasGlobalizer(possible, selectedKey)) {
			// has non-root localization and can ONLY effect the active document
			populateEdits(editContext, newName, getRenameTargetsFromParentScope(roDoc, parent, selectedKey));
		} else {
			// find each entry within possible that is not localized
			populateEditsFromDocumentList(editContext, newName, selectedKey, possible);
		}
		return editContext;
	}

	export function normalizeUserProvidedValue(newValue: string, oldValue: string): string|null {
		newValue = newValue.trim();
		if (newValue.length === 0 || newValue === oldValue || !isValidInput(newValue)) {
			return null;
		}
		return newValue;
	}

	export function getTargetSymbolReference(symbolMap: IRootSymbolHost, key: string, index: number): ISymbolReference|null {
		const symbolArray = symbolMap.collectAllSymbols().get(key);
		if (!symbolArray && !Array.isArray(symbolArray)) {
			return null;
		}
		const init = symbolArray.find(p => p.asReference?.flatIndex === index);		
		return init;
	}

	export function populateEditsFromDocumentList(editContext: vscode.WorkspaceEdit, newValue: string, key: string, docs: Array<ReadonlyDocument>): void
	{
		docs.forEach(extDoc => {
			const externalSymbols = SymbolManager.getSymbolMap(extDoc);
			const externalItems = getRenameTargetsFromParentScope(extDoc, externalSymbols, key);
			populateEdits(editContext, newValue, externalItems);
		});
	}

	export function hasGlobalizer(docs: Array<ReadonlyDocument>, key: string): boolean {
		for (let i = 0; i < docs.length; i++) {
			const roDoc = docs[i];
			if(DocumentServices.hasGlobalizedTargetKey(roDoc, key)) {
				return true;
			}
		}
		return false;
	}

	interface ISourceRange {
		range: vscode.Range;
		source: string;
	}

	export function getRenameTargetsFromParentScope(roDoc: ReadonlyDocument, targetScope: ISymbolHost, lowerKey: string): Array<ISourceRange> {
		const flatView = roDoc.documentContainer?.flatten();

		// This handles renaming @Param declarations of Defun documentation
		const commentTargets: Array<ISourceRange> = [];
		if (roDoc.isLSP && targetScope?.hasId) {
			const named = flatView[targetScope.asHost.named.flatIndex];
			named.commentLinks?.forEach(commentIndex => {
				const innerRange = getBlockCommentParamNameRange(flatView[commentIndex], lowerKey);
				if (innerRange) {
					commentTargets.push({ range: innerRange, source: targetScope.filePath });
				}
			});
		}

		const standardTargets = targetScope?.collectAllSymbols().get(lowerKey)?.filter(item => {
			return targetScope.equal(item.parent) || targetScope.equal(item.findLocalizingParent());
		}).map(item => {
			return { range: item.range, source: item.filePath };
		}) ?? [];
		return standardTargets.concat(commentTargets);
	}


	export function isValidInput(userValue: string): boolean {
		const val = userValue.trim();
		return !primitiveRegex.test(val) && !val.includes(' ');
	}


	export function populateEdits(editContext: vscode.WorkspaceEdit, newValue: string, items: Array<ISourceRange>): void {
		items.forEach(item => {
			editContext.replace(vscode.Uri.file(item.source), item.range, newValue);
		});
	}

}


// nothing else in the RenameProviderSupport namespace is expected to be used outside of this file.
// The 'TDD' constant was used to expose the non-exported namespace exclusively for Unit Testing
export const TDD = RenameProviderSupport;
