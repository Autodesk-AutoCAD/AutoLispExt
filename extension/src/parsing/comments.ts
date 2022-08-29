import * as vscode from 'vscode';
import { escapeRegExp, StringEqualsIgnoreCase } from '../utils';
import { getDocumentContainer } from './containers';
import { ILispFragment } from '../astObjects/ILispFragment';


interface ILspDocPair {
	name: string;
	value: string;
}
interface ILispDocs {
	params?: Array<ILspDocPair>;
	returns?: ILspDocPair;
	description?: ILspDocPair;
	remarks?: ILspDocPair;
}

function normalizeComment(str: string) : string {
	return str.replace(/\t/g, ' ')
			  .replace(/\s\s/g, ' ')
			  .replace(/(;|\|)/g, '')
			  .replace(/^@\s*/, '@')
			  .trim();
}

/**
 * This function extracts the user documentation into a basic structure for completion data
 * @param value This should be a LispAtom that represents a comment or comment block
 * @returns ILispDocs specifically represents the "planned" documentation types
 */
export function parseDocumentation(value: ILispFragment): ILispDocs {
	const result: ILispDocs = { };
	let active: ILspDocPair = null;

	if (!value.isComment()) {
		return result;
	}
	
	const facets = value.symbol.replace(/\r\n/g, '\n').split('\n');
	for (let i = 0; i < facets.length; i++) {
		const line = normalizeComment(facets[i]);
		if (line === '') {
			continue;
		}

		if (line.startsWith('@') && line.includes(' ')) {
			const first = line.substring(0, line.indexOf(' ')).toUpperCase();
			const content = line.substring(first.length).trim();
			if (first.startsWith('@REMARK')) {
				result['remarks'] = active = { name: 'Remarks', value: content };
			} else if (first.startsWith('@DESC')) {
				result['description'] = active = { name: 'Description', value: content };
			} else if (first.startsWith('@RETURN')) {
				result['returns'] = active = { name: 'Returns', value: content };
			} else if (first.startsWith('@PARAM')) {
				if (!result['params']) {
					result['params'] = [];
				}                    
				result['params'].push(active = { name: 'Param', value: content });
			} else {
				// if it started with @ and its not roughly a predesignated @TYPE, then
				// do nothing and stop the process that assembles the previous @TYPE
				active = null;
			}
		} else {
			if (active) {
				active.value += ' ' + line;
			} else if (!result['description']) {
				// this handles implied short descriptions as the first available content
				result['description'] = active = { name: 'Description', value: line };
			}
		}
	}
	// Params are post processed because the accumulation process allows for multi-line
	// documentation from each of the defined types.
	if (result['params']) {
		result['params'].forEach(p => {
			const val = normalizeComment(p.value);
			if (val.includes(' ')) {
				const parts = val.split(' ');
				p.name = parts.shift();
				p.value = parts.join(' ');
			} else {
				// did not provide a variable definition
				p.name = val;
				p.value = '';
			}
		});
	}
	return result;
}

/**
 * Supports F2 renaming system by keeping the Lisp function documentation aligned with code
 * @param atom Must be a multi-line comment
 * @param name The expected value of an @Param name, subsequent documentation is ignored
 * @returns Range of the found name or null if it wasn't included in documentation
 */
export function getBlockCommentParamNameRange(atom: ILispFragment, name: string): vscode.Range|null {
	if (!atom.isComment() || atom.isLineComment()) {
		return null;
	}
	const lines = atom.symbol.split('\n');
	const filter = new RegExp(`^[\\s\\|]*@PARAM\\s+${escapeRegExp(name)}\\s[\\s\\S]*$`, 'i');
	for (let i = 0; i < lines.length; i++) {
		const completeLine = lines[i] + '\n';
		if (filter.test(completeLine)) {
			const temp = getDocumentContainer(completeLine).atoms
						 .find(innerAtom => StringEqualsIgnoreCase(name, innerAtom.symbol));			
			return !temp ? null : new vscode.Range(atom.line + i, temp.column, atom.line + i, temp.column + temp.symbol.length);
		}
	}
	return null;
}