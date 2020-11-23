import * as vscode from 'vscode';
import { ListReader, CursorPosition } from "./listreader";
import { LispAtom, Sexpression } from "./sexpression";

class LeftParentItem {
    public location: Number;

    constructor(pos) {
        this.location = pos;
    }
}

export class LispParser {
    document: vscode.TextDocument;
    atomsForest: Array<string | Sexpression>;

    constructor(document: vscode.TextDocument) {
        this.atomsForest = new Array<string | Sexpression>();
        this.document = document;
    }

    isTopLevelAtom(line: number, column: number): boolean {
        for (let i = 0; i < this.atomsForest.length; i++) {
            if (this.atomsForest[i] instanceof Sexpression) {
                let lispLists = this.atomsForest[i] as Sexpression;
                if (lispLists.atoms[0].line == line
                    && lispLists.atoms[0].column == column)
                    return true;
            }
        }
        return false;
    }

    private static readComments(document: vscode.TextDocument, docAsString: string, startPosOffset: CursorPosition): string {

        if (docAsString.length == 0) {
            console.log("scanning an empty string is meaningless\n")
            return null;
        }

        let offsetAfterComment = ListReader.findEndOfComment(document, docAsString, startPosOffset);

        if (offsetAfterComment == null) {
            offsetAfterComment = new CursorPosition();
            offsetAfterComment.offsetInSelection = docAsString.length;
            offsetAfterComment.offsetInDocument = docAsString.length + startPosOffset.delta();
        }
        else if (offsetAfterComment.offsetInSelection > docAsString.length) { //out of the given range 
            offsetAfterComment.offsetInSelection = docAsString.length;
            offsetAfterComment.offsetInDocument = docAsString.length + startPosOffset.delta();
        }
        else if (offsetAfterComment.offsetInSelection <= startPosOffset.offsetInSelection) {
            //it shouldn't run into this code path;
            console.log("failed to locate the end of a comment\n");
            offsetAfterComment.offsetInSelection = docAsString.length;
            offsetAfterComment.offsetInDocument = docAsString.length + startPosOffset.delta();
        }

        let startPos2d = document.positionAt(startPosOffset.offsetInDocument);
        let endPos2d = document.positionAt(offsetAfterComment.offsetInDocument);

        return document.getText(new vscode.Range(startPos2d, endPos2d));
    }

    static endOfLineEnum2String(eolEnum: vscode.EndOfLine): string {
        switch (eolEnum) {
            case vscode.EndOfLine.LF:
                return "\n";

            case vscode.EndOfLine.CRLF:
                return "\r\n";

            default:
                console.log("Unexpected eol\n");
                return "\r\n";
        }
    }

    public static getEOL(document: vscode.TextDocument): string {
        return LispParser.endOfLineEnum2String(document.eol);
    }

    public tokenizeString(needFmtString: string, offset: number) {
        let selectionStartOffset = offset;
        let textString = needFmtString;

        let document = this.document;

        let leftParensStack = [];

        for (let i = 0; i < textString.length; /*i++ is commented out on purpose, as the increment is different case by case*/) {
            let ch = textString.charAt(i);

            if (ch == ";") {
                let startPos = new CursorPosition()
                startPos.offsetInSelection = i;
                startPos.offsetInDocument = i + selectionStartOffset;

                let comments = LispParser.readComments(document, textString, startPos);
                if (comments == null)
                    continue;
                if (leftParensStack.length == 0) {
                    this.atomsForest.push(comments);
                }

                i += comments.length;

                continue;
            }

            if (ch == '\"') {
                let startPos = new CursorPosition()
                startPos.offsetInSelection = i;
                startPos.offsetInDocument = i + selectionStartOffset;

                let endOfString = ListReader.findEndOfDoubleQuoteString(document, textString, startPos);
                let startPos2d = document.positionAt(startPos.offsetInDocument);
                let endPos2d = null;
                if (endOfString != null) {
                    endPos2d = document.positionAt(endOfString.offsetInDocument);
                }
                else {
                    endPos2d = document.positionAt(selectionStartOffset + textString.length);
                }

                let stringExpr = document.getText(new vscode.Range(startPos2d, endPos2d));
                //set the index of next iteration
                i += stringExpr.length;

                if (stringExpr.length == 0)
                    console.log("failed to read string on top level\n");

                if (leftParensStack.length == 0) {
                    this.atomsForest.push(stringExpr);
                }

                continue;
            }

            if (ch == "(") {
                leftParensStack.push(new LeftParentItem(i));
            }
            else if (ch == ")") {
                if (leftParensStack.length == 0) {
                    // this is unbalnace paren
                    this.atomsForest.push(ch);
                }
                else if (leftParensStack.length == 1) {
                    // this is the toplevel scope s-expression
                    let leftparen = leftParensStack.pop();
                    let sexpr = textString.substring(leftparen.location, i + 1);

                    let exprStartPos = new CursorPosition();
                    exprStartPos.offsetInSelection = 0;
                    exprStartPos.offsetInDocument = leftparen.location + selectionStartOffset;

                    let reader = new ListReader(sexpr, exprStartPos, document);
                    let lispLists = reader.tokenize();
                    this.atomsForest.push(lispLists);
                }
                else {
                    leftParensStack.pop();
                }
            }
            else if (leftParensStack.length == 0) {
                this.atomsForest.push(ch);
            }

            i++;
            continue;
        }

        if (leftParensStack.length > 0) {
            let sexpr = textString.substring(leftParensStack[0].location, textString.length);

            let exprStartPos = new CursorPosition();
            exprStartPos.offsetInSelection = 0;
            exprStartPos.offsetInDocument = leftParensStack[0].location + selectionStartOffset;

            let reader = new ListReader(sexpr, exprStartPos, document);
            let lispLists = reader.tokenize();
            this.atomsForest.push(lispLists);
        }
    }
}


