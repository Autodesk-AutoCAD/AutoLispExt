import * as vscode from 'vscode';
import { getEOL } from './shared';
import { StringBuilder, } from '../utils';
import { DclTile } from '../astObjects/dclTile';
import { DclAtom } from '../astObjects/dclAtom';
import { DclAttribute } from '../astObjects/dclAttribute';
import { AutoLispExt } from '../extension';


const lf = '\n'.charCodeAt(0); 
const cr = '\r'.charCodeAt(0);
const openBracket = '{'.charCodeAt(0);
const closeBracket = '}'.charCodeAt(0);
const semiColon = ';'.charCodeAt(0);
const colon = ':'.charCodeAt(0);
const equalSign = '='.charCodeAt(0);
const dblQuote = '"'.charCodeAt(0);
const forwardSlash = '/'.charCodeAt(0);
const backSlash = '\\'.charCodeAt(0);
const asterisk = '*'.charCodeAt(0);


export function getDocumentTileContainer(DocumentOrContent: vscode.TextDocument|string): DclTile {
	const ctx = new DclDocContext(DocumentOrContent);
	try {
		_getDclDocumentContainer(ctx);
		return ctx.rootContainer;
	} finally {
		ctx.dispose();
	}
}


class DclDocContext implements vscode.Disposable {
	dispose() {
		this.containers.length = 0;
		delete this.containers;
		this.fragments.length = 0;
		delete this.fragments;		
		delete this.data;
		delete this.temp;
	}

	
	private containers: Array<DclTile>;
	private fragments: Array<DclAtom>;
	private containerIndex = 0;
	
	get activeContainer() : DclTile {
		if (this.containerIndex < this.containers.length) {
			return this.containers[this.containerIndex];			
		}
		return null;
	}

	get rootContainer(): DclTile {
		return this.containers[0];
	}


	constructor(docOrText: string|vscode.TextDocument) {
		if (typeof(docOrText) === 'string') {
			this.data = docOrText;
			this.linefeed = (docOrText.indexOf('\r\n') >= 0 ? '\r\n' : '\n');
		} else {
			this.data = docOrText.getText();
			this.linefeed = getEOL(docOrText);
		}
		this.temp = new StringBuilder();
		this.containers = [ new DclTile(this.linefeed, []) ];
		this.fragments = [];
	}

	data: string;
	linefeed: string;
	temp: StringBuilder;
	
	dataIndex: number = 0;
	line: number = 0;
	column: number = 0;
	
	atomIndex: number = 0;
	
	groupLine: number = 0;
	groupColumn: number = 0;


	
	

	moveNext(): DclDocContext {
		this.dataIndex++;
		this.column++;
		return this;
	}

	incrementAtLineBreak(curr: number): DclDocContext {
		if (curr === lf) {
			this.line++;
			this.column = -1;
		}
		return this;
	}

	private saveGroupAtom(value: string): DclAtom {
		const atom = new DclAtom(this.groupLine, this.groupColumn, value, this.atomIndex++);
		this.fragments.push(atom);
		return atom;
	}
	private saveCurrentAtom(value: string): DclAtom {
		const atom = new DclAtom(this.line, this.column, value, this.atomIndex++);
		this.fragments.push(atom);
		return atom;
	}

	startGroupPointer(): DclDocContext {
		this.groupColumn = this.column;
		this.groupLine = this.line;
		return this;
	}

	saveTempData(): DclDocContext {
		if (this.temp.hasValues()) {
			this.saveGroupAtom(this.temp.materialize());
		}
		return this;
	}

	saveTempDataAndCurrentCharToFragments(): DclDocContext {
		this.saveTempData();
		this.saveCurrentAtom(this.data.charAt(this.dataIndex));
		return this;
	}

	saveCurrentCharToFragments(): DclDocContext {
		this.saveCurrentAtom(this.data.charAt(this.dataIndex));
		return this;
	}

	createNewTileScopeFromFragments(): void {
		const tile = new DclTile(this.linefeed, this.fragments);
		this.activeContainer.atoms.push(tile);
		this.containers.push(tile);
		this.fragments.length = 0;
		this.containerIndex++;
	}

	closeActiveTileScope(): void {
		this.fragments.forEach(x => {			
			this.activeContainer.atoms.push(x);
		});
		this.fragments.length = 0;		
		this.containerIndex--;
		this.containers.pop();
	}

	storeChar(charCode: number) : DclDocContext {
		if (!this.temp.hasValues()) {
			this.startGroupPointer();
		}
		this.temp.appendCode(charCode);
		return this;
	}

