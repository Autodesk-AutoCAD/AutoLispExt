import { AutoLispExt } from '../extension';
import { ILispFragment } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { ISymbolBase } from '../symbols';
import { FlatContainerServices } from './flatContainerServices';


export namespace SymbolServices {

	// These are some basic symbols that may or may not appear in our lookup sources
	// However, their frequency alone makes this pre-check list a performance increase.
	const _commonSymbols = ['+', '-', '/', '*', '<', '>', '<=', '>=', '/='];

	// This list of native keys is used to detect symbols we would not want to track
	const _nativeKeys: Array<string> = [];
	function generateNativeKeys() : void {
		_nativeKeys.push(...new Set(Object.keys(AutoLispExt.Resources.webHelpContainer.functions)
			.concat(Object.keys(AutoLispExt.Resources.webHelpContainer.ambiguousFunctions))
			.concat(Object.keys(AutoLispExt.Resources.webHelpContainer.enumerators))
			.concat(AutoLispExt.Resources.internalLispFuncs)));
		_nativeKeys.sort();
	}
	
	// runs binary search on load-once & sorted constant
	export function isNative(lowerKey: string): boolean {
		if (_nativeKeys.length === 0) {
			generateNativeKeys();
		}
		if (_commonSymbols.includes(lowerKey)) {
			return true;
		}
		let start = 0;
		let end = _nativeKeys.length - 1;
		let result = false;		
		while (start <= end) {
			let middle = Math.floor((start + end) / 2);
			if (_nativeKeys[middle] === lowerKey) {
				result = true;
				break;
			} else if (_nativeKeys[middle] < lowerKey) {
				start = middle + 1;
			} else {
				end = middle - 1;
			}
		}
		return result;
	}

	

	export function hasGlobalFlag(source: ReadonlyDocument|Array<ILispFragment>, symbolRef: ISymbolBase): boolean {
		source = Array.isArray(source) ? source : source.documentContainer.flatten();
		const thisAtom = source[symbolRef?.asReference?.flatIndex ?? -1];
		if (!thisAtom 
			|| symbolRef.asHost 
			|| source[symbolRef.asReference.flatIndex-1]?.isLeftParen() !== false) {
			return false;
		}

		if (symbolRef.asReference.isDefinition) {
			return FlatContainerServices.verifyAtomIsDefunAndGlobalized(source, thisAtom);
		} else {
			return FlatContainerServices.verifyAtomIsSetqAndGlobalized(source, thisAtom);
		}
	}
	

}


