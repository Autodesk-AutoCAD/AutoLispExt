import * as vscode from 'vscode';
import { ListReader, CursorPosition } from "./lispreader";
import { Sexpression } from "./sexpression";

class LeftParentItem {
    public location: Number;

    constructor(pos) {
        this.location = pos;
    }
}


export class LispFormatter {

    public static format(editor: vscode.TextEditor, ifFullFormat: boolean): string {
        let textString: string = "";
        let selectionStartOffset = 0;//the position in the whole doc of the first char of the text selected to format

        let fileParser: LispParser = undefined;

        if (!ifFullFormat) {
            textString = editor.document.getText(editor.selection);
            selectionStartOffset = editor.document.offsetAt(editor.selection.start);

            fileParser = new LispParser(editor);
            fileParser.tokenizeString(textString, 0);
        }
        else {
            textString = editor.document.getText();
        }
        if (textString.length == 0)
            return "";

        try {
            let parser = new LispParser(editor);
            parser.tokenizeString(textString, selectionStartOffset);
            if (fileParser)
                fileParser.tokenizeString(textString, 0);

            return this.formatGut(editor, parser, textString, fileParser);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
            return textString;
        }
    }

    private static formatGut(editor: vscode.TextEditor, parser: LispParser, origCopy: string, fileParser?: LispParser): string {
        let atoms = parser.atomsForest;
        if (atoms.length == 0)
            return origCopy;

        let formattedstring = "";
        let linefeed = LispParser.getEOL(editor.document);
        for (let i = 0; i < atoms.length; i++) {
            if (atoms[i] instanceof Sexpression) {
                let lispLists = atoms[i] as Sexpression;

                let firstAtom = lispLists.atoms[0];
                let isTopLevelAtom = true;
                if (fileParser)
                    isTopLevelAtom = fileParser.isTopLevelAtom(firstAtom.line, firstAtom.column);

                let startColumn = firstAtom.column;
                if (isTopLevelAtom)
                    startColumn = 0;

                let formatstr = lispLists.formatting(startColumn, linefeed);
                if (formatstr.length == 0) {
                    throw new Error("It met some errors when formatting");
                }

                if (isTopLevelAtom && formattedstring.length > 0) {
                    let lastCh = formattedstring.substr(-1);
                    if (lastCh != "\n")
                        formattedstring += linefeed;
                }

                formattedstring += formatstr;
            } else {
                // This branch maybe comment, spaces, line breaks or alone atoms
                formattedstring += atoms[i].toString();
            }
        }
        return formattedstring;
    }
}

export class LispParser {
    editor: vscode.TextEditor;
    atomsForest: Array<string | Sexpression>;

    constructor(editor: vscode.TextEditor) {
        this.atomsForest = new Array<string | Sexpression>();
        this.editor = editor;
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

        let editor = this.editor;

        let leftParensStack = [];

        for (let i = 0; i < textString.length; /*i++ is commented out on purpose, as the increment is different case by case*/) {
            let ch = textString.charAt(i);

            if (ch == ";") {
                let startPos = new CursorPosition()
                startPos.offsetInSelection = i;
                startPos.offsetInDocument = i + selectionStartOffset;

                let comments = LispParser.readComments(editor.document, textString, startPos);

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

                let endOfString = ListReader.findEndOfDoubleQuoteString(editor.document, textString, startPos);

                let startPos2d = editor.document.positionAt(startPos.offsetInDocument);
                let endPos2d = null;
                if (endOfString != null) {
                    endPos2d = editor.document.positionAt(endOfString.offsetInDocument);
                }
                else {
                    endPos2d = selectionStartOffset + textString.length;
                }

                let stringExpr = editor.document.getText(new vscode.Range(startPos2d, endPos2d));
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

                    let reader = new ListReader(sexpr, exprStartPos, editor.document);
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

            let reader = new ListReader(sexpr, exprStartPos, editor.document);
            let lispLists = reader.tokenize();
            this.atomsForest.push(lispLists);
        }
    }
}