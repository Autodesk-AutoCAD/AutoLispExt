import * as vscode from 'vscode';
import { assert } from 'console';

import { closeParenStyle, maximumLineChars, longListFormatStyle } from '../config'

let gMaxLineChars = 80;
let gIndentSpaces = 4;
let gClosedParenInSameLine = true;
let gLongListFormatAsSingleColumn = false;

export class LispAtom {
    public symbol: string;
    public line: number;
    public column: number;

    constructor(line, column, sym) {
        this.line = line;
        this.column = column;
        this.symbol = sym;
    }
    length(): number {
        return this.symbol.length;
    }
    format(startColumn: number): string {
        return this.symbol;
    }

    isLineComment(): boolean {
        if (this.symbol.startsWith(";")
            && !this.symbol.startsWith(";|"))
            return true;
        return false;
    }

    isComment(): boolean {
        if (this.symbol.startsWith(";"))
            return true;
        return false;
    }

    isRightParen(): boolean {
        if (this.symbol == ")")
            return true;
        return false;
    }
    isLeftParen(): boolean {
        if (this.symbol == "(")
            return true;
        return false;
    }
    isDefun(): boolean {
        if((this.symbol != null) && (this.symbol.toLowerCase() == "defun"))
            return true;

        return false;
    }
}

export class Sexpression extends LispAtom {
    atoms: Array<LispAtom | Sexpression>;

    constructor() {
        super(0, 0, "");
        this.atoms = new Array<LispAtom | Sexpression>();
    }

    setAtoms(atoms: Array<LispAtom | Sexpression>): void {
        this.atoms = atoms;
    }

    addAtom(item) {
        this.atoms.push(item);
    }

    length(): number {
        let res = 0;
        this.atoms.forEach(atom => {
            res += atom.length();
        });
        return res;
    }

    size(): number {
        return this.atoms.length;
    }

    private addNewLine(numBlanks: number): string {
        let res = "";
        res += "\n";
        res += " ".repeat(numBlanks);
        return res;
    }

    private isRightParenAtIndex(index: number): boolean {
        if (index == this.atoms.length - 1 && this.atoms[index].isRightParen()) {
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
        let cont = this.atoms[0].format(startColumn);
        firstLine += cont;

        // handle comment
        let startIndex = 1;
        for (; startIndex < this.atoms.length - 1; startIndex++) {
            if (this.atoms[startIndex].isComment()) {
                firstLine += this.atoms[startIndex].format(startColumn);
                firstLine += "\n";
                firstLine += " ".repeat(startColumn + 1);
            }
            else {
                // setq symbol
                cont = this.atoms[startIndex].format(startColumn);
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
                res += " " + this.atoms[i].format(startColumn);
                res += this.addNewLine(variblesColumnPos);
                continue;
            }

            let atomIndex = realAtoms.indexOf(i);
            if (atomIndex % 2 == 0) {
                // varaible column
                let varColumn = this.atoms[i].format(variblesColumnPos);
                res += varColumn;

                lastVariableIndex = i;
            } else if (atomIndex > -1) {
                // value column
                let varColumn = this.atoms[lastVariableIndex].format(variblesColumnPos);
                let numspaces = secondColumnWidth - varColumn.length;
                if (realAtoms.indexOf(i - 1) == -1) {
                    numspaces = secondColumnWidth;
                }
                res += " ".repeat(numspaces);
                res += " ";

                // The 1 is the 1 blank space
                res += this.atoms[i].format(variblesColumnPos + secondColumnWidth + 1);

                if (!this.isRightParenAtIndex(i + 1))
                    res += this.addNewLine(variblesColumnPos);
            }
        }

        // Last atom maybe )
        if (hasCloseParen)
            res += this.formatLastAtom(startColumn, variblesColumnPos);

        return res;
    }

    public formatListToFillMargin(startColumn: number, alignCol?: number): string {
        let res = "";

        let leftMargin = gMaxLineChars - startColumn;
        let line = this.atoms[0].format(startColumn);
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
            let trylayoutCont = this.atoms[i].format(startColumn + line.length);
            let col = trylayoutCont.search("\n");
            let thisColWidth = col == -1 ? this.atoms[i].length() : col;
            if (!this.atoms[i].isLineComment() && realLineCont.length + thisColWidth < leftMargin) {

                line += trylayoutCont;
                line += " ";

                if (secondColWidth == 0) {
                    secondColWidth = firstColWidth + this.atoms[i].length() + 1;
                    if (alignCol != undefined)
                        alignWidth = secondColWidth;
                }

            } else if (this.atoms[i].isLineComment()) {

                res += line;
                if (!this.atoms[i - 1].isLineComment()
                    && this.atoms[i].line != this.atoms[i - 1].line) {
                    res += this.addNewLine(startColumn + alignWidth);
                }
                res += this.atoms[i].format(startColumn + alignWidth);
                if (i + 1 < this.atoms.length && !this.isRightParenAtIndex(i + 1))
                    res += this.addNewLine(startColumn + alignWidth);

                line = "";

            } else {
                res += line;

                line = "";
                line += this.addNewLine(startColumn + alignWidth);
                line += this.atoms[i].format(startColumn + alignWidth);
                line += " "
            }
        }

        if (line != "")
            res += line;

        // Last atom may be )
        if (hasCloseParen)
            res += this.formatLastAtom(startColumn, startColumn);

        return res;
    }

    public formatListAsColumn(startColumn: number, alignCol?: number): string {
        if (startColumn + this.length() < gMaxLineChars)
            return this.formatAsPlainStyle(startColumn);

        if (gLongListFormatAsSingleColumn)
            return this.formatList(startColumn, alignCol == undefined ? 1 : alignCol);

        return this.formatListToFillMargin(startColumn, alignCol);
    }

    private formatDefun(startColumn: number): string {
        let res = "";

        let firstLine = "";
        // ( symbol
        let cont = this.atoms[0].format(startColumn);
        firstLine += cont;

        let argsInSepLine = false;
        let funcBodyStartIndex = 1;
        for (let k = 1; k < this.atoms.length - 1; k++) {
            if (this.atoms[k].isLineComment()) {
                firstLine += this.atoms[k].format(startColumn);
                firstLine += "\n";
                firstLine += " ".repeat(startColumn + gIndentSpaces);

                argsInSepLine = true;
            }
            else {
                // handle defun and function name and parameters
                let args = this.atoms[k];
                if (args instanceof Sexpression) {
                    let argsColumnPos = argsInSepLine ? startColumn + gIndentSpaces : startColumn + firstLine.length;

                    firstLine += args.formatListAsColumn(argsColumnPos);

                    funcBodyStartIndex = k + 1;
                    res += firstLine;
                    res += " ";
                    break;
                }
                cont = this.atoms[k].format(startColumn);
                firstLine += cont;
                firstLine += " ";
            }
        }

        let hasCloseParen = false;
        let columnWidth = startColumn + gIndentSpaces;
        for (let i = funcBodyStartIndex; i < this.atoms.length; i++) {
            if (this.isRightParenAtIndex(i)) {
                hasCloseParen = true;
                break;
            }

            if (this.atoms[i].isLineComment() && this.atoms[i - 1].line == this.atoms[i].line) {
                let comment = this.atoms[i].format(columnWidth);
                res += " " + comment;
                continue;
            }

            res += this.addNewLine(columnWidth);

            res += this.atoms[i].format(columnWidth);
        }

        // Last atom maybe )
        if (hasCloseParen)
            res += this.formatLastAtom(startColumn, columnWidth);

        return res;
    }

    private formatLastAtom(startColumn: number, columnWidth: number): string {
        let res = "";
        let lastAtom = this.atoms[this.atoms.length - 1];
        if (lastAtom.isRightParen()) {
            if (gClosedParenInSameLine) {
                if (!this.atoms[this.atoms.length - 2].isLineComment())
                    return res += lastAtom.format(0);
            }
        }

        if (lastAtom.isRightParen())
            columnWidth = startColumn;
        res += this.addNewLine(columnWidth);

        res += lastAtom.format(columnWidth);

        return res;
    }

    private formatList(startColumn: number, firstlineAtomCount: number, isCond?: boolean): string {
        let res = "";
        let firstcolumnWdith = 0;
        let lastIndex = firstlineAtomCount;

        let firstLine = "";
        for (let i = 0; i < firstlineAtomCount && i < this.atoms.length - 1; i++) {
            if (this.atoms[i].isLineComment()) {
                lastIndex = i + 1;
                break;
            }
            let cont = this.atoms[i].format(startColumn + firstLine.length, isCond);
            firstLine += cont;

            // The previous atom is a sublist and its arrangement is already non-plain style
            if (firstLine.search("\n") != -1) {
                lastIndex = i + 1;
                break;
            }

            if (cont != "(" && cont != "\'")
                firstLine += " ";
            if (i < 2)
                firstcolumnWdith = firstLine.length;
        }
        res += firstLine;

        let hasCloseParen = false;
        let columnWidth = startColumn + firstcolumnWdith;
        for (let j = lastIndex; j < this.atoms.length; j++) {
            if (this.isRightParenAtIndex(j)) {
                hasCloseParen = true;
                break;
            }

            if (this.atoms[j].isLineComment() && this.atoms[j - 1].line == this.atoms[j].line) {
                let comment = this.atoms[j].format(columnWidth);
                res += " " + comment;
                continue;
            }

            if (j != lastIndex || firstlineAtomCount != 1) {
                res += this.addNewLine(columnWidth);
            }

            let thisatom = this.atoms[j].format(columnWidth, isCond);
            res += thisatom;
        }

        // Last atom may be )
        if (hasCloseParen)
            res += this.formatLastAtom(startColumn, columnWidth);

        return res;
    }

