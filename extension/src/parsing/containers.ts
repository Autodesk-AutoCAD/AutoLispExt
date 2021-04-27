import * as vscode from 'vscode';
import { LispAtom, LispContainer } from '../format/sexpression';
import { getEOL } from './shared';

// This code was migrated from /src/format/parser.ts
// No actual code changes were made except to remove the LispParser Namespace
// Code using getDocumentContainer() was updated to remove LispParser prefix

enum ParseState {
	UNKNOWN = 0,
	STRING = 1,
	COMMENT = 2
}

interface CountTracker {
	idx: number;
	line: number;
	column: number;
	linefeed: string;
}

export function getDocumentContainer(data: string|vscode.TextDocument, offset?: number|vscode.Position, tracker?: CountTracker): LispContainer {
	let documentText = '';
	let isTopLevel = false;
	if (data instanceof Object) {
		documentText = data.getText();
	} else {
		documentText = data;
	}
	if (offset === undefined) {
		offset = 0;
		isTopLevel = true;
	}
	if (!tracker){
		tracker = {
			idx: 0, line: 0, column: 0, 
			linefeed: data instanceof Object ? getEOL(data) : (data.indexOf('\r\n') >= 0 ? '\r\n' : '\n')
		};
	}
	
	const result = new LispContainer();
	result.line = tracker.line;
	result.column = tracker.column;
	result.linefeed = tracker.linefeed;
	
	let isAuthorized = true;
	let state = ParseState.UNKNOWN;
	let grpStart: vscode.Position = null;
	let temp = '';
	
	while (tracker.idx < documentText.length && isAuthorized) {
		const curr = documentText[tracker.idx];
		const next = documentText[tracker.idx + 1];
		
		let doWork = false;
		if (offset instanceof vscode.Position) {
			doWork = tracker.line >= offset.line && tracker.column >= offset.character;
		} else {
			doWork = tracker.idx >= offset;
		}

		if (doWork === false) {
			if (curr === '\n'){
				tracker.line++;
				tracker.column = -1;
			}
			tracker.idx++;
			tracker.column++;
		} else if (isTopLevel && curr === '(' && state === ParseState.UNKNOWN) {
			if (temp.length > 0) {
				result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));                            
			}
			temp = '';
			grpStart = null;
			result.atoms.push(getDocumentContainer(documentText, offset, tracker));
		} else {
			let handled = false; // Only true when this function gets recursively called because of a new open parenthesis (LispContainer) scope
			switch (state) {
				case ParseState.UNKNOWN:                    
					if (grpStart === null && curr === '\'' && next === '(') {
						result.atoms.push(new LispAtom(tracker.line, tracker.column, curr));
					} else if (grpStart === null && curr === '(') {
						grpStart = new vscode.Position(tracker.line, tracker.column);
						result.atoms.push(new LispAtom(grpStart.line, grpStart.character, curr));
					} else if (curr === ')') {
						if (temp.length > 0) {                            
							result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
						}
						temp = '';
						result.atoms.push(new LispAtom(tracker.line, tracker.column, curr));
						grpStart = null;
						isAuthorized = false;
					} else if (curr === '(' || curr === '\'' && next === '(') {
						if (temp.length > 0) {
							result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));                            
						}
						temp = '';
						result.atoms.push(getDocumentContainer(documentText, offset, tracker));
						handled = true;
					} else if (curr === ';') {
						if (temp.length > 0) {
							result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
						}
						temp = ';';
						grpStart = new vscode.Position(tracker.line, tracker.column);
						state = ParseState.COMMENT;
					} else if (curr === '"') {
						if (temp.length > 0) {
							result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
						}
						temp = '"';
						grpStart = new vscode.Position(tracker.line, tracker.column);
						state = ParseState.STRING;
					} else if (/\s/.test(curr)) {
						if (temp.length > 0) {
							result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
						}
						if (curr === '\n'){
							tracker.line++;
							tracker.column = -1;
						}
						temp = '';
					} else { // This is some other kind of readable character, so it can start a group pointer
						if (temp === '') { 
							grpStart = new vscode.Position(tracker.line, tracker.column);
						}
						temp += curr;
					}
					break;
				case ParseState.STRING:
					temp += curr;
					// these 2 endswith tests are hard to understand, but they were vetted on a previous C# lisp parser to detect escaped double quotes
					if (curr === '"' && (temp.endsWith("\\\\\"") || !temp.endsWith("\\\""))) {    
						result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
						state = ParseState.UNKNOWN;
						temp = '';
					} 
					if (curr === '\n'){
						tracker.line++;
						tracker.column = -1;
					}
					break;
				case ParseState.COMMENT:                    
					if (temp[1] === '|') {
						temp += curr;
						if (temp.endsWith('|;')) {
							result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
							state = ParseState.UNKNOWN;
							temp = '';
						}
						if (curr === '\n'){
							tracker.line++;
							tracker.column = -1;
						}
					} else {
						if (curr === '\r' || curr === '\n') {
							if (temp !== '') {
								result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
							}
							state = ParseState.UNKNOWN;
							temp = '';
						} else {
							temp += curr;
						}
					}
					break;
			}
			if (handled === false) {
				tracker.idx++;                
				tracker.column++;
			}
		}
	}
	if (temp.length > 0) {
		result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
	}
	if (result.atoms.length > 0) {
		result.line = result.atoms[0].line;
		result.column = result.atoms[0].column;
	}
	return result;
}