import * as vscode from 'vscode';
import { assert } from 'console';
import { Sexpression } from "./sexpression"
import { LispAtom } from "./sexpression"
import { start } from 'repl';

enum FormattingStyle {
    Plain = 1,
    Narrow,
    Wide
}

// (defun C:;|comment|;MYCMD (x) ;|inline comment|;
//      (list 1 2 3)            ;comment-column comment
//     ;;current-column comment
//;;; 0-column comment
//) ;_ pasted comment 

// (getdist
//       "\nline this is a test for long long one line for s expression"
// )

export class CursorPosition {
    offsetInSelection: number;
    offsetInDocument: number;
    
    constructor() {
        this.offsetInSelection = -1;
        this.offsetInDocument = -1;
    }

    static create(offsetInSelection: number, offsetInDocument: number) {
        let ret = new CursorPosition();
        ret.offsetInSelection = offsetInSelection;
        ret.offsetInDocument = offsetInDocument;

        return ret;
    }

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

    nextString(length: number): string {
        if (length <= 0) {
            console.log("it's meaningless to substring with 0 or negative length\n");
            return "";
        }

        let startPos = this.pos;
        let posAfterString = this.pos + length;

        if (posAfterString > this.len) {
            posAfterString = this.len;
        }

        length = posAfterString - startPos;

        let ret = "";
        for (let i = 0; i < length; i++)
            ret += this.next();

        return ret;
    }

    currentOffset(): number {
        return this.pos;
    }

    ignore(charNum: number) {
        this.pos += charNum;
        if (this.pos > this.len)
            this.pos = this.len;
    }
}

export class ListReader {
    input: InputStream;
    cachedLists: Array<Sexpression>;
    document: vscode.TextDocument;
    startPosInDoc: CursorPosition;

    constructor(text: string, startPos: CursorPosition, curDoc: vscode.TextDocument) {
        let trimmedStr = text.trimLeft();
        let lengthOfLeftTrim = text.length - trimmedStr.length;

        this.input = new InputStream(text.trimRight(), startPos.offsetInSelection);
        this.input.ignore(lengthOfLeftTrim);

        this.cachedLists = new Array<Sexpression>();
        this.document = curDoc;
        this.startPosInDoc = startPos;
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

        assert(this.peek() == "\"");

        let startPoint = new CursorPosition();
        startPoint.offsetInSelection = this.input.currentOffset();
        startPoint.offsetInDocument = this.input.currentOffset() + this.startPosInDoc.delta();
        let stringLength = ListReader.getLengthOfStringSym(this.document, this.input.text, startPoint);

        let res = this.input.nextString(stringLength);

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
                case ";":
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
        return this.read_list(new LispAtom(this.input.line, this.input.col, quote));
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

        let startPoint = new CursorPosition();
        startPoint.offsetInSelection = this.input.currentOffset();
        startPoint.offsetInDocument = this.input.currentOffset() + this.startPosInDoc.delta();
        let commentLength = ListReader.getCommentLength(this.document, this.input.text, startPoint);

        let res = this.input.nextString(commentLength);
        res = res.trimRight();
        let lastList = this.cachedLists[this.cachedLists.length - 1];
        lastList.addAtom(new LispAtom(sline, scol, res));
    }

    read_list(prefixAtom?: LispAtom) {
        let sexpr = new Sexpression();
        sexpr.line = this.input.line;
        sexpr.column = this.input.col;

        if (prefixAtom != undefined)
            sexpr.addAtom(prefixAtom);
        let parenAtom = "(";
        sexpr.addAtom(new LispAtom(this.input.line, this.input.col, parenAtom));
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

    tokenize() {
        return this.read_list();
    }
    
    //return the length of a comment - including the chars that start and end a comment
    static getCommentLength(document: vscode.TextDocument, stringInRange: string, startPosOffset: CursorPosition): number {
        let endPos = ListReader.findEndOfComment(document, stringInRange, startPosOffset);

        if (endPos == null) {
            endPos = new CursorPosition();
            endPos.offsetInSelection = stringInRange.length;
            endPos.offsetInDocument = stringInRange.length + startPosOffset.delta();
        }

        return endPos.offsetInSelection - startPosOffset.offsetInSelection;
    }

    //startPosOffset: offset of the starting ; of a comment
    //stringInRange:  either the text selected in editor, or the entire document as a string if nothing is selected
    //
    //return the position right after the ending char of current comment
    //return null if the end is out of range or missing
    static findEndOfComment(document: vscode.TextDocument, stringInRange: string, startPosOffset: CursorPosition): CursorPosition {
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

    //return the length of a string with double quotes - including the starting and ending "
    static getLengthOfStringSym(document: vscode.TextDocument, stringInRange: string, startPosOffset: CursorPosition): number {
        let endPos = ListReader.findEndOfDoubleQuoteString(document, stringInRange, startPosOffset);

        if (endPos == null) {
            endPos = new CursorPosition();
            endPos.offsetInSelection = stringInRange.length;
            endPos.offsetInDocument = stringInRange.length + startPosOffset.delta();
        }

        return endPos.offsetInSelection - startPosOffset.offsetInSelection;
    }

    //startPosOffset: offset of the starting " of a text string
    //stringInRange:  either the text selected in editor, or the entire document as a string if nothing is selected
    //
    //return the position right after the ending "
    //return null if the ending " is out of range or missing
    static findEndOfDoubleQuoteString(document: vscode.TextDocument, stringInRange: string, startPosOffset: CursorPosition): CursorPosition {
        let inRangeStringLength = stringInRange.length;

        if (startPosOffset.offsetInSelection >= (inRangeStringLength - 1))//it's the final char in the given range;
            return null;

        let posAfterComment = -1;

        for (let curPos = startPosOffset.offsetInSelection + 1; curPos < inRangeStringLength; curPos++) {
            let char = stringInRange.charAt(curPos);

            if (char == '"') {
                posAfterComment = curPos + 1;
                break;
            }

            if (char != '\\')
                continue;

            //it's escaping the next char

            if (curPos >= (inRangeStringLength - 1))
                break;//there's no next char in given range; the given string ends here

            //well, it's the escaping char, but it's also the last char before EOL
            if ((stringInRange.charAt(curPos + 1) == '\r') ||
                (stringInRange.charAt(curPos + 1) == '\n'))
                continue; //simply igore this '\' which escapes nothing

            curPos++;//escape the escaped char
        }

        if (posAfterComment == -1)
            return null;

        let nextPos = new CursorPosition();
        nextPos.offsetInSelection = posAfterComment;
        nextPos.offsetInDocument = posAfterComment + startPosOffset.delta();

        return nextPos;
    }

}

