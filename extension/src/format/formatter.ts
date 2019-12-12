import * as vscode from 'vscode';
import { ListReader, CursorPosition } from "./lispreader";

class LeftParentItem {
    public location: Number;

    constructor(pos) {
        this.location = pos;
    }
}


export class LispFormatter {
    private static readComments(document: vscode.TextDocument, docAsString: string, startPosOffset:CursorPosition): string {

        if(docAsString.length == 0) {
            console.log("scanning an empty string is meaningless\n")
            return null;
        }

        let offsetAfterComment = ListReader.findEndOfComment(document, docAsString, startPosOffset);
        
        if(offsetAfterComment == null) {
            offsetAfterComment = new CursorPosition();
            offsetAfterComment.offsetInSelection = docAsString.length;
            offsetAfterComment.offsetInDocument = docAsString.length + startPosOffset.delta();
        }
        else if(offsetAfterComment.offsetInSelection > docAsString.length) { //out of the given range 
            offsetAfterComment.offsetInSelection = docAsString.length;
            offsetAfterComment.offsetInDocument = docAsString.length + startPosOffset.delta();
        }
        else if(offsetAfterComment.offsetInSelection <= startPosOffset.offsetInSelection) {
            //it shouldn't run into this code path;
            console.log("failed to locate the end of a comment\n");
            offsetAfterComment.offsetInSelection = docAsString.length;
            offsetAfterComment.offsetInDocument = docAsString.length + startPosOffset.delta();
        }

        let startPos2d = document.positionAt(startPosOffset.offsetInDocument);
        let endPos2d = document.positionAt(offsetAfterComment.offsetInDocument);
 
        return document.getText(new vscode.Range(startPos2d, endPos2d));
    }

    static endOfLineEnum2String(eolEnum: vscode.EndOfLine ) : string {
        switch(eolEnum) {
            case vscode.EndOfLine.LF:
                return "\n";

            case vscode.EndOfLine.CRLF:
                return "\r\n";
            
            default:
                console.log("Unexpected eol\n");
                return "\r\n";
        }
    }

    public static format(editor: vscode.TextEditor, ifFullFormat: boolean): string {
        let textString:string = "";
        let selectionStartOffset = 0;

        if (!ifFullFormat) {
            textString = editor.document.getText(editor.selection);
            selectionStartOffset = editor.document.offsetAt(editor.selection.start);
        }
        else {
            textString = editor.document.getText();
        }

        if (textString.length == 0)
            return "";

        let formattedstring = "";

        let leftParensStack = [];

        for (let i = 0; i < textString.length; /*i++ is commented out on purpose, as the increment is different case by case*/)
        {
            let ch = textString.charAt(i);

            if (ch == ";")
            {
                let startPos = new CursorPosition()
                startPos.offsetInSelection = i;
                startPos.offsetInDocument = i+ selectionStartOffset;

                let comments = LispFormatter.readComments(editor.document, textString, startPos);

                if(leftParensStack.length == 0)
                    formattedstring += comments;

                i += comments.length;
                continue;
            }

            if(ch == '\"')
            {
                let startPos = new CursorPosition()
                startPos.offsetInSelection = i;
                startPos.offsetInDocument = i+ selectionStartOffset;

                let endOfString = ListReader.skipStringWithQuotes(editor.document, textString, startPos);

                let startPos2d = editor.document.positionAt(startPos.offsetInDocument);
                let endPos2d = null;
                if(endOfString != null)
                {
                    endPos2d = editor.document.positionAt(endOfString.offsetInDocument);
                }
                else
                {
                    endPos2d = selectionStartOffset + textString.length;
                }

                let stringExpr = editor.document.getText(new vscode.Range(startPos2d, endPos2d));
                //set the index of next iteration
                i += stringExpr.length;

                if(stringExpr.length == 0)
                    console.log("failed to read string on top level\n");
                
                if(leftParensStack.length == 0)
                    formattedstring += stringExpr;

                continue;
            }

            if (ch == "(")
            {
                leftParensStack.push(new LeftParentItem(i));
            }
            else if (ch == ")")
            {
                if (leftParensStack.length == 0)
                {
                    // this is unbalnace paren
                    vscode.window.showErrorMessage("Unbalanced token found.");
                }
                else if (leftParensStack.length == 1)
                {
                    // this is the toplevel scope s-expression
                    let leftparen = leftParensStack.pop();
                    let sexpr = textString.substring(i + 1, leftparen.location);

                    let exprStartPos = new CursorPosition();
                    exprStartPos.offsetInSelection = leftparen.location;
                    exprStartPos.offsetInDocument = leftparen.location + selectionStartOffset;

                    let reader = new ListReader(sexpr, exprStartPos, editor.document);
                    let lispLists = reader.read_list();
                    formattedstring += lispLists.formatting();
                    formattedstring += "\n";
                }
                else
                {
                    leftParensStack.pop();
                }
            }

            i++;
            continue;
        }

        if (leftParensStack.length > 0) {
            let sexpr = textString.substring(leftParensStack[0].location, textString.length);

            let exprStartPos = new CursorPosition();
            exprStartPos.offsetInSelection = leftParensStack[0].location;
            exprStartPos.offsetInDocument = leftParensStack[0].location + selectionStartOffset;

            let reader = new ListReader(sexpr, exprStartPos, editor.document);
            let lispLists = reader.read_list();
            formattedstring += lispLists.formatting();
        }

        return formattedstring;
    }
}