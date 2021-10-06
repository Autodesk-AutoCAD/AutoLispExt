import * as vscode from 'vscode';
import { getEOL } from './shared';
import { SymbolServices } from '../services/symbolServices';
import { FlatContainerServices } from '../services/flatContainerServices';
import { StringBuilder } from '../utils';
import { LispAtom, primitiveRegex } from '../astObjects/lispAtom';
import { LispContainer } from '../astObjects/lispContainer';

enum ParseState {
	UNKNOWN = 0,
	STRING = 1,
	COMMENT = 2
}


export class ContainerBuildContext implements vscode.Disposable {
	idx: number = 0;
	line: number = 0;
	column: number = 0;	
	atomIndex: number = 0;
	containerIndex: number = 0;
	depth: number = 0;
	groupLine: number = 0;
	groupColumn: number = 0;

	groupStarted: boolean;
	isEscaping: boolean;
	
	linefeed: string;
	data: string;
	temp: StringBuilder;
	
	flatView: Array<LispAtom>;
	containerView: Array<LispContainer>;
	basicSymbolMap: Map<string, Array<number>>;	
	state: ParseState;


	constructor(docOrText: string|vscode.TextDocument) {
		this.groupStarted = false;
		this.basicSymbolMap = new Map();
		this.flatView = [];
		this.containerView = [];
		this.state = ParseState.UNKNOWN;
		this.isEscaping = false;
		this.temp = new StringBuilder();
		if (typeof(docOrText) === 'string') {
			this.data = docOrText;
			this.linefeed = (docOrText.indexOf('\r\n') >= 0 ? '\r\n' : '\n');
		} else {
			this.data = docOrText.getText();
			this.linefeed = getEOL(docOrText);
		}
	}


	dispose() {
		this.flatView.length = 0;
		delete this.flatView;
		this.containerView.length = 0;
		delete this.containerView;
		delete this.basicSymbolMap;
		delete this.state;
		delete this.data;
		delete this.temp;
	}
	

	createAtomFromTempAndReset(createIn: number, newState?: ParseState): void {
		this.createAtomInContainer(createIn, this.groupLine, this.groupColumn, this.temp.materialize());
		//createIn.atoms.push(this.makeIndexedAtomInArray(this.groupLine, this.groupColumn, this.temp));
		this.groupStarted = false;
		if (newState !== undefined) {
			this.state = newState;
		}
	}

	createAtomFromTempAndResetIf(createIn: number, onCondition: boolean, newState?: ParseState): void {
		if (onCondition) {
			this.createAtomFromTempAndReset(createIn, newState);
			if (newState !== undefined) {
				this.state = newState;
			}
		}
	}

	createAtomInContainer(createIn: number, line: number, col: number, value: string): void {
		this.flatView.push(new LispAtom(line, col, value, this.atomIndex++));
		this.containerView[createIn].atoms.push(this.flatView[this.atomIndex - 1]);
		const lowerKey = value.toLowerCase();
		if (!primitiveRegex.test(lowerKey) && !SymbolServices.isNative(lowerKey)) {
			if (this.basicSymbolMap.has(lowerKey)) {
				this.basicSymbolMap.get(lowerKey).push(this.atomIndex - 1);
			} else {
				this.basicSymbolMap.set(lowerKey, [this.atomIndex - 1]);
			}
		}
	}
	
	moveNext(): void {
		this.idx++;
		this.column++;
	}

	

	incrementAtLineBreakIf(test: boolean): void {
		if (test) {
			this.line++;
			this.column = -1;
		}
	}

	setGroupStartFromCurrentPosition(): void {
		this.groupStarted = true;
		this.groupLine = this.line;
		this.groupColumn = this.column;
	}

	markGloballyTaggedAtoms(): void {
		[...this.basicSymbolMap.keys()].forEach(key => {
			this.basicSymbolMap.get(key).forEach(flatIndex => {
				const flag = FlatContainerServices.verifyAtomIsDefunAndGlobalized(this.flatView, this.flatView[flatIndex])
							 || FlatContainerServices.verifyAtomIsSetqAndGlobalized(this.flatView, this.flatView[flatIndex]);
				if (flag) {
					this.flatView[flatIndex].hasGlobalFlag = true;
				}
			});
		});
	}

	isStandardWhitespace(charCode: number): boolean {		
		return !charCode || charCode < 33;
	}

	allocateNewContainer(): number {
		this.containerView.push(new LispContainer(this.linefeed));
		return this.containerIndex++;
	}

	containerIsEmpty(containerIndex: number): boolean {
		return this.containerView[containerIndex].atoms.length === 0;
	}
	
}

const lf = '\n'.charCodeAt(0); 
const cr = '\r'.charCodeAt(0);
const openParen = '('.charCodeAt(0);
const closeParen = ')'.charCodeAt(0);
const semiColon = ';'.charCodeAt(0);
const dblQuote = '"'.charCodeAt(0);
const sglQuote = '\''.charCodeAt(0);
const verticalBar = '|'.charCodeAt(0);
const backSlash = '\\'.charCodeAt(0);


