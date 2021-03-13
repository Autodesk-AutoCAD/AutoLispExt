import { closeParenStyle, maximumLineChars, longListFormatStyle, indentSpaces } from './fmtconfig';
import { isInternalAutoLispOp } from '../completion/autocompletionProvider';
import { Position, Range } from 'vscode';

// This interface is intended to let us work in more generic ways without direct context of LispAtom|LispContainer
export interface ILispFragment {
    symbol: string;
    line: number;
    column: number;
    
    readonly body?: LispContainer|undefined;
    
    isLispFragment(): boolean;
    equal(atom: ILispFragment): boolean;
    symbLine(last?: boolean): number;
    length(): number;
    isLineComment(): boolean;
    isComment(): boolean;
    isRightParen(): boolean;
    isLeftParen(): boolean;
    contains(pos: Position): boolean;
    getRange(): Range;
}

// Represents the most fundamental building blocks of a lisp document
export class LispAtom implements ILispFragment {
    public symbol: string;
    public line: number;
    public column: number;

    constructor(line: number, column: number, sym: string) {
        this.line = line;
        this.column = column;
        this.symbol = sym;
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
        }
        else {
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


// A utility class to hold and work with a collection of LispAtom|LispContainers
export class LispContainer extends LispAtom {
    atoms: Array<ILispFragment>;
    linefeed: string;

    // pass through getter for the ILispFragment interface
    get body(): LispContainer { return this; }

    // LispContainer constructor defaults to a clearly uninitialized state
    constructor(startIndex: number = -1) {
        super(startIndex,startIndex,'');
        this.atoms = [];
        this.linefeed = '\n';
    }


    // Returns a crude version of the text a LispAtom|LispContainer represents
    static getRawText(lispObj: ILispFragment): string {
        if (lispObj instanceof LispContainer) {            
            let ret = '';
            for (let atom of lispObj.atoms) {
                ret += LispContainer.getRawText(atom) + ' ';
            }
            return ret;
        } else {
            return lispObj.symbol;
        }
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
        const begin: ILispFragment = this.atoms[0];
        const close: ILispFragment = this.atoms[this.atoms.length -1];
        return new Range(begin.line, begin.column, close.line, (close.column + close.symbol.length));
    }


    // Returns true if this LispContainer encapsulates the provided Position
    contains(position: Position): boolean {
        return this.getRange().contains(position);
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
}









enum  LongListFmts{
    kSingleColumn,
    kWideStyleSingleCol,
    kFitToMargin
  }
  
  let gMaxLineChars = 80;
  let gIndentSpaces = 2;
  let gClosedParenInSameLine = true;
  let gLongListFormatAsSingleColumn = LongListFmts.kFitToMargin;
  let gHasSetLongListFormat = false;
  export function longListFormatAsSingleColum() {
      gLongListFormatAsSingleColumn = LongListFmts.kSingleColumn;
      gHasSetLongListFormat = true;
  }
  export function resetLongListFormatAsSingleColum() {
      gLongListFormatAsSingleColumn = LongListFmts.kFitToMargin;
      gHasSetLongListFormat = false;
  }
  
  export function indentationForNarrowStyle(): number {
      return gIndentSpaces;
  }

class CustomRes {
    succ: boolean = false;
    res: string = undefined;
}

interface CustomFormatCallback { (startColumn: number, index: number): CustomRes }
class CustomFmtHandler {
    fmtCallback: CustomFormatCallback;
    constructor(handler: CustomFormatCallback) {
        this.fmtCallback = handler;
    }
}

export class Sexpression extends LispAtom {
    atoms: Array<LispAtom | Sexpression>;
    linefeed: string;

    constructor() {
        super(0, 0, "");
        this.atoms = new Array<LispAtom | Sexpression>();
        this.linefeed = "\n";
    }

    setAtoms(atoms: Array<LispAtom | Sexpression>): void {
        this.atoms = atoms;
    }

    addAtom(item) {
        this.atoms.push(item);
    }

    static getRawText(sexpr: Sexpression): string {
        let ret = '';

        if (!sexpr.atoms)
            return ret;

        for (let atom of sexpr.atoms) {
            if (atom instanceof Sexpression) {
                ret += this.getRawText(atom as Sexpression);
            }
            else {
                ret += atom.symbol;
            }
            ret += ' ';
        }

        return ret;
    }

    getAtomFromPos(loc: Position): LispAtom {
        var line = loc.line;
        var col = loc.character;
        for (var i = 0; i < this.atoms.length; i++) {
            if (this.atoms[i] instanceof Sexpression) {
                var sexpr = this.atoms[i] as Sexpression;
                var atom = sexpr.getAtomFromPos(loc);
                if (atom != null)
                    return atom;
            }
            else {
                if (line === this.atoms[i].line
                    && col >= this.atoms[i].column
                    && col <= this.atoms[i].column + this.atoms[i].length())
                    return this.atoms[i];
            }
        }

        return null;
    }

    length(): number {
        let res = 0;
        this.atoms.forEach(atom => {
            res += atom.length();
        });
        return res;
    }

    symbLine(last: boolean = true): number {
        if (this.atoms.length == 0)
            return -1;

        if (last) {
            let lastAtom = this.atoms[this.atoms.length - 1];
            return lastAtom.symbLine();
        } else {
            return this.atoms[0].symbLine();
        }
    }


    size(): number {
        return this.atoms.length;
    }

    atomsCount(): number {
        let count = 0;
        for (let index = 0; index < this.atoms.length; index++) {
            if (this.atoms[index] instanceof Sexpression) {
                let subExpr = this.atoms[index] as Sexpression;
                count += subExpr.atomsCount();
            }
            else if (!this.atoms[index].isLeftParen()
                && !this.atoms[index].isRightParen())
                count += 1;
        }
        return count;
    }

    private addNewLine(numBlanks: number): string {
        let res = "";
        res += this.linefeed;
        res += " ".repeat(numBlanks);
        return res;
    }

    private isRightParenAtIndex(index: number): boolean {
        if (index == this.atoms.length - 1 && this.atoms[index].isRightParen()) {
            return true;
        }
        return false;
    }

    private isMultilineString(res: string): boolean {
        if (res.indexOf("\n") > -1 || res.indexOf(this.linefeed) > -1) {
            return true;
        }
        return false;
    }

    private formatSetq(startColumn: number): string {
        // compute the "variable" column width
        let secondColumnWidth = 0;
        let realAtoms: number[] = [];
        for (let i = 0; i < this.atoms.length; i++) {
            if (this.atoms[i].isComment())
                continue;
            realAtoms.push(i);
        }
        for (let m = 2; m < realAtoms.length; m += 2) {
            let index = realAtoms[m];
            if (this.atoms[index].length() > secondColumnWidth)
                secondColumnWidth = this.atoms[index].length();
        }

        let res = "";

        let firstLine = "";
        // ( symbol
        let cont = Sexpression.format(this.atoms[0], startColumn);
        firstLine += cont;

        // handle comment
        let startIndex = 1;
        for (; startIndex < this.atoms.length; startIndex++) {
            if (this.atoms[startIndex].isComment()) {
                firstLine += Sexpression.format(this.atoms[startIndex], startColumn);
                firstLine += this.addNewLine(startColumn + 1);
            }
            else {
                // setq symbol
                cont = Sexpression.format(this.atoms[startIndex], startColumn);
                firstLine += cont;
                firstLine += " ";
                break;
            }
        }

        res += firstLine;

        let setqPrefixLength = 6; // (setq length, no regard the comment length
        let variblesColumnPos = startColumn + setqPrefixLength;
        let lastVariableIndex = 0;
        let hasCloseParen = false;
        for (let i = startIndex + 1; i < this.atoms.length; i++) {

            if (this.isRightParenAtIndex(i)) {
                hasCloseParen = true;
                break;
            }

            if (this.atoms[i].isComment()) {
                res += " " + Sexpression.format(this.atoms[i], startColumn);
                res += this.addNewLine(variblesColumnPos);
                continue;
            }

            let atomIndex = realAtoms.indexOf(i);
            if (atomIndex % 2 == 0) {
                // varaible column
                let varColumn = Sexpression.format(this.atoms[i], variblesColumnPos);
                res += varColumn;

                lastVariableIndex = i;
            } else if (atomIndex > -1) {
                // value column
                let varColumn = Sexpression.format(this.atoms[lastVariableIndex], variblesColumnPos);
                let numspaces = secondColumnWidth - varColumn.length;
                if (realAtoms.indexOf(i - 1) == -1) {
                    numspaces = secondColumnWidth;
                }
                res += " ".repeat(numspaces);
                res += " ";

                // The 1 is the 1 blank space
                res += Sexpression.format(this.atoms[i], variblesColumnPos + secondColumnWidth + 1);

                let nextAtom = this.atoms[i + 1];
                if (!this.isRightParenAtIndex(i + 1) && nextAtom && !nextAtom.isComment()) {
                    res += this.addNewLine(variblesColumnPos);
                }
            }
        }

        // Last atom maybe )
        if (hasCloseParen) {

            let closeParenStr = this.formatLastAtom(startColumn, variblesColumnPos, this.isMultilineString(res));
            // Try to remove the extra line feed if the last atom is comment
            if (closeParenStr.startsWith(this.linefeed)) {
                let lastlinefeed = res.lastIndexOf(this.linefeed);
                if (lastlinefeed > 0) {
                    let laststr = res.substr(lastlinefeed);
                    laststr = laststr.trimRight();
                    if (laststr.length == 0) {
                        res = res.trimRight();
                    }
                }
            }
            res += closeParenStr;
        }

        return res;
    }

    public formatListToFillMargin(startColumn: number, alignCol?: number): string {
        let res = "";

        let leftMargin = gMaxLineChars - startColumn;
        let line = Sexpression.format(this.atoms[0], startColumn);
        let lineLen = line.length + startColumn;
        let firstColWidth = line.length > 8 ? gIndentSpaces : line.length;
        let secondColWidth = 0;
        let alignWidth = firstColWidth;
        let hasCloseParen = false;
        for (let i = 1; i < this.atoms.length; i++) {

            if (this.isRightParenAtIndex(i)) {
                hasCloseParen = true;
                break;
            }

            let realLineCont = line.trim();
            let trylayoutCont = Sexpression.format(this.atoms[i], lineLen);
            let col = trylayoutCont.search("\n");
            let thisColWidth = col == -1 ? this.atoms[i].length() : col;
            let isProperLength = (): boolean => {
                if (realLineCont.length + thisColWidth < leftMargin)
                    return true;
                return false;
            }

            if (!this.atoms[i].isLineComment() && isProperLength()) {

                line += trylayoutCont;
                line += " ";
                lineLen += trylayoutCont.length + 1;

                if (secondColWidth == 0) {
                    secondColWidth = firstColWidth + this.atoms[i].length() + 1;
                    if (alignCol != undefined) {
                        alignWidth = secondColWidth;
                    }
                }

            } else if (this.atoms[i].isLineComment()) {

                res += line;
                if (!this.atoms[i - 1].isLineComment()
                    && this.atoms[i].symbLine() != this.atoms[i - 1].symbLine()) {
                    res += this.addNewLine(startColumn + alignWidth);
                }
                res += Sexpression.format(this.atoms[i], startColumn + alignWidth);
                if (i + 1 < this.atoms.length && !this.isRightParenAtIndex(i + 1))
                    res += this.addNewLine(startColumn + alignWidth);

                line = "";

                lineLen = startColumn;
            } else {
                res += line;

                line = "";
                line += this.addNewLine(startColumn + alignWidth);
                line += Sexpression.format(this.atoms[i], startColumn + alignWidth);
                line += " "
                lineLen = line.length;
            }
        }

        if (line != "")
            res += line;

        // Last atom may be )
        if (hasCloseParen) {
            // trim the extra blanks before )
            res = res.trimRight();
            res += this.formatLastAtom(startColumn, startColumn, this.isMultilineString(res));
        }

        return res;
    }

    public formatListAsColumn(startColumn: number, alignCol?: number): string {
        if (gLongListFormatAsSingleColumn == LongListFmts.kWideStyleSingleCol)
            return this.formatList(startColumn, 2, false, 1);

        if (startColumn + this.length() + this.atomsCount() < gMaxLineChars)
            return this.formatAsPlainStyle(startColumn);

        return this.formatListToFillMargin(startColumn, alignCol);
    }

    private formatDefun(startColumn: number): string {
        let handledParam = false;
        let paramListFormatter = (startColumn: number, index: number): CustomRes => {
            let atom = this.atoms[index];
            if (!handledParam && atom instanceof Sexpression) {
                handledParam = true;
                let expr = atom as Sexpression;
                return { succ: true, res: expr.formatListAsColumn(startColumn) };
            } else return { succ: false, res: undefined };
        }

        let paramsCustomCall = new CustomFmtHandler(paramListFormatter);
        let firstlineatoms = 4;
        let res = this.formatList(startColumn, firstlineatoms, false, undefined, paramsCustomCall);
        return res;
    }

    private formatLastAtom(startColumn: number, columnWidth: number, addedNewLine?: boolean): string {
        let res = "";
        let lastAtom = this.atoms[this.atoms.length - 1];
        if (lastAtom.isRightParen()) {
            if (!addedNewLine || gClosedParenInSameLine) {
                if (!this.atoms[this.atoms.length - 2].isLineComment())
                    return res += Sexpression.format(lastAtom, 0);
            }
        }

        if (lastAtom.isRightParen())
            columnWidth = startColumn;
        res += this.addNewLine(columnWidth);

        res += Sexpression.format(lastAtom, columnWidth);

        return res;
    }

    private formatLambda(startColumn: number): string {
        let handledParam = false;
        let paramListFormatter = (startColumn: number, index: number): CustomRes => {
            let atom = this.atoms[index];
            if (!handledParam && atom instanceof Sexpression) {
                handledParam = true;
                let expr = atom as Sexpression;
                let res;
                if (expr.canBeFormatAsPlain(startColumn))
                    res = expr.formatAsPlainStyle(startColumn);
                else res = expr.formatListAsColumn(startColumn);
                return { succ: true, res: res };
            } else return { succ: false, res: undefined };
        }

        let paramsCustomCall = new CustomFmtHandler(paramListFormatter);
        let res = this.formatList(startColumn, 3, false, undefined, paramsCustomCall);
        return res;
    }


    private formatList(startColumn: number, firstlineAtomCount: number, isCond?: boolean, alignIndex?: number,
        customFmtHander?: CustomFmtHandler): string {
        let res = "";
        let firstcolumnWdith = 0;
        let lastIndex = firstlineAtomCount;

        let alignItemIndex = 2;
        if (alignIndex)
            alignItemIndex = alignIndex;

        let firstLine = "";
        let prevAtom = "";
        for (let i = 0; i < firstlineAtomCount && i < this.atoms.length - 1; i++) {

            if (startColumn + firstLine.length > gMaxLineChars) {
                lastIndex = i;
                break;
            }
            if (this.atoms[i].isLineComment()) {
                lastIndex = i;
                break;
            }
            let cont;
            let cusRes = new CustomRes();
            if (customFmtHander) {
                cusRes = customFmtHander.fmtCallback(startColumn + firstLine.length, i);
            }
            if (cusRes.succ)
                cont = cusRes.res;
            else {
                cont = Sexpression.format(this.atoms[i], startColumn + firstLine.length, isCond);
                // There is no space for plain format, so it needs to do narrow style format
                if (prevAtom != "(" && prevAtom != "\'") {
                    if (cont.indexOf("\n") != -1) {
                        firstcolumnWdith = gIndentSpaces;
                        lastIndex = i;
                        break;
                    }
                }
            }

            firstLine += cont;
            prevAtom = cont;
            if (cont != "(" && cont != "\'")
                firstLine += " ";

            if (i < alignItemIndex)
                firstcolumnWdith = firstLine.length;
            lastIndex = i + 1;
        }
        res += firstLine;

        let hasCloseParen = false;
        if (alignIndex == undefined || !alignIndex) {
            if (firstcolumnWdith > gIndentSpaces)
                firstcolumnWdith = gIndentSpaces;
        }
        let columnWidth = startColumn + firstcolumnWdith;

        for (let j = lastIndex; j < this.atoms.length; j++) {
            if (this.isRightParenAtIndex(j)) {
                hasCloseParen = true;
                break;
            }

            if (this.atoms[j].isLineComment() && this.atoms[j - 1].symbLine() == this.atoms[j].symbLine()) {
                let comment = Sexpression.format(this.atoms[j], columnWidth);
                res += " " + comment;
                continue;
            }

            let prevAtom = j - 1;
            if (prevAtom >= 0) {
                let m = this.atoms[j - 1].symbLine(true) + 1;
                let curAtomLine = this.atoms[j].symbLine(false);
                for (; m < curAtomLine; m++) {
                    res += this.linefeed;
                }
            }
            if (j != lastIndex || firstlineAtomCount != 1) {
                res += this.addNewLine(columnWidth);
            }

            let thisatom;
            let cusRes = new CustomRes();
            if (customFmtHander) {
                cusRes = customFmtHander.fmtCallback(columnWidth, j);
            }
            if (cusRes.succ)
                thisatom = cusRes.res;
            else
                thisatom = Sexpression.format(this.atoms[j], columnWidth, isCond);

            res += thisatom;
        }

        // Last atom may be )
        if (hasCloseParen)
            res += this.formatLastAtom(startColumn, columnWidth, this.isMultilineString(res));

        return res;
    }

    private formatForeach(startColumn: number): string {
        return this.formatList(startColumn, 4);
    }

    public formatAsPlainStyle(startColumn: number): string {
        let res = "";
        let startPos = startColumn;
        for (let i = 0; i < this.atoms.length; i++) {
            let cont = Sexpression.format(this.atoms[i], startPos);
            res += cont;
            startPos += cont.length;

            if (this.atoms[i].isLineComment()) {
                res += this.addNewLine(startColumn);
                startPos = startColumn;
                continue;
            }

            if (!this.atoms[i].isLeftParen()
                && i < this.atoms.length - 1
                && !this.atoms[i + 1].isRightParen()) {
                res += " ";
                startPos += 1;
            }
        }
        return res;
    }

    private isQuote(): boolean {
        if (this.atoms.length < 2 || this.atoms[0].symbol != "\'")
            return false;
        return true;
    }
    private formatQuote(startColumn: number): string {
        let quoteBody = this.atoms.slice(1);
        let quoteExpr = new Sexpression();
        quoteExpr.setAtoms(quoteBody);

        let purgeAtoms = quoteExpr.isPureList();

        if (purgeAtoms && !this.canBeFormatAsPlain(startColumn))
            return "\'" + quoteExpr.formatListAsColumn(startColumn + 1);
        else
            return "\'" + Sexpression.format(quoteExpr, startColumn + 1, true);
    }

    private formatListAsNarrowStyle(startColumn: number): string {
        return this.formatList(startColumn, 2, false);
    }

    private formatListAsWideStyle(startColumn: number): string {
        return this.formatList(startColumn, 3, false, 2);
    }

    private isDotPairs(): boolean {
        if (this.atoms.length == 5) {
            for (let i = 0; i < this.atoms.length; i++) {
                let atom = this.atoms[i];
                if (atom instanceof LispAtom) {
                    if (atom.symbol == ".")
                        return true;
                }
            }
        }
        return false;
    }

    private getLispOperator(): LispAtom {
        if (!this.atoms[0].isLeftParen())
            return this.atoms[0];
        for (let i = 1; i < this.atoms.length; i++) {
            if (!this.atoms[i].isComment())
                return this.atoms[i];
        }
    }

    public isPureList(): boolean {
        for (let i = 0; i < this.atoms.length; i++) {
            if (this.atoms[i] instanceof Sexpression)
                return false;
        }

        return true;
    }

    public isPureLongList(): boolean {
        if (this.atoms.length > 7) {
            return this.isPureList();
        }

        return false;
    }

    private isSameLineInRawText(): boolean {
        let line = this.atoms[0].line;

        for (let i = 1; i < this.atoms.length; i++) {
            if (this.atoms.length - 1 == i) {
                if (this.atoms[i].isRightParen())
                    break;
            }
            if (this.atoms[i].line != line)
                return false;
        }

        return true;
    }

    // wide style formatting only applies to the case which fit the conditions:
    // 1. The operator is public autolisp APIs
    // 2. The operator and its first operand are in the same line before formatting
    //
    shouldFormatWideStyle(startColumn: number): boolean {
        if (this.atoms.length < 3)
            return false;

        let nearEndLine = (index: number): boolean => {
            if (index > gMaxLineChars * 0.8)
                return true;

            return false;
        }
        // function parameters long list is controled in defun formatter
        if (this.isPureLongList() && gLongListFormatAsSingleColumn == LongListFmts.kWideStyleSingleCol && !nearEndLine(startColumn))
            return true;

        let op = this.getLispOperator();
        let opName = op.symbol.toLowerCase();
        if (!isInternalAutoLispOp(opName))
            return false;

        if (this.canBeFormatAsPlain(startColumn))
            return false;

        let opIndex = 0;
        if (this.atoms[0].isLeftParen())
            opIndex = 1;

        if (this.atoms[opIndex].line == this.atoms[opIndex + 1].line)
            return true;

        return false;
    }

    private canBeFormatAsPlain(startColumn: number): boolean {
        // Even if the expression is short, but in the raw text there is a linefeed, then
        // it formats as nonplain style.
        if (!this.isSameLineInRawText())
            return false;

        let op = this.getLispOperator();
        if (op == undefined)
            return true;
        let opsym = op.symbol;

        // setq can not layout in the same line
        if (opsym == "setq") {
            if (this.size() > 5)
                return false
        }

        for (let i = 2; i < this.atoms.length; i++) {
            if (this.atoms[i] instanceof Sexpression) {
                let subSxpr = this.atoms[i] as Sexpression;
                if (!subSxpr.canBeFormatAsPlain(startColumn))
                    return false;
            }
            else if (this.atoms[i].isLineComment() && i < this.atoms.length - 1)
                return false;
        }

        let tryFmtStr = Sexpression.format(op, startColumn);
        if (tryFmtStr.indexOf("\n") != -1)
            return false;

        if (this.isPureLongList() && gLongListFormatAsSingleColumn == LongListFmts.kWideStyleSingleCol)
            return false;

        if (startColumn + this.length() + this.atomsCount() < gMaxLineChars)
            return true;

        return false;
    }

    public isValidSexpr(): boolean {
        if (this.atoms.length === 0) {
            return true;
        }

        for (let i = 0; i < this.atoms.length; i++) {
            const lispObj = this.atoms[i];
            if (lispObj instanceof Sexpression && !lispObj.isValidSexpr()) {
                return false;
            }
        }

        if (this.isQuote()) {
            let quoteBody = this.atoms.slice(1);
            let quoteExpr = new Sexpression();
            quoteExpr.setAtoms(quoteBody);
            return quoteExpr.isValidSexpr();
        }

        let hasLeftParen = this.atoms[0].isLeftParen();
        let hasRightParen = this.atoms[this.atoms.length - 1].isRightParen();
        if (hasLeftParen === hasRightParen) {
            return true;
        }
        return false;
    }

    /* There are 3 formating styles: 
    NARROW FORMATTING STYLE
    Looks like
    ;--------------------------------------------------
    (XXXX
        yyyy
        ...)
    ;--------------------------------------------------
    PLAIN FORMATTING STYLE
    The expression is formatted in PLAIN STYLE if its opening and
    closing parenthesis stands on the same text line.
    WIDE FORMATTING STYLE
    Looks like
    ;--------------------------------------------------
    (XXXX yyyy
               ...)
    ;-------------------------------------------------- */
    //
    //
    // The formatter has two seperate steps:
    // a. Tokenize: break into the lisp code into individual syntax atoms
    // b. Assemable the tokens to expected format
    //
    // For the second phase it is a recursive algorithm. It layouts the tokens from top to bottom,
    // from left to right. And it follows the bellow rules to handle the individual cases:
    // 1. For the Autolisp builtin APIs if the operator and the first operand are in the same
    //    before formatting, it will use "wide format style". For other cases it uses the "Narrow
    //    format style".
    // 2. function parameters and the pure long list can be layout single column or fit to margin
    // 3. If the space is enough, use the plain format style except the keywords mentioned in 1
    // 4. Dot pairs as (test . 1234) should always as plain style
    // 5. Line comments (; ;; ;;; ;_) stay at the same line before formatting,
    //    If it is in one line, it has the same indent in that scope.
    //    And we treat the block comments as a common atom
    //
    // All the atom index start from 0, and include the left parenthes
    static format(exp: LispAtom|Sexpression, startColumn: number, asCond?: boolean): string {
        if (exp instanceof Sexpression) {
            let length = exp.length();
            if (exp.isDotPairs()) {
                return exp.formatAsPlainStyle(startColumn);
            }
            else if (exp.isQuote()) {
                return exp.formatQuote(startColumn);
            }
            else if (length > 4) {
                let lispOperator = exp.getLispOperator();
                if (exp.atoms[0].isLeftParen() &&
                    !exp.canBeFormatAsPlain(startColumn)) {
    
                    let opName = lispOperator.symbol.toLowerCase();
    
                    if (opName == "if" || opName == "repeat" || opName == "while")
                        return exp.formatList(startColumn, 3);
                    if (opName == "lambda")
                        return exp.formatLambda(startColumn);
                    else if (opName == "cond")
                        return exp.formatList(startColumn, 2, true);
                    else if (opName == "setq") {
                        return exp.formatSetq(startColumn);
                    }
                    else if (opName == "foreach") {
                        return exp.formatForeach(startColumn);
                    }
                    else if (opName == "defun" || opName == "defun-q") {
                        return exp.formatDefun(startColumn);
                    } else if (exp.isPureLongList() && gLongListFormatAsSingleColumn == LongListFmts.kFitToMargin)
                        return exp.formatListAsColumn(startColumn, 3);
    
                    if (asCond) {
                        // cond branch internal expression align with the outer left parenthes
                        return exp.formatList(startColumn, 1);
                    }
    
                    if (exp.shouldFormatWideStyle(startColumn))
                        return exp.formatListAsWideStyle(startColumn);
                    else {
                        return exp.formatListAsNarrowStyle(startColumn);
                    }
                }
            }
    
            return exp.formatAsPlainStyle(startColumn);
        } else { // was LispAtom
            return exp.symbol;
        }
    }

    formatting(startColumn: number, linefeed?: string): string {

        gMaxLineChars = maximumLineChars();
        if (gMaxLineChars < 60)
            gMaxLineChars = 60;

        gIndentSpaces = indentSpaces();
        if (gIndentSpaces < 1)
            gIndentSpaces = 1;
        else if (gIndentSpaces > 6)
            gIndentSpaces = 6;

        let parenStyle = closeParenStyle();
        if (parenStyle.toString() == "Same line")
            gClosedParenInSameLine = true;
        else gClosedParenInSameLine = false;

        if (!gHasSetLongListFormat) {
            let listFmtStyle = longListFormatStyle();
            if (listFmtStyle.toString() == "Single column")
                gLongListFormatAsSingleColumn = LongListFmts.kWideStyleSingleCol;
            else gLongListFormatAsSingleColumn = LongListFmts.kFitToMargin;
        }

        if (linefeed)
            this.linefeed = linefeed;

        return Sexpression.format(this, startColumn);
    }

}
