import { ILispFragment } from './ILispFragment';
import { Position, Range } from 'vscode';
import { Sexpression } from './sexpression';


// General purpose test for basic known primitive values; Including: T, NIL, Number, (single or multi-line) Strings & Comments
export const primitiveRegex = /^([\(\)\'\.]|"[\s\S]*"|;[\s\S]*|'?[tT]|'?[nN][iI][lL]|'?-?\d+[eE][+-]?\d+|-?\d+|-?\d+\.\d+)$/;
const primitiveGlyphs = ['\'', '(', ')', '.', ';']; //, '']; //, null, undefined];


// Represents the most fundamental building blocks of a lisp document
export class LispAtom implements ILispFragment {
    public symbol: string;
    protected _line: number;
    protected _column: number;

    get line(): number {
        return this._line;
    }

    set line(value) {
        this._line = value;
    }

    get column(): number {
        return this._column;
    }

    set column(value) {
        this._column = value;
    }

    // These 3 fields exist to support comment driven intelligence. Creation of Symbol mappings is an expensive operation
    // and these 2 fields prevent ~80% of the required overhead when working in concert with the highly efficient parser
    public flatIndex: number;
    public commentLinks?: Array<number>;
    public hasGlobalFlag?: boolean;

    constructor(line: number, column: number, sym: string, flatIdx = -1) {
        this._line = line;
        this._column = column;
        this.symbol = sym;
        this.flatIndex = flatIdx;
    }


    // Does a simple comparison between 2 ILispFragments without the reference problem
    equal(atom: ILispFragment): boolean {
        return JSON.stringify(this) === JSON.stringify(atom);
    }


    // Determines if this LispAtom or its derived type can be used as an ILispFragment
    isLispFragment(): boolean {
        if (this instanceof Sexpression) {
            return false;
        } else {
            return true;
        }
    }


    // returns the start or ending line of the LispAtom depending on the boolean flag
    symbLine(last: boolean = true): number {
        if (last) {
            let internalLines = 0;
            if (this.symbol.startsWith(';|')) {
                for (let i = 0; i < this.symbol.length; i++) {
                    if (this.symbol.charAt(i) === '\n') { // it can handle the \r\n and \n
                        internalLines++;
                    }
                }
            }
            return this.line + internalLines;
        } else {
            return this.line;
        }
    }


    // Returns the length of the LispAtom's text value
    length(): number {
        return this.symbol.length;
    }


    // Tests if the LispAtom is representing a single-line comment
    isLineComment(): boolean {
        return this.symbol.startsWith(';') && !this.symbol.startsWith(';|');
    }


    // Tests if the LispAtom is representing any type of comment
    isComment(): boolean {
        return this.symbol.startsWith(';');
    }


    // Tests if the LispAtom is representing a structural closing parenthesis
    isRightParen(): boolean {
        return this.symbol === ')';
    }


    // Tests if the LispAtom is representing a structural opening parenthesis
    isLeftParen(): boolean {
        return this.symbol === '(';
    }

    isPrimitive(): boolean {
        // if (!this['atoms']) {
        //     return primitiveRegex.test(this.symbol);
        // }
        // return false;
        return primitiveGlyphs.indexOf(this.symbol[0]) > -1
            || primitiveRegex.test(this.symbol);
    }

    // Returns true if this LispAtom encapsulates the provided Position
    contains(position: Position): boolean {
        return this.getRange().contains(position);
    }


    // Gets the full range of the LispAtom and is capable of handling multi line strings or comments
    getRange(): Range {
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

}