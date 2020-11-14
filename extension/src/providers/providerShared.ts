import { Sexpression } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import * as vscode from	'vscode';

export namespace SearchPatterns {
	export const LOCALIZES = /^DEFUN$|^DEFUN-Q$|^LAMBDA$/i;
	export const ITERATES = /^FOREACH$|^VLAX-FOR$/i;
	export const ASSIGNS = /^SETQ$/i;
	export const DEFINES = /^DEFUN$|^DEFUN-Q$/i;
	export const ALL = /^DEFUN$|^DEFUN-Q$|^LAMBDA$|^FOREACH$|^VLAX-FOR$|^SETQ$/i;
}


export namespace SearchHandlers {


	export function getSelectionScopeOfWork(doc: ReadonlyDocument, position: vscode.Position, selected: string): {isFunction: boolean, parentContainer: Sexpression} {
		const parentContainer = doc.atomsForest.find(p => p instanceof Sexpression && p.contains(position)) as Sexpression;
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

		if (isFunction && possibleDefun && SearchPatterns.LOCALIZES.test(possibleDefun.getNthKeyAtom(0).symbol)) {
			const symbolType = possibleDefun.getNthKeyAtom(0).symbol;
			const varHeader = possibleDefun.getNthKeyAtom(symbolType.toUpperCase() === 'LAMBDA' ? 1 : 2);
			if (varHeader.equal(innerContainer)) {
				isFunction = false; // course correct for the first argument in a variable header being interpreted as a function call
			}
		}
		return {isFunction, parentContainer};
	}
}