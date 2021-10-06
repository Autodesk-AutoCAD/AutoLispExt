import * as vscode from 'vscode';
import { AutoLispExt } from '../extension';
import { ILispFragment } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { DocumentServices } from '../services/documentServices';
import { FlatContainerServices } from '../services/flatContainerServices';
import { SymbolServices } from '../services/symbolServices';
import { ISymbolHost, ISymbolReference, IRootSymbolHost, SymbolManager } from '../symbols';
import { SharedAtomic } from './providerShared';


export function AutoLispExtProvideDefinition(document: vscode.TextDocument|ReadonlyDocument, position: vscode.Position) : vscode.Location[] {
	const roDoc = document instanceof ReadonlyDocument ? document : AutoLispExt.Documents.getDocument(document);
	let selectedAtom = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, position);
	if (!selectedAtom || SymbolServices.isNative(selectedAtom.symbol.toLowerCase())){
		return null;
	}
	const result = GotoProviderSupport.getDefinitionLocations(roDoc, selectedAtom);
	if (result.length === 1 && result[0].range.contains(position)) {
		return null;
	} else {
		return result;
	}
}



// Namespace is intentionally not exported. Nothing in here is expected to be used beyond this file.
namespace GotoProviderSupport {

	interface IDocumentAtomContext {
		atom: ILispFragment;
		symbolKey: string;
		symbolRefs: Array<ISymbolReference>;
		flatView: Array<ILispFragment>;
		reference: ISymbolReference;
		symbolMap: IRootSymbolHost;
		parent: ISymbolHost;
		isFuncLike: boolean;
	}

	export function getDefinitionLocations (roDoc: ReadonlyDocument, atom: ILispFragment) : Array<vscode.Location> {
		const context = getAtomDocumentContext(roDoc, atom);

		if (!context.parent.equal(context.symbolMap)) {
			// A localized symbol cannot have external scope, go directly to 1st parent (localization) reference
			return [convertReferenceToLocation(context.parent.collectAllSymbols().get(context.symbolKey)[0])];
		}
		
		const scope = getAllMatchingVerifiedGlobalReferences(context.symbolKey);
		if (scope.length > 0) {
			// return globalized reference, we don't care if its in an opened, project or workspace context
			// not obvious, but this path doesn't care if its a variable or function; exported ids just win...
			return scope.map(iRef => convertReferenceToLocation(iRef));
		}
		
		return context.isFuncLike ? processAsFunctionReference(context) : processAsVariableReference(context);
	}

	export function processAsFunctionReference(context: IDocumentAtomContext) : Array<vscode.Location> {
		// this previously prioritized different categories, but now just finds everything in the opened, project & workspace
		// also note that there is no special handling for already being on a function DEFUN, it always finds all variants
		const results: Array<vscode.Location> = [];
		DocumentServices.findAllDocumentsWithCustomSymbolKey(context.symbolKey).forEach(roDoc => {
			// hunting for non-globalized defuns, go ahead and build their IdocumentAtomContext
			// IF you can't get the IsDefun from the document container symbol information.... <- Investigate
			const flatView = roDoc.documentContainer.flatten();
			const possible = roDoc.documentContainer.userSymbols.get(context.symbolKey);
			let subContext: IDocumentAtomContext = null;
			for (let i = 0; i < possible.length; i++) {
				const possibleIndex = possible[i];
				if (!FlatContainerServices.getParentAtomIfDefun(flatView, possibleIndex)) {
					continue;
				}
				if (!subContext) {
					// this has some performance impacts so we only want to pull it once per document
					subContext = getAtomDocumentContext(roDoc, flatView[possibleIndex], flatView);
				}
				const iRef = subContext.symbolRefs.find(x => x.flatIndex === possibleIndex);
				if (iRef.isDefinition && iRef.findLocalizingParent().equal(subContext.symbolMap)) {
					// IReference is a named Defun[-q] and does not have a localization parent
					results.push(convertReferenceToLocation(iRef));
				}
			}
		});
		return results;
	}

	export function processAsVariableReference(context: IDocumentAtomContext) : Array<vscode.Location> {
		// localized and exported globals scenarios were already handled
		// This just deals the active document globals by walking up setq locations
		const existing = context.symbolMap.collectAllSymbols().get(context.symbolKey);
		const activeIndex = existing.indexOf(context.reference);
		for (let i = activeIndex - 1; i >= 0; i--) {
			const iRef = existing[i];
			if (FlatContainerServices.getParentAtomIfValidSetq(context.flatView, context.flatView[iRef.flatIndex])) {
				return [convertReferenceToLocation(iRef)];
			}
		}
		// if no better occurrence found, then just regurgitate the starting location
		return [convertReferenceToLocation(context.reference)];	
	}


	export function convertReferenceToLocation(iRef: ISymbolReference) : vscode.Location {
		const filePointer = vscode.Uri.file(iRef.filePath);
		return new vscode.Location(filePointer, iRef.range);
	}

	
	export function getAtomDocumentContext(roDoc: ReadonlyDocument, selected: ILispFragment, linearView?: Array<ILispFragment>) : IDocumentAtomContext {
		const key = selected.symbol.toLowerCase();
		const map = SymbolManager.getSymbolMap(roDoc);
		const pointers = map.collectAllSymbols().get(key);
		const reference = pointers.find(item => item.flatIndex === selected.flatIndex);
		if (!linearView) {
			linearView = roDoc.documentContainer.flatten();
		}
		return {
			atom: selected,
			flatView: linearView,
			parent: reference.findLocalizingParent(),
			symbolKey: key,
			symbolMap: map,
			symbolRefs: pointers,
			reference: reference,
			isFuncLike: FlatContainerServices.isPossibleFunctionReference(linearView, selected)
		};
	}

	export function getAllMatchingVerifiedGlobalReferences(lowerKey: string): Array<ISymbolReference> {
		const documentReferences = DocumentServices.findAllDocumentsWithCustomSymbolKey(lowerKey);
		const result: Array<ISymbolReference> = [];
		for (let i = 0; i < documentReferences.length; i++) {
			const roDoc = documentReferences[i];
			const flatView = roDoc.documentContainer.flatten();
			const possible = DocumentServices.getUnverifiedGlobalizerList(roDoc, lowerKey, flatView);
			if (possible.length === 0) {
				continue;
			}
			
			const symbolMap = SymbolManager.getSymbolMap(roDoc);
			const targets = symbolMap.collectAllSymbols().get(lowerKey);
			possible.forEach(atom => {
				const iRef = targets.find(x => x.flatIndex === atom.flatIndex);
				if (iRef?.findLocalizingParent().equal(symbolMap)) {
					result.push(iRef);
				}
			});
		}
		return result;
	}

}

/**
 * This exports the GotoProviderSupport Namespace specifically for testing, these resources are not meant for interoperability.
 */
export const TDD = GotoProviderSupport;