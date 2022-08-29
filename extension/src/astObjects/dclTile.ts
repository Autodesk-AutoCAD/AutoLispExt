import { Position, Range } from 'vscode';
import { DclAtom } from './dclAtom';
import { DclAttribute } from './dclAttribute';
import { IDclContainer, IDclFragment } from './dclInterfaces';


export class DclTile implements IDclContainer {
    
	get line(): number {
        return this.firstAtom.line;
    }

    get column(): number {
        return this.firstAtom.column;
    }

    get asTile(): DclTile {
        return this;
    }

    get asContainer(): IDclContainer {
        return this;
    }

    get isComment(): boolean { 
        return false; 
    }

    get isBlockComment(): boolean { 
        return false; 
    }
    
    get isString(): boolean { 
        return false; 
    }

    get range(): Range {
        const begin = this.firstAtom.range.start;
        const close = this.lastAtom.range.end;
        return new Range(begin, close);
    }

    equal(atom: IDclFragment): boolean {
        return JSON.stringify(this) === JSON.stringify(atom);
    }

    contains(position: Position): boolean {
        return this.range.contains(position);
    }

    getAtomFromPosition(position: Position): IDclFragment {
        if (this.contains(position)) {
            for (let i = 0; i < this.length; i++) {
                if (!this.atoms[i].contains(position)) {
                    continue;
                }
                return this.atoms[i].getAtomFromPosition(position);
            }
        }
        return null;
    }

    public atoms: Array<IDclFragment>;

    get length(): number {
        return this.atoms?.length ?? 0;
    }

    get firstAtom(): IDclFragment {
        return this.atoms[0].asContainer?.firstAtom ?? this.atoms[0];
    }

    get lastAtom(): IDclFragment {
        return this.atoms[this.length - 1].asContainer?.lastAtom ?? this.atoms[this.length - 1];
    }

    get firstNonComment(): IDclFragment {
        for (let i = 0; i < this.length; i++) {
            const item = this.atoms[i];
            if (item.isComment){
                continue;
            }
            if (item.asContainer) {
                return null;
            }
            return this.atoms[i];
        }
        return null;
    }

    getParentFrom(position: Position|IDclFragment, tilesOnly = false): IDclContainer {
        const pos = position instanceof Position ? position : position.range.start;
        if (this.contains(pos)) {
            for (let i = 0; i < this.length; i++) {
                const dclObj = this.atoms[i];
                if (!dclObj.contains(pos)) {
                    continue;
                }
                if (dclObj instanceof DclAttribute) {
                    return tilesOnly ? this : dclObj;
                } else if (dclObj instanceof DclAtom) {
                    return this;
                } else {
                    return dclObj.asTile.getParentFrom(pos, tilesOnly) ?? this;
                }
            }
        }
        return null;
    }
    
    flatten(into?: Array<DclAtom>): Array<DclAtom> {
        if (!into) {
            into = [];
        }
        this.atoms.forEach(item => {
            if (item.asContainer) {
                item.asContainer.flatten(into);
            } else if (item instanceof DclAtom) {
                into.push(item);
            }
        });
        return into;
    }


    // Everything above this point is sequenced by IDclFragment & then IDclContainer contract
    // Everything below this point is unique to DclTile and not an interface requirement

    
    public linefeed: string;

    constructor(lineEnding: string, atoms: Array<IDclFragment>) {
		this.linefeed = lineEnding;
        this.atoms = [...atoms];
    }

    get openBracketAtom(): IDclFragment {
        for (let i = 0; i < this.length; i++) {
            if (this.atoms[i].symbol === '{') {
                return this.atoms[i];
            }
        }
        return null;
    }

    get tileTypeAtom(): IDclFragment {
        let prevNonComment: IDclFragment;
        for (let i = 0; i < this.length; i++) {
            const atom = this.atoms[i];
            if (atom.isComment) {
                continue;
            } 
            if (atom.symbol === '{') {
                return prevNonComment?.symbol !== ':' ? prevNonComment : null;
            }
            prevNonComment = atom;
        }
        return null;
    }

    get dialogNameAtom(): IDclFragment {
        const typeValue = this.tileTypeAtom?.symbol.toUpperCase() ?? '';
        const firstValue = this.firstNonComment?.symbol ?? '';
        if (typeValue !== 'DIALOG' || !/\w+.*/.test(firstValue)) {
            return null;
        }
        return this.firstNonComment;
    }

    get closeBracketAtom(): IDclFragment {
        return this.atoms[this.length - 1].symbol === '}' ? this.atoms[this.length - 1] : null;
    }

    // This is only used for verification of the DCL parser, but could have future formatting usefulness.
    // Note1: test files cannot contain lines with only random whitespace or readable character lines that
    //        include trailing whitespace because a TileContainer has no context to reproduce that.
    // Note2: tabs in test files are only supported for comments and strings, all other tabs are replaced with spaces
    asText(context?: IContainerStringCompilerContext): string {
        let isRoot = false;
        if (context === undefined) {
            context = {result: '', line: 0, column: 0};
            isRoot = true;
        }
        this.atoms.forEach(item => {
            while (context.line < item.line) {
                context.result += this.linefeed;
                context.line++;
                context.column = 0;
            }
            while (context.column < item.column) {
                context.result += ' ';
                context.column++;
            }
            if (item instanceof DclTile) {
                item.asText(context);
            } else if (item instanceof DclAttribute) {
                item.atoms.forEach(x => {
                    while (context.column < x.column) {
                        context.result += ' ';
                        context.column++;
                    }
                    context.result += x.symbol;
                    context.column += x.symbol.length;
                });
            } else if (item.isBlockComment) {
                const lines = item.symbol.split(this.linefeed);
                context.result += item.symbol;
                context.column = lines[lines.length - 1].length;
                context.line += lines.length - 1;
            } else {
                context.result += item.symbol;
                context.column += item.symbol.length;
            }
        });
        return isRoot ? context.result : '';
    }

}

interface IContainerStringCompilerContext {
    result: string;
    line: number;
    column: number;
}