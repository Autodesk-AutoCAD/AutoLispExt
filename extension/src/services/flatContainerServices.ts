import { StringEqualsIgnoreCase } from '../utils';
import { ILispFragment, LispAtom } from '../format/sexpression';



export namespace FlatContainerServices {


	export function verifyAtomIsSetqAndGlobalized(atoms: Array<ILispFragment>, from: ILispFragment): boolean {
		const parentAtom = getParentRootAtomIfOfType(atoms, from.flatIndex, 'setq');
		if (!parentAtom || !isValidSetqContext(parentAtom, atoms)) {
			return false;
		}
		return hasGlobalizationContext(from, parentAtom, atoms);
	}

	export function verifyAtomIsDefunAndGlobalized(atoms: Array<ILispFragment>, from: ILispFragment): boolean {
		const parentAtom = getParentRootAtomIfOfType(atoms, from.flatIndex, 'defun', 'defun-q');
		if (!parentAtom) {
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

	
	// Logic Pattern:
	//		every variable declaration must have a setq preceeding it
	//		OR
	//		the previous atom should be an assignment ending with some kind of primitive value type
	//			Note: (, ), strings, numbers, nil and t are all primitives
	//
	// Technical Debt:
	// 		The only known situation where this could fail is setting a variable using only another variable
	//		Which is considered to be a bad practice for use with an explicitly exported @Global system
	function isValidSetqContext(from: ILispFragment, atoms: Array<ILispFragment>): boolean {
		const previous = atoms[from.flatIndex-1];
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


