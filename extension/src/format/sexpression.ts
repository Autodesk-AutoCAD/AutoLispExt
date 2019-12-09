import * as vscode from 'vscode';
import { assert } from 'console';

let gMaxLineChars = 80;
let gIndentSpaces = 4;
let gClosedParenInSameLine = true;

class LispSymbolConst {
    static LIST_LPAR = '(';
    static LIST_RPAR = ')';
    static LISP_QUO = '\'';
    static STR_QUO = '\"';
}

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
}

export class Sexpression extends LispAtom {
    atoms: Array<LispAtom | Sexpression>;

    constructor() {
        super(0, 0, "");
        this.atoms = new Array<LispAtom | Sexpression>();
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

    private formatSetq(startColumn: number): string {
        // compute the "variable" column width
        let secondColumnWidth = 0;
        for (let i = 2; i < this.atoms.length; i += 2) {
            if (this.atoms[i].length() > secondColumnWidth)
                secondColumnWidth = this.atoms[i].length();
        }

        let res = "";

        let firstLine = "";
        // ( symbol
        let cont = this.atoms[0].format(startColumn);
        firstLine += cont;

        // first symbol
        cont = this.atoms[1].format(startColumn);
        firstLine += cont;
        firstLine += " ";

        res += firstLine;

        let setqPrefixLength = 6; // (setq length
        let variblesColumnPos = startColumn + setqPrefixLength;
        for (let i = 2; i < this.atoms.length - 1; i += 2) {

            if (i > 2) {
                res += "\n";
                res += " ".repeat(variblesColumnPos);
            }
            let varColumn = this.atoms[i].format(variblesColumnPos);
            res += varColumn;

            if (i < this.atoms.length - 1) {
                let numspaces = secondColumnWidth - varColumn.length;
                if (numspaces > 0) {
                    res += " ".repeat(numspaces);
                }
                res += " ";
                res += this.atoms[i + 1].format(variblesColumnPos + secondColumnWidth + 1);
            }
        }

        // Last atom maybe )
        res += this.formatLastAtom(startColumn, variblesColumnPos);

        return res;
    }

    public formatListAsColumn(startColumn: number): string {
        if (startColumn + this.length() < gMaxLineChars)
            return this.formatAsPlainStyle(startColumn);

        return this.formatList(startColumn, 1);
    }

    private formatDefun(startColumn: number): string {
        let res = "";

        let firstLine = "";
        // ( symbol
        let cont = this.atoms[0].format(startColumn);
        firstLine += cont;

        // defun symbol
        cont = this.atoms[1].format(startColumn);
        firstLine += cont;
        firstLine += " ";

        // function name
        cont = this.atoms[2].format(startColumn);
        firstLine += cont;
        firstLine += " ";

        res += firstLine;

        let args = this.atoms[3];
        if (args instanceof Sexpression) {
            let argsColumnPos = startColumn + firstLine.length;
            res += args.formatListAsColumn(argsColumnPos);
        } else
            res += this.atoms[3].format(startColumn);

        let columnWidth = startColumn + gIndentSpaces;
        for (let i = 4; i < this.atoms.length - 1; i++) {
            if (this.atoms[i].isLineComment() && this.atoms[i - 1].line == this.atoms[i].line) {
                let comment = this.atoms[i].format(columnWidth);
                res += " " + comment;
                continue;
            }

            res += "\n";
            res += " ".repeat(columnWidth);

            res += this.atoms[i].format(columnWidth);
        }

        // Last atom maybe )
        res += this.formatLastAtom(startColumn, columnWidth);

        return res;
    }

    private createAndFormatQuote(startColumn: number, index: number): string {
        let res = "";
        let nextAtom = this.atoms[index + 1];
        if (nextAtom instanceof Sexpression) {
            let quoteExpr = new Sexpression();
            quoteExpr.line = this.atoms[index].line;
            quoteExpr.column = this.atoms[index].column;
            quoteExpr.addAtom(this.atoms[index]);
            quoteExpr.addAtom(nextAtom);
            res += quoteExpr.format(startColumn);
        }

        return res;
    }

    private formatLastAtom(startColumn: number, columnWidth: number): string {
        let res = "";
        if (this.atoms[this.atoms.length - 1].isRightParen()) {
            if (gClosedParenInSameLine) {
                if (!this.atoms[this.atoms.length - 2].isLineComment())
                    return res += this.atoms[this.atoms.length - 1].format(0);
            }
        }

        res += "\n";
        if (this.atoms[this.atoms.length - 1].isRightParen())
            columnWidth = startColumn;
        res += " ".repeat(columnWidth);
        res += this.atoms[this.atoms.length - 1].format(columnWidth);

        return res;
    }

    private formatList(startColumn: number, firstlineAtomCount: number, isCond?: boolean): string {
        let res = "";
        let firstcolumnWdith = 0;
        let lastIndex = firstlineAtomCount;

        let firstLine = "";
        for (let i = 0; i < firstlineAtomCount && i < this.atoms.length - 1; i++) {
            let cont = this.atoms[i].format(startColumn + firstLine.length, isCond);
            if (cont == "\'") {
                let quotestr = this.createAndFormatQuote(startColumn + firstLine.length, i);
                if (quotestr != "") {
                    firstLine += quotestr;

                    lastIndex = i + 2;
                    break;
                }
            }

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

        let columnWidth = startColumn + firstcolumnWdith;
        for (let j = lastIndex; j < this.atoms.length - 1; j++) {
            if (this.atoms[j].isLineComment() && this.atoms[j - 1].line == this.atoms[j].line) {
                let comment = this.atoms[j].format(columnWidth);
                res += " " + comment;
                continue;
            }

            if (j != lastIndex || firstlineAtomCount != 1) {
                res += "\n";
                res += " ".repeat(columnWidth);
            }

            let thisatom = this.atoms[j].format(columnWidth, isCond);
            if (thisatom == "\'") {
                let quotestr = this.createAndFormatQuote(columnWidth, j);
                if (quotestr != "") {
                    res += quotestr;
                    j++;
                    continue;
                }
            }

            res += thisatom;
        }

        // Last atom may be )
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
                res += "\n";
                res += " ".repeat(startColumn);
                continue;
            }

            if (i != 0 && i < this.atoms.length - 2)
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
        let quoteExpr = this.atoms[1] as Sexpression;
        if (quoteExpr == undefined) {
            vscode.window.showErrorMessage("Unbalanced token found.");
            return null;
        }
        // 
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
        for (let i = 1; i < this.atoms.length; i++) {
            if (!this.atoms[i].isComment())
                return this.atoms[i];
        }
    }
    // 1. If and cond always use wide format style
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
            if (this.atoms[0].symbol == "(" && lispOperator instanceof LispAtom) {
                let opName = lispOperator.symbol.toLowerCase();
                if (opName == "if")
                    return this.formatList(startColumn, 3);
                if (opName == "cond")
                    return this.formatList(startColumn, 3, true);

                if (startColumn + length > gMaxLineChars) {
                    if (opName == "setq") {
                        return this.formatSetq(startColumn);
                    }
                    else if (opName == "defun") {
                        return this.formatDefun(startColumn);
                    }
                    else if (opName == "foreach") {
                        return this.formatForeach(startColumn);
                    }
                    else if (opName == "progn") {
                        return this.formatProgn(startColumn);
                    }

                    let listAlignColumn = 3;
                    if (asCond != undefined) {
                        listAlignColumn = 1;
                    }
                    return this.formatList(startColumn, listAlignColumn);
                }
            }
        }

        return this.formatAsPlainStyle(startColumn);
    }

    formatting(): string {
        return this.format(0);
    }
} 