export namespace LispParser {
    
    enum ParseState {
        UNKNOWN = 0,
        STRING = 1,
        COMMENT = 2
    }

    interface CountTracker {
        idx: number;
        line: number;
        column: number;
        linefeed: string;
    }

    export function getDocumentSexpression(data: string|vscode.TextDocument, tracker?: CountTracker): Sexpression {
        let documentText = '';
        if (typeof(data) === 'string') {
            documentText = data;
        } else {
            documentText = data.getText();
        }
        if (!tracker){
            tracker = {
                idx: 0, line: 0, column: 0, 
                linefeed: typeof(data) === 'string' ? (data.indexOf('\r\n') >= 0 ? '\r\n' : '\n') : LispParser.getEOL(data)
            };
        }
        
        const result = new Sexpression();
        result.line = tracker.line;
        result.column = tracker.column;
        result.linefeed = tracker.linefeed;
        
        let isAuthorized = true;
        let state = ParseState.UNKNOWN;
        let grpStart: vscode.Position = null;
        let temp = '';
        
        while (tracker.idx < documentText.length && isAuthorized) {
            //const prev = documentText[tracker.idx - 1];
            const curr = documentText[tracker.idx];
            const next = documentText[tracker.idx + 1];
            let handled = false;
            switch (state) {
                case ParseState.UNKNOWN:
                    if (grpStart === null && curr === '\'' && next === '(') {
                        result.atoms.push(new LispAtom(tracker.line, tracker.column, curr));
                    } else if (grpStart === null && curr === '(') {
                        grpStart = new vscode.Position(tracker.line, tracker.column);
                        result.atoms.push(new LispAtom(grpStart.line, grpStart.character, curr));
                    } else if (curr === ')') {
                        if (temp.length > 0) {                            
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                        }
                        temp = '';
                        result.atoms.push(new LispAtom(tracker.line, tracker.column, curr));
                        grpStart = null;
                        isAuthorized = false;
                    } else if (curr === '(' || curr === '\'' && next === '(') {
                        if (temp.length > 0) {
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));                            
                        }
                        temp = '';
                        result.atoms.push(getDocumentSexpression(documentText, tracker));
                        handled = true;
                    } else if (curr === ';') {
                        if (temp.length > 0) {
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                        }
                        temp = ';';
                        grpStart = new vscode.Position(tracker.line, tracker.column);
                        state = ParseState.COMMENT;
                    } else if (curr === '"') {
                        if (temp.length > 0) {
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                        }
                        temp = '"';
                        grpStart = new vscode.Position(tracker.line, tracker.column);
                        state = ParseState.STRING;
                    } else if (/\s/.test(curr)) {
                        if (temp.length > 0) {
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                        }
                        if (curr === '\n'){
                            tracker.line++;
                            tracker.column = -1;
                        }
                        temp = '';
                    } else { // This is some other kind of readable character, so it can start a group pointer
                        if (temp === '') { 
                            grpStart = new vscode.Position(tracker.line, tracker.column);
                        }
                        temp += curr;
                    }
                    break;
                case ParseState.STRING:
                    temp += curr;
                    // these 2 endswith tests are hard to understand, but they were vetted on a previous C# lisp parser to detect escaped double quotes
                    if (curr === '"' && (temp.endsWith("\\\\\"") || !temp.endsWith("\\\""))) {    
                        result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                        state = ParseState.UNKNOWN;
                        temp = '';
                    } 
                    if (curr === '\n'){
                        tracker.line++;
                        tracker.column = -1;
                    }
                    break;
                case ParseState.COMMENT:                    
                    if (temp[1] === '|') {
                        temp += curr;
                        if (temp.endsWith('|;')) {
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                            state = ParseState.UNKNOWN;
                            temp = '';
                        }
                        if (curr === '\n'){
                            tracker.line++;
                            tracker.column = -1;
                        }
                    } else {
                        if (curr === '\r' || curr === '\n') {
                            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
                            state = ParseState.UNKNOWN;
                            temp = '';
                        } else {
                            temp += curr;
                        }
                    }
                    break;
            }
            if (handled === false) {
                tracker.idx++;                
                tracker.column++;
            }
        }
        if (temp.length > 0) {
            result.atoms.push(new LispAtom(grpStart.line, grpStart.character, temp));
        }
        return result;
    }
}