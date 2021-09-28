import { LispAtom } from './lispAtom';
import { ILispFragment } from './ILispFragment';
import { Position, Range } from 'vscode';


// A utility class to hold and work with a collection of LispAtom|LispContainers
export class LispContainer extends LispAtom {
    atoms: Array<ILispFragment>;
    linefeed: string;
    userSymbols?: Map<string, Array<number>>; // this would only show up on document root LispContainers

    // pass through getter for the ILispFragment interface
    get body(): LispContainer {
        return this;
    }

    get line(): number {
        return this.userSymbols ? 0 : this.getFirstAtom().line;
    }

    set line(value) {
    }   // setter exists only to satisfy contract
    get column(): number {
        return this.userSymbols ? 0 : this.getFirstAtom().column;
    }

    set column(value) {
    } // setter exists only to satisfy contract

    // LispContainer constructor defaults to a clearly uninitialized state
    constructor(lineFeed: string = '\n') {
        super(-1, -1, '');
        this.atoms = [];
        this.linefeed = lineFeed;
    }


    // Adds one or more ILispFragment's to the LispContainer Atoms
    addAtom(...items: ILispFragment[]) {
        items.forEach(f => {
            if (f?.isLispFragment()) {
                this.atoms.push(f);
            }
        });
    }


    // Finds a child LispAtom if it legitimately touches/contains the Position
    getAtomFromPos(loc: Position): LispAtom {
        if (!this.contains(loc)) {
            return null;
        } else {
            for (var i = 0; i < this.atoms.length; i++) {
                const lispObj = this.atoms[i];
                if (lispObj.contains(loc)) {
                    if (lispObj instanceof LispContainer) {
                        return lispObj.getAtomFromPos(loc);
                    } else if (lispObj instanceof LispAtom) {
                        return lispObj;
                    }
                }
            }
        }
        return null;
    }


    // Returns the total length of characters within a LispContainer minus any LispAtom separated whitespace
    length(): number {
        let res = 0;
        this.atoms.forEach(atom => {
            res += atom.length();
        });
        return res;
    }


    // returns the start or ending line of the LispContainer depending on the boolean flag
    symbLine(last: boolean = true): number {
        if (this.atoms.length === 0) {
            return -1;
        }

        if (last) {
            const lastAtom = this.atoms[this.atoms.length - 1];
            return lastAtom.symbLine();
        } else {
            return this.atoms[0].symbLine();
        }
    }


    // gets the total length of root atoms this LispContainer holds
    size(): number {
        return this.atoms.length;
    }


    // Finds a child LispContainer if it legitimately touches/contains the Position
    getExpressionFromPos(loc: Position, parent: boolean = false): LispContainer {
        let result: LispContainer = null;
        if (this.contains(loc)) {
            this.atoms.forEach(lispObj => {
                if (lispObj.contains(loc) && lispObj instanceof LispContainer) {
                    result = lispObj.getExpressionFromPos(loc, parent) ?? (parent ? this : lispObj);
                }
            });
        }
        return result;
    }


    // Finds the parent LispContainer of any existing ILispFragment, typically used with a primary Container like Defun
    getParentOfExpression(child: ILispFragment): LispContainer {
        const pos = new Position(child.line, child.column);
        return this.getExpressionFromPos(pos, true);
    }


    // Gets a range representing the full LispContainer, especially useful for TextDocument.getText()
    getRange(): Range {
        const begin = this.getFirstAtom().getRange().start;
        const close = this.getLastAtom().getRange().end;
        return new Range(begin, close);
    }

    private getFirstAtom(): ILispFragment {
        const tail = this.atoms[0];
        return tail.body?.getFirstAtom() ?? tail;
    }

    private getLastAtom(): ILispFragment {
        const tail = this.atoms[this.atoms.length - 1];
        return tail.body?.getLastAtom() ?? tail;
    }


    // This version was necessary to properly alternate over SETQ Name vs Value
    private isValidForSetq(atom: ILispFragment): boolean {
        return !atom.isComment() && !['\'', '(', ')', '.'].includes(atom.symbol) && (atom instanceof LispContainer || atom.symbol.trim().length > 0);
    }

    // This is general purpose utility to make sure primitives such as strings, numbers and decorations are not evaluated
    private notNumberStringOrProtected(atom: ILispFragment): boolean {
        return !atom.isComment() && !['\'', '(', ')', '.'].includes(atom.symbol) && !(/^".*"$/.test(atom.symbol)) && !(/^\'{0,1}\-{0,1}\d+[eE\-]{0,2}\d*$/.test(atom.symbol));
    }


    // This is an iteration helper that makes sure only useful LispAtom/LispContainers's get used for data collection purposes.
    nextKeyIndex(currentIndex: number, forSetq?: boolean): number {
        let index = currentIndex + 1;
        if (index < this.atoms.length) {
            const atom = this.atoms[index];
            const flag = forSetq ? this.isValidForSetq(atom) : this.notNumberStringOrProtected(atom);
            if (atom instanceof LispAtom && flag) {
                return index;
            } else {
                return this.nextKeyIndex(index, forSetq);
            }
        } else {
            return -1;
        }
    }


    // Returns a meaningful value from the LispContainer, this is useful for avoiding comments an structural symbols
    getNthKeyAtom(significantNth: number): ILispFragment {
        let num = 0;
        for (let i = 0; i <= significantNth; i++) {
            num = this.nextKeyIndex(num, true);
        }
        if (num < this.atoms.length && num >= 0) {
            return this.atoms[num];
        } else {
            return null;
        }
    }


    // Used a lot like a DOM selector to navigate/extract values from LispContainer
    findChildren(regx: RegExp, all: boolean): LispContainer[] {
        let result: Array<LispContainer> = [];
        let index = this.nextKeyIndex(0);
        const lispObj = this.atoms[index];
        if (!lispObj) {
            return result;
        } else if (regx.test(lispObj.symbol) === true) {
            result.push(this);
            if (all === true) {
                this.atoms.filter(f => f.body).forEach((atom: ILispFragment) => {
                    result = result.concat(atom.body.findChildren(regx, all));
                });
            }
        } else {
            this.atoms.filter(f => f.body).forEach((atom: ILispFragment) => {
                result = result.concat(atom.body.findChildren(regx, all));
            });
        }
        return result;
    }

    // Performance Note: the LispContainer parser takes ~700ms to create the tree from a 12.5mb (20K Lines/1.4M LispAtoms)
    //                   file. In contrast, the older parsing used on formatting before it received some fixes was taking
    //                   more than a minute and the revised version is still taking ~7000ms.
    //                   To flatten the same 12.5mb tree for linear traversal takes ~40ms. The flattening process is
    //                   considered to be an instantaneous operation even under extreme and highly improbable situations.
    flatten(into?: Array<LispAtom>): Array<LispAtom> {
        if (!into) {
            into = [];
        }
        this.atoms.forEach(item => {
            if (item instanceof LispContainer) {
                item.flatten(into);
            } else if (item instanceof LispAtom) {
                into.push(item);
            }
        });
        return into;
    }


    // This is only used for verification of the LispContainer parser, but could have future formatting usefullness.
    // Note1: test files cannot contain lines with only random whitespace or readable character lines that include
    //        trailing whitespace because a LispContainer has no context to reproduce that.
    // Note2: tabs between atoms will be replaced with spaces and thus are not supported in test files.
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
            if (item instanceof LispContainer) {
                item.asText(context);
            } else {
                context.result += item.symbol;
                context.column += item.symbol.length;
                if (item.isComment() && !item.isLineComment()) {
                    context.line += item.symbol.split(this.linefeed).length - 1;
                }
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