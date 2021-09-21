import { ILispFragment } from '../format/sexpression';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import * as vscode from	'vscode';

export namespace SearchPatterns {
	export const LOCALIZES = /^DEFUN$|^DEFUN-Q$|^LAMBDA$/i;
	export const ITERATES = /^FOREACH$|^VLAX-FOR$/i;
	export const ASSIGNS = /^SETQ$/i;
	export const DEFINES = /^DEFUN$|^DEFUN-Q$/i;
	export const ALL = /^DEFUN$|^DEFUN-Q$|^LAMBDA$|^FOREACH$|^VLAX-FOR$|^SETQ$/i;
}


export namespace SharedAtomic {
	export function getNonPrimitiveAtomFromPosition(roDoc: ReadonlyDocument, pos: vscode.Position): ILispFragment {
		const atom = roDoc.documentContainer.getAtomFromPos(pos);
		if (!atom || atom.isPrimitive()) {
			return null;
		}
		return atom;
	}
	
}