	saveFragmentsAsTileOrAttribute() : DclDocContext {
		// This is only called on the semi-colon breakpoint. In most scenarios, this will be an attribute, but when
		// there is only 2 atoms and the last one is the semi-colon, then we will assume it is "default" tile.

		if (this.fragments.length === 2 
			&& this.fragments[1].symbol === ';' 
			&& AutoLispExt.Resources.WebHelpContainer.dclTiles.has(this.fragments[0].symbol.toLowerCase())) {
			this.createNewTileScopeFromFragments();
			this.closeActiveTileScope();
		} else {
			this.saveFragmentsAsAttribute();
		}

		return this;
	}

	saveFragmentsAsAttribute() : DclDocContext {
		// Forces comments into the parent Tile Container and creates Attribute from remaining elements. This only 
		// needs to inspect the head for comments because encountering a comment causes an attribute accumulation event.
		let skip = 0;
		this.fragments.forEach(atom => {
			if (atom.isComment) {
				this.activeContainer.atoms.push(atom);
				skip++;
			}
		});
		if (this.fragments.length - skip > 0) {
			this.activeContainer.atoms.push(new DclAttribute(this.fragments.slice(skip)));
		}
		this.fragments.length = 0;
		return this;
	}

	processCommentAndSaveAsFragment(isBlock: boolean): void {
		while (this.dataIndex < this.data.length) {
			const curr = this.data.charCodeAt(this.dataIndex);
			const next = this.data.charCodeAt(this.dataIndex + 1); 
			this.storeChar(curr)
				.incrementAtLineBreak(curr) // does nothing when (curr !== lf)
			    .moveNext();
			if (isBlock && curr === asterisk && next === forwardSlash) {
				this.storeChar(next)
					.moveNext();
				break;
			} else if (!isBlock && (next === cr || next === lf)) {
				break;
			}
		}	
		this.saveTempData();
	}

	processStringAndSaveAsFragment(): void {
		this.storeChar(dblQuote)
		    .moveNext();
		let isEscaping = false;
		
		while (this.dataIndex < this.data.length) {
			const curr = this.data.charCodeAt(this.dataIndex);
			this.storeChar(curr)
			    .moveNext();
			if (curr === backSlash) {
				isEscaping = !isEscaping;
			} else if (curr === dblQuote && !isEscaping) {
				break;
			} else if (isEscaping) {
				isEscaping = false;
			}
		}	
		this.saveTempData();
	}

}




function _getDclDocumentContainer(ctx: DclDocContext) {	
	while (ctx.dataIndex < ctx.data.length) {
		const curr = ctx.data.charCodeAt(ctx.dataIndex);
		const next = ctx.data.charCodeAt(ctx.dataIndex + 1); 

		if (curr === openBracket) {	// tile/attribute breakpoint
			ctx.saveTempDataAndCurrentCharToFragments()
			   .moveNext()
			   .createNewTileScopeFromFragments();
		} else if (curr === closeBracket) { // tile/attribute breakpoint
			ctx.saveTempData()
			   .saveFragmentsAsAttribute()
			   .saveCurrentCharToFragments()
			   .moveNext()
			   .closeActiveTileScope();
		} else if (curr === semiColon) { // tile/attribute/fragment breakpoint
			ctx.saveTempDataAndCurrentCharToFragments()
			   .moveNext()
			   .saveFragmentsAsTileOrAttribute();
		} else if (curr === forwardSlash) { // attribute/fragment breakpoint
			ctx.saveTempData()
			   .saveFragmentsAsAttribute()
			   .startGroupPointer()
			   .processCommentAndSaveAsFragment(next === asterisk);
		} else if (curr === cr || curr === lf) { // attribute/fragment breakpoint
			ctx.saveTempData()
			   .saveFragmentsAsAttribute()
			   .incrementAtLineBreak(curr)
			   .moveNext();
		} else if (curr < 33) { // fragment breakpoint - tabs, spaces & misc non-printable characters
			ctx.saveTempData()
			   .moveNext();
		} else if (curr === dblQuote) { // fragment breakpoint
			ctx.saveTempData()
			   .startGroupPointer()
			   .processStringAndSaveAsFragment();
		} else if (curr === equalSign || curr === colon) { // fragment breakpoint
			ctx.saveTempDataAndCurrentCharToFragments()
			   .moveNext();
		} else { 			
			ctx.storeChar(curr)
			   .moveNext();
		}
	}

	// malformed syntax contingency so we aren't accidentally discarding any user data
	ctx.saveTempData()
	   .saveFragmentsAsAttribute();
	return ctx.rootContainer;
}

	
