import * as vscode from 'vscode';
import { ListReader, CursorPosition } from "../format/listreader";
import { Sexpression } from "../format/sexpression";
import { getDocumentContainer } from '../parsing/containers';
import { getEOL } from './shared';


// Restructuring Objective:
//      Create dedicated folder for parsing behaviors. This file/class was originally located in
//      /src/format/parser.ts
//      The original file is now just an export to this file to maintain existing code functionality
//
// Restructuring Actions:
//      The decorator extensions to the LispParser namespace were broke out into their own files
//      Moved getEOL() into shared.ts and added a LispParser class getter to maintain old code
//      Moved endOfLineEnum2String() into shared.ts but was only ever used by getEOL so no getter was added
//      Moved getDocumentContainer() into containers.ts and added a LispParser class getter to maintain old code
//      Other than what is noted above, no LispParser code was changed


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


    // this new block of getters maintains some reverse compatibility before the code was restructured
    static get getDocumentContainer() { return getDocumentContainer; }
    static get getEOL() { return getEOL; }


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