import { StringEqualsIgnoreCase } from '../utils';
import { ILispFragment } from '../astObjects/ILispFragment';
import { LispAtom } from '../astObjects/lispAtom';



export namespace FlatContainerServices {

	export function isPossibleFunctionReference(atoms: Array<ILispFragment>, from: ILispFragment): boolean {
		const previous = lookBehindForPreviousNonCommentAtom(atoms, from);
		if (!previous || from.isPrimitive()) {
			return false;
		}
		if (previous.symbol === '(') {
			// this final test avoid the dynamic list constructor false positive
			return atoms[from.flatIndex - 1]?.symbol !== '\'';
		}
		return /^(\'|DEFUN|DEFUN-Q)$/i.test(previous.symbol);
	}

	export function getParentAtomIfValidSetq(atoms: Array<ILispFragment>, from: ILispFragment|number): ILispFragment {
		const index = typeof from === 'number' ? from : from.flatIndex;
		const parentAtom = getParentRootAtomIfOfType(atoms, index, 'setq');
		if (!parentAtom || !isValidSetqContext(atoms, index)) {
			return null;
		}
		return parentAtom;
	}

	export function verifyAtomIsSetqAndGlobalized(atoms: Array<ILispFragment>, from: ILispFragment|number): boolean {
		const [index, atom] = typeof from === 'number' ? [from, atoms[from]] : [from.flatIndex, from];
		const parentAtom = getParentAtomIfValidSetq(atoms, index);
		return !parentAtom ? false : hasGlobalizationContext(atom, parentAtom, atoms);
	}

	export function getParentAtomIfDefun(atoms: Array<ILispFragment>, from: ILispFragment|number): ILispFragment {
		const index = typeof from === 'number' ? from : from.flatIndex;
		const parentAtom = getParentRootAtomIfOfType(atoms, index, 'defun', 'defun-q');
		if (!parentAtom) {
			return null;
		}
		return parentAtom;
	}

	export function verifyAtomIsDefunAndGlobalized(atoms: Array<ILispFragment>, from: ILispFragment): boolean {
		const parentAtom = getParentAtomIfDefun(atoms, from);
		if (!parentAtom) {
			return false;
		}

		// This check was added because non-localized variables within defuns used as the
		// return value was getting artificially flagged by the defun comments as @Global
		const next = lookAheadForNextNonCommentAtom(atoms, parentAtom.flatIndex);
		if (next.flatIndex !== from.flatIndex) {
			return false;
		}

		return hasGlobalizationContext(from, parentAtom, atoms);
	}




	function getParentRootAtomIfOfType(atoms: Array<ILispFragment>, fromIndex: number, ...rootTypes: Array<string>): ILispFragment|null {
		const parentAtom = lookBehindForParentRootAtom(atoms, fromIndex);
		const name = parentAtom?.symbol ?? '';
		if (rootTypes.some(p => StringEqualsIgnoreCase(name, p))) {
			return parentAtom;
		}
		return null;
	}


	function lookBehindForParentRootAtom(atoms: Array<ILispFragment>, fromIndex: number): ILispFragment|null {
		const initAtom = atoms[fromIndex];
		const parentParenAtom = lookBehindForParentParenthesisAtom(atoms, initAtom.flatIndex);
		if (parentParenAtom === null) {
			return null;
		}
		return lookAheadForNextNonCommentAtom(atoms, parentParenAtom.flatIndex);
	}


	function lookAheadForNextNonCommentAtom(atoms: Array<ILispFragment>, fromIndex: number): ILispFragment {
		for (let i = fromIndex + 1; i < atoms.length; i++) {
			const atom = atoms[i];
			if (!atom.isComment()) {
				return atom;
			}
		}
		return null;
	}

	function lookBehindForPreviousNonCommentAtom(atoms: Array<ILispFragment>, from: ILispFragment): ILispFragment {
		for (let i = from.flatIndex - 1; i >= 0; i--) {
			const atom = atoms[i];
			if (!atom.isComment()) {
				return atom;
			} 
		}
		return null;
	}

	
	// Logic Pattern:
	//		every variable declaration must have a setq preceding it
	//		OR
	//		the previous atom should be an assignment ending with some kind of primitive value type
	//			Note: (, ), strings, numbers, nil and t are all primitives
	//
	// Technical Debt:
	// 		The only known situation where this could fail is setting a variable using only another variable
	//		Which is considered to be a bad practice for use with an explicitly exported @Global system
	function isValidSetqContext(atoms: Array<ILispFragment>, from: ILispFragment|number): boolean {
		const previous = atoms[(typeof from === 'number' ? from : from.flatIndex) - 1];
		return previous instanceof LispAtom
			   && previous.symbol !== '\''
			   && (previous.isPrimitive() || StringEqualsIgnoreCase(previous.symbol, 'setq'));
	}


	const GlobalFlag = '@GLOBAL';
	function hasGlobalizationContext(source: ILispFragment, parent: ILispFragment, atoms: Array<ILispFragment>): boolean {
		const aheadComment = lookAheadForInlineComment(atoms, source.flatIndex);
		const blockComment = lookBehindForBlockComment(atoms, parent.flatIndex);
		if (aheadComment || blockComment) {
			// saves pointers to the located comments for later use with AutoCompletion & @Param Renaming
			source.commentLinks = aheadComment && blockComment
										? [aheadComment.flatIndex, blockComment.flatIndex]
										: aheadComment 
										? [aheadComment.flatIndex]
										: [blockComment.flatIndex];
		}
		// requires explicit conversion because it could be comparing one or more booleans or nulls
		return Boolean(aheadComment?.symbol.toUpperCase().includes(GlobalFlag)
		            || blockComment?.symbol.toUpperCase().includes(GlobalFlag));
	}

	// This is no longer used, but could be useful in the future
	// export function hasEmbededGlobalComment(atoms: Array<ILispFragment>, source: ILispFragment): boolean {
	// 	let result = false;
	// 	source.commentLinks?.forEach(index => {
	// 		const atom = atoms[index];
	// 		if (atom.symbol.toUpperCase().includes(GlobalFlag)) {
	// 			result = true;
	// 		}
	// 	});
	// 	return result;
	// }

	function lookBehindForBlockComment(atoms: Array<ILispFragment>, fromIndex: number): ILispFragment|null {
		const initAtom = atoms[fromIndex];
		const parentParenAtom = lookBehindForParentParenthesisAtom(atoms, initAtom.flatIndex);
		if (parentParenAtom === null || parentParenAtom.flatIndex === 0) {
			return null;
		}
		const previousAtom = atoms[parentParenAtom.flatIndex-1];
		
		// Note: The split() operation on 'potential' comments passively adds a +1 that we need
		// 		 to equal the subsequent line# and does handle both single and multi-line comments
		const normalizedLineCount = previousAtom.symbol.split('\n').length + previousAtom.line;
		return previousAtom.isComment() && normalizedLineCount === parentParenAtom.line ? previousAtom : null;
	}


	function lookBehindForParentParenthesisAtom(atoms: Array<ILispFragment>, fromIndex: number): ILispFragment|null {
		let parenScope = 1;		
		for (let i = fromIndex - 1; i >= 0; i--) {
			const value = atoms[i].symbol;
			if (value === ')') {
				parenScope++;
			} else if (value === '(') {
				parenScope--;
			}

			if (parenScope === 0) {
				return atoms[i];
			}
		}
		return null;
	}


	const commentFlag = ';';
	function lookAheadForInlineComment(atoms: Array<ILispFragment>, fromIndex: number): ILispFragment|null {
		const line = atoms[fromIndex].line;
		for (let i = fromIndex + 1; i < atoms.length; i++) {
			const next = atoms[i];
			if (line !== next?.line) {
				return null;
			}
			if (next.symbol[0] === commentFlag) {
				return next;
			}
		}
		return null;
	}
	

}


