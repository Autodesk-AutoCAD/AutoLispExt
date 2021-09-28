import { AutoLispExt } from '../extension';
import { ILispFragment } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { SymbolManager } from '../symbols';



export namespace DocumentServices {

	// DRY Technical Debt
	// 		Subsequent PR's will migrate various 'documents.ts' functions into the DocumentServices
	//		The objective is to trim down that already bloated file, centralize some shared
	//		functionality and create a specific place for extension that doesn't increase bloating.
	export function normalizeFilePath(path: string): string {
		return path.replace(/\\/g, '/');
	}




	export function findAllDocumentsWithCustomSymbolKey(lowerKey: string): Array<ReadonlyDocument> {
		// this array is used to track what has already qualified for the result. This duplication
		// can happen because a document could contextually be "open", in a "PRJ" and in the "workspace"
		const collected = [];
		// this should be very fast since LispContainer constructors now aggrigates foreign symbols
		return AutoLispExt.Documents.OpenedDocuments.filter(roDoc => {
			return testDocumentKeysAndCollectIfUnused(roDoc, lowerKey, collected);
		}).concat(AutoLispExt.Documents.ProjectDocuments.filter(roDoc => {
			return testDocumentKeysAndCollectIfUnused(roDoc, lowerKey, collected);
		})).concat(AutoLispExt.Documents.WorkspaceDocuments.filter(roDoc => {
			return testDocumentKeysAndCollectIfUnused(roDoc, lowerKey, collected);
		}));
	}

	function testDocumentKeysAndCollectIfUnused(roDoc: ReadonlyDocument, lowerKey: string, collected: Array<string>): boolean {
		if (roDoc.documentContainer.body.userSymbols?.has(lowerKey)) {				
			const docKey = normalizeFilePath(roDoc.fileName);
			if (!collected.includes(docKey)) {
				collected.push(docKey);
				return true;
			}
		}
		return false;
	}


	

	export function hasUnverifiedGlobalizers(roDoc: ReadonlyDocument, flatView?: Array<ILispFragment>): boolean {
		flatView = flatView ?? roDoc.documentContainer.flatten();
		const basicSymbolMap = roDoc.documentContainer.userSymbols;
		return hasUnverifiedGlobalizersWorker(flatView, basicSymbolMap);
	}

	function hasUnverifiedGlobalizersWorker(flatView: Array<ILispFragment>, basicMap: Map<string, Array<number>>): boolean {
		const keys = [...basicMap.keys()];
		for (let i = 0; i < keys.length; i++) {
			const indices = basicMap.get(keys[i]);
			for (let j = 0; j < indices.length; j++) {
				const atom = flatView[indices[j]];
				if (atom.hasGlobalFlag) {
					return true;
				}
			}
		}
		return false;
	}


	

	export function hasGlobalizedTargetKey(roDoc: ReadonlyDocument, lowerKey: string, flatView?: Array<ILispFragment>): boolean {
		const flagged = getUnverifiedGlobalizerList(roDoc, lowerKey, flatView);
		if (!flagged || flagged.length === 0) {
			// fails fast because at this point nothing overly expensive has happened
			return false;
		}
		// building a SymbolMap is an expensive operation
		const symbolMap = SymbolManager.getSymbolMap(roDoc, true);
		const aggregate = symbolMap.collectAllSymbols();
		for (let i = 0; i < flagged.length; i++) {
			const iRef = aggregate.get(lowerKey).find(p => p.flatIndex === flagged[i].flatIndex);
			if (iRef?.findLocalizingParent().equal(symbolMap)) {
				return true;
			}
		}
		return false;
	}

	export function getUnverifiedGlobalizerList(roDoc: ReadonlyDocument, lowerKey: string, flatView?: Array<ILispFragment>): Array<ILispFragment> {
		if (!flatView) {
			flatView = roDoc.documentContainer.flatten();
		}
		const rawSymbolMap = roDoc.documentContainer.userSymbols?.get(lowerKey);
		return rawSymbolMap?.filter(p => flatView[p].hasGlobalFlag)?.map(i => flatView[i]);
	}


}