    private formatForeach(startColumn: number): string {
        return this.formatList(startColumn, 4);
    }

    private formatProgn(startColumn: number): string {
        return this.formatList(startColumn, 2);
    }

    private formatAsPlainStyle(startColumn: number): string {
        let res = "";
        for (let i = 0; i < this.atoms.length; i++) {
            let cont = this.atoms[i].format(startColumn);
            res += cont;
            if (this.atoms[i].isLineComment()) {
                res += this.addNewLine(startColumn);
                continue;
            }

            if (!this.atoms[i].isLeftParen()
                && i < this.atoms.length - 1
                && !this.atoms[i + 1].isRightParen())
                res += " ";
        }
        return res;
    }

    private isQuote(): boolean {
        if (this.atoms.length < 2 || this.atoms[0].symbol != "\'")
            return false;
        return true;
    }
    private formatQuote(startColumn: number) {
        let quoteBody = this.atoms.slice(1);
        let quoteExpr = new Sexpression();
        quoteExpr.setAtoms(quoteBody);

        return "\'" + quoteExpr.formatListAsColumn(startColumn + 1);
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

    // The formatter has two seperate phases:
    // a. Tokenize
    // b. Assemable the tokens to expected format
    // For the second phase it is a recursive algorithm. It layouts the tokens from top to bottom,
    // from left to right. And it follows the bellow rules to handle the individual cases:
    // 1. If and cond always use wide format style even if the space is enough
    // 2. setq defun foreach progn use wide format style if there is no enough space
    // 3. If the space is enough, use the plain format style
    // 4. Dot pairs as (test . 1234) should always as plain style
    // 5. Line comments (; ;; ;;; ;_) stay at the same line before formatting,
    //    If it is in one line, it has the same indent in that scope.
    //    And we treat the block comments as a common atom
    public format(startColumn: number, asCond?: boolean): string {
        let length = this.length();
        if (this.isDotPairs()) {
            return this.formatAsPlainStyle(startColumn);
        }
        else if (this.isQuote()) {
            return this.formatQuote(startColumn);
        }
        else if (length > 4) {
            let lispOperator = this.getLispOperator();
            if (this.atoms[0].isLeftParen()) {
                let opName = lispOperator.symbol.toLowerCase();
                if (opName == "if")
                    return this.formatList(startColumn, 3);
                if (opName == "cond")
                    return this.formatList(startColumn, 3, true);
                if (opName == "defun") {
                    return this.formatDefun(startColumn);
                }

                if (startColumn + length > gMaxLineChars) {
                    if (opName == "setq") {
                        return this.formatSetq(startColumn);
                    }
                    else if (opName == "foreach") {
                        return this.formatForeach(startColumn);
                    }
                    else if (opName == "progn") {
                        return this.formatProgn(startColumn);
                    }

                    if (asCond != undefined) {
                        // cond branch internal expression has special alignment
                        return this.formatList(startColumn, 1);
                    }

                    return this.formatListAsColumn(startColumn, gLongListFormatAsSingleColumn ? 3 : 2);
                }
            }
        }

        return this.formatAsPlainStyle(startColumn);
    }

    formatting(): string {

        gMaxLineChars = maximumLineChars();
        if (gMaxLineChars < 60)
        gMaxLineChars = 60;
        let parenStyle = closeParenStyle();
        if (parenStyle.toString() == "Same Line")
            gClosedParenInSameLine = true;
        else gClosedParenInSameLine = false;

        let listFmtStyle = longListFormatStyle();
        if (listFmtStyle.toString() == "Single column")
            gLongListFormatAsSingleColumn = true;
        else gLongListFormatAsSingleColumn = false;

        return this.format(0);
    }
} 
