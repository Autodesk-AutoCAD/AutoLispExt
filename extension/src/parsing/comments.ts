import { LispAtom } from "../format/sexpression";


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
 * @returns LspDoc interface that specifically represents "planned" documentation types
 */
export function parseDocumentation(value: LispAtom): ILispDocs {
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