export function getDocumentContainer(ContextOrContent: ContainerBuildContext|string): LispContainer {
	const ctx = typeof ContextOrContent === 'string' ?  new ContainerBuildContext(ContextOrContent) : ContextOrContent;
	_getDocumentContainer(ctx);
	ctx.markGloballyTaggedAtoms();
	try {
		return ctx.containerView[0];
	} finally {
		ctx.dispose();
	}
}


export function _getDocumentContainer(ctx: ContainerBuildContext): number {
	ctx.depth++;
	const containerIndex = ctx.allocateNewContainer();

	while (ctx.idx < ctx.data.length) {
		let handled = false;
		const curr = ctx.data.charCodeAt(ctx.idx);
		const next = ctx.data.charCodeAt(ctx.idx + 1);
		if (ctx.state === ParseState.UNKNOWN) {
			if (curr === openParen || (curr === sglQuote && next === openParen)) {
				// build our own container atoms and/or aggregate child containers
				ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
				if (ctx.depth > 1 && ctx.containerIsEmpty(containerIndex)) {
					// this was not the root level and we have no atoms, so we are constructing this containers atoms
					ctx.createAtomInContainer(containerIndex, ctx.line, ctx.column, String.fromCharCode(curr));
					if (curr === sglQuote) {
						ctx.moveNext();
						ctx.createAtomInContainer(containerIndex, ctx.line, ctx.column, String.fromCharCode(next));
					}
				} else {
					// this was root level or we already have atoms, so we aggregate any new containers
					ctx.groupStarted = false; // the previous statement won't null the grpStart variable unless it has something to commit
					ctx.containerView[containerIndex].atoms.push(ctx.containerView[_getDocumentContainer(ctx)]);
					handled = true;
				}
			} else if (curr === closeParen) {				
				// there is no version of UNKNOWN where a closing parenthesis doesn't close the active 'result' container
				ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
				ctx.createAtomInContainer(containerIndex, ctx.line, ctx.column, String.fromCharCode(curr));
				ctx.moveNext();
				if (ctx.depth > 1) {
					break;
				}
			} else if (curr === semiColon) {
				// enter comment search mode where all characters on the remainder of that line or until Multi-Line Comment closes
				ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
				ctx.temp.appendCode(semiColon);
				ctx.setGroupStartFromCurrentPosition();
				ctx.state = ParseState.COMMENT;
			} else if (curr === dblQuote) {
				// enter string search mode where all characters except a valid closing double quote will be part of the primitive
				ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
				ctx.temp.appendCode(dblQuote);
				ctx.setGroupStartFromCurrentPosition();
				ctx.state = ParseState.STRING;
				ctx.isEscaping = false;
			} else if (ctx.isStandardWhitespace(curr)) {
				// all forms of whitespace in an UNKNOWN context should break previously tracked temp data as its own symbol
				ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
				ctx.incrementAtLineBreakIf(curr === lf);
			} else if (curr === sglQuote) { 
				// this should ensure that no symbol has an attached single quote; they will be 2 different atoms
				ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
				ctx.createAtomInContainer(containerIndex, ctx.line, ctx.column, String.fromCharCode(curr));
			} else { 
				// This is some other kind of readable character, so it can start a group pointer
				if (!ctx.temp.hasValues()) { 
					ctx.setGroupStartFromCurrentPosition();
				}
				ctx.temp.appendCode(curr);
			}
		} else if (ctx.state === ParseState.STRING) {
			ctx.temp.appendCode(curr);
			if (curr === backSlash) {
				ctx.isEscaping = !ctx.isEscaping;
			} else if (curr === dblQuote && !ctx.isEscaping) {
				ctx.createAtomFromTempAndReset(containerIndex, ParseState.UNKNOWN);
			} else if (ctx.isEscaping) {
				ctx.isEscaping = false;
			}
			ctx.incrementAtLineBreakIf(curr === lf);
		} else if (ctx.state === ParseState.COMMENT) {
			if (ctx.temp.charCodeAt(1) === verticalBar) {
				if (curr === semiColon && ctx.temp.endsWith(verticalBar)) {
					ctx.temp.appendCode(curr);
					ctx.createAtomFromTempAndReset(containerIndex, ParseState.UNKNOWN);
				} else {
					ctx.temp.appendCode(curr);
					ctx.incrementAtLineBreakIf(curr === lf);
				}
			} else if (curr === cr || curr === lf) {
				ctx.createAtomFromTempAndReset(containerIndex, ParseState.UNKNOWN);
			} else {
				ctx.temp.appendCode(curr);
			}
		}
		if (!handled) {
			ctx.moveNext();
		}
	}
	ctx.createAtomFromTempAndResetIf(containerIndex, ctx.temp.hasValues());
	ctx.depth--;
	if (ctx.depth === 0) {
		ctx.containerView[containerIndex].userSymbols = ctx.basicSymbolMap;
	}
	return containerIndex;
}

