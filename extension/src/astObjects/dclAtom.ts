import { Position, Range } from 'vscode';
import { IDclFragment } from './dclInterfaces';

export class DclAtom implements IDclFragment {
	public symbol: string;
    public flatIndex: number;
    
    private _line: number;
    get line(): number {
        return this._line;
    }

    private _column: number;
    get column(): number {
        return this._column;
    }

    constructor(line: number, column: number, value: string, flatIdx: number) {
        this._line = line;
        this._column = column;
        this.symbol = value;
        this.flatIndex = flatIdx;
    }

    get isComment(): boolean {
        return this.symbol.startsWith('/');
    }

    get isBlockComment(): boolean {
        return this.symbol.startsWith('/*');
    }

    get isString(): boolean {
        return /^".*"$/.test(this.symbol);
    }

    get isNumber(): boolean {
        return /^\d+\.*\d*"$/.test(this.symbol);
    }

    get range(): Range {
        if (!this.symbol.includes('\n')) {
            return new Range(this.line, this.column, this.line, this.column + this.symbol.length);    
        }

        let cLine = this.line;
        let cColm = this.column;
        const begin: Position = new Position(cLine, cColm);
        for (let i = 0; i < this.symbol.length; i++) {
            const ch = this.symbol[i];
            if (ch === '\n') {
                cLine += 1;
                cColm = 0;
            } else {
                cColm += 1;
            }
        }
        const close: Position = new Position(cLine, cColm);
        return new Range(begin.line, begin.character, close.line, close.character);
    }

    get rank(): number {
        return this.line * 1000 + this.column;
    }

    equal(atom: IDclFragment): boolean {
        return JSON.stringify(this) === JSON.stringify(atom);
    }

    contains(pos: Position): boolean {
        return this.range.contains(pos);
    }

    getAtomFromPosition(position: Position): IDclFragment {
        return this.contains(position) ? this : null;
    }

}