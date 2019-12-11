import * as vscode from 'vscode';
import { assert } from 'console';
import { Sexpression } from "./sexpression"
import { LispAtom } from "./sexpression"

enum FormattingStyle {
    Plain = 1,
    Narrow,
    Wide
}

// (defun C:;|comment|;MYCMD (x) ;|inline comment|;
//      (list 1 2 3)			;comment-column comment
//     ;;current-column comment
//;;; 0-column comment
//) ;_ pasted comment 

// (getdist
//       "\nline this is a test for long long one line for s expression"
// )

export class CursorPosition {
    offsetInSelection: number;
    offsetInDocument: number;

    delta(): number {
        return this.offsetInDocument - this.offsetInSelection;
    }
}


class InputStream {
    pos: number;
    line: number;
    col: number;
    text: string;
    len: number;
    constructor(text: string, column: number) {
        this.pos = 0;
        this.line = 0;
        this.col = column;
        this.text = text;
        this.len = text.length;
    }

    peek(incr?: number) {
        let pos = this.pos;
        if (incr != undefined)
            pos += incr;

        if (pos < this.len)
            return this.text.charAt(pos);
        return null;
    };

    next() {
        if (this.pos < this.len) {
            var ch = this.text.charAt(this.pos++);
            if (ch == "\n") {
                ++this.line;
                this.col = 0;
            } else {
                ++this.col;
            }
            return ch;
        }
        return null;
    }
}

export class ListReader {
    input: InputStream;
    cachedLists: Array<Sexpression>;
    constructor(text: string, column: number) {
        this.input = new InputStream(text, column);
        this.cachedLists = new Array<Sexpression>();
    }

    next() { return this.input.next(); };
    peek(incr?: number) { return this.input.peek(incr); };

    read_when(pred) {
        let buf = "", ch;
        while ((ch = this.peek()) && pred(ch)) {
            buf += this.next();
        }
        return buf;
    }
    is_blank(ch: string): boolean {
        switch (ch) {
            case " ":
            case "\n":
            case "\t":
            case "\x0C":
            case "\xA0":
            case "\u2028":
            case "\u2029":
                return true;
		}
		let linefeed = ch == '\r' && this.peek(1) == '\n';
		if (linefeed)
			return true;
		return false;
    }

    skip_blanks() {
        this.read_when((ch) => {
            if (this.is_blank(ch))
                return true;
            let linefeed = ch == '\r' && this.peek(1) == '\n';
            if (linefeed)
                return true;
        });
    }

    read_string() {
        let sline = this.input.line;
        let scol = this.input.col;
        let res = "";
        assert(this.peek() == "\"");

        let ch = this.next();
        res += ch;

        res += this.read_when(function(ch) {
            switch (ch) {
                case "\"":
                    return false;
                default:
                    return true;
            }
        });
        res += this.next();

        let lastList = this.cachedLists[this.cachedLists.length - 1];
        lastList.addAtom(new LispAtom(sline, scol, res));
    }

    read_symbol() {
        let sline = this.input.line;
        let scol = this.input.col;

        let res = this.read_when((ch) => {

            if (this.is_blank(ch))
                return false;

            switch (ch) {
                case ")":
                case "(":
                case ";": // TODO:
                    return false;
                default:
                    return true;
            }
        });

        let lastList = this.cachedLists[this.cachedLists.length - 1];
        lastList.addAtom(new LispAtom(sline, scol, res));
    }

    read_quote() {
        let quote = this.next();
        let lastList = this.cachedLists[this.cachedLists.length - 1];
        lastList.addAtom(new LispAtom(this.input.line, this.input.col, quote));
        return this.read_list();
    }

    read_end_list() {
        this.next();
        let lastList = this.cachedLists[this.cachedLists.length - 1];
        lastList.addAtom(new LispAtom(this.input.line, this.input.col, ")"));
        this.cachedLists.pop();
    }

    read_comment() {
        let sline = this.input.line;
        let scol = this.input.col;

        let res = ";";
        this.next();
        let nextch = this.peek();
        if (nextch == "|") {
            // read block comment ;|.....|;
            res += this.read_when((ch) => {
                switch (ch) {
                    case "|":
                        let c = this.peek(1);
                        if (c == ";")
                            return false;
                }
                return true;
            });
            // read |;
            res += this.next();
            res += this.next();
        } else {
            // read line commented ;...............
            res += this.read_when((ch) => {
                switch (ch) {
                    case "\n":
                        return false;
                    default:
                        return true;
                }
            });
        }

        let lastList = this.cachedLists[this.cachedLists.length - 1];
        lastList.addAtom(new LispAtom(sline, scol, res));
    }

    read_list() {
        let sexpr = new Sexpression();
        sexpr.line = this.input.line;
        sexpr.column = this.input.col;

        let firstAtom = "(";
        sexpr.addAtom(new LispAtom(this.input.line, this.input.col, firstAtom));
        this.cachedLists.push(sexpr);
        this.next();

        while (true) {

            this.skip_blanks();
            let ch = this.peek();

            if (ch == null)
                break;
            else if (ch == ")") {
                this.read_end_list();
                break;
            }

            switch (ch) {
                case "(":
                    let subList = this.read_list();
                    sexpr.addAtom(subList);
                    continue;

                case ";":
                    this.read_comment();
                    continue;

                case "\"":
                    this.read_string();
                    continue;

                case "\'":
                    let nextCh = this.peek(1);
                    if (nextCh != "(") {
                        this.read_symbol();
                    }
                    else {
                        let quoteList = this.read_quote();
                        sexpr.addAtom(quoteList);
                    }
                    continue;

                default:
                    this.read_symbol();
                    continue;
            }
        }
        return sexpr;
    }

    static skipComment(document: vscode.TextDocument, stringInRange: string, startPosOffset: CursorPosition): CursorPosition {
        let inRangeStringLength = stringInRange.length;

        if (startPosOffset.offsetInSelection >= (inRangeStringLength - 1))//it's the final char in the given range;
            return null; //the given range ends with a comment

        if (stringInRange.charAt(startPosOffset.offsetInSelection + 1) == '|') {
            //it's starting a block comment with a ;|

            //searching for the ending of comment

            //the shortest block comment is ;||; with length == 4, so:
            if ((startPosOffset.offsetInSelection + 4) > inRangeStringLength)
                //the rest part of the given range is less than 2 characters; won't have a |; to end the comment
                return null; //let's take the rest as part of an incomplete comment

            var endingOfComment = stringInRange.indexOf("|;", startPosOffset.offsetInSelection + 2);

            if (endingOfComment < (startPosOffset.offsetInSelection + 2)) {
                //no ending |; found; the LSP in the given range is in problem and let's take the whole rest part as a block comment
                return null;
            }

            //return the offset of the char that is right after current block comment

            let endPos = new CursorPosition();
            endPos.offsetInSelection = endingOfComment + 2;
            endPos.offsetInDocument = endPos.offsetInSelection + startPosOffset.delta();

            return endPos;
        }


        //else, the rest of current line is a comment

        //skip the rest of current line
        var cursorPos2d = document.positionAt(startPosOffset.offsetInDocument);

        if (cursorPos2d.line >= (document.lineCount - 1)) {
            //there's no next line
            return null; //the rest of the given range is a comment
        }

        //not the final line; continue to scan the next line
        let next = new vscode.Position(cursorPos2d.line + 1, 0);

        let nextCharOffsetInDoc = document.offsetAt(next);

        let delta = startPosOffset.offsetInDocument - startPosOffset.offsetInSelection;

        let endPos = new CursorPosition();
        endPos.offsetInDocument = nextCharOffsetInDoc;
        endPos.offsetInSelection = nextCharOffsetInDoc - startPosOffset.delta();

        return endPos;//return the next offset in string, not the offset in doc
    }


}

