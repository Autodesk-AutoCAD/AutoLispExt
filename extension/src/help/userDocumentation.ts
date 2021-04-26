import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { AutoLispExt } from '../extension';
import { ILispFragment, LispContainer } from '../format/sexpression';
import { SearchPatterns } from '../providers/providerShared';

const localize = nls.loadMessageBundle();

// This file exists to support the 'autolisp.generateDocumentation' command, which is register in:
// 		/extension/src/commands.ts

// locates the nearest defun(s) from a position and prompts the user to choose if ambiguity exists
export async function getDefunAtPosition(atom: ILispFragment, pos: vscode.Position): Promise<LispContainer> {
	let defs = atom?.body?.findChildren(SearchPatterns.DEFINES, true).filter(p => p.contains(pos)) ?? [];
	if (defs.length === 0) {
		return;
	}
	if (defs.length > 1) {
		// if this was performed within a nested defun, then the user has to select which defun to document
		const quickPicks = defs.map(d => d.getNthKeyAtom(1).symbol);
		let outResult = '';
		await vscode.window.showQuickPick(quickPicks).then(response => { outResult = response; });
		defs = defs.filter(d => d.getNthKeyAtom(1).symbol === outResult);
	}	
	// Now we know what defun we are documenting, so we extract arguments; if applicable
	return defs[0];
}

// extract the arguments from the Defun header
export function getDefunArguments(def: LispContainer): Array<ILispFragment> {
	if (!def) {
		return [];
	}
	let args = def.atoms.find(p => p instanceof LispContainer)?.body?.atoms.filter(a => !a.isComment()) ?? [];
	const dividerIndex = args.findIndex(a => a.symbol === '/');
	if (dividerIndex === -1 && args.length > 2) {
		// no divider for local variables, but did have arguments, so we trim off the outer parenthesis
		args = args.slice(1, args.length - 1);
	} else if (dividerIndex === -1) {
		// no arguments
		args = [];
	} else {
		// had locals, grab everything between the opening parenthesis and the divider; if anything...
		args = args.slice(1, dividerIndex);
	}
	return args;
}

// generate a dynamic snippet multi-line comment to represent the defun and its arguments
export function generateDocumentationSnippet(eol: string, args: Array<ILispFragment>): vscode.SnippetString {
	let count = 1;
	let contents = `${eol};|${eol}  \${${count++}:description}${eol}`;

	args.forEach(a => {
		contents += `  @Param ${a.symbol} \${${count++}:?}${eol}`;
	});

	contents += `  @Returns \${${count}:?}${eol}|;${eol}`;

	return new vscode.SnippetString(contents);
}
