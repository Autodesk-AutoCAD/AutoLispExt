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

    get range(): Range {
        return new Range(this.line, this.column, this.line, this.column + this.symbol.length);
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