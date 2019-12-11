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

        let offsetAfterComment = ListReader.skipComment(document, docAsString, startPosOffset);
        
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

            if (ch == ";" && leftParensStack.length == 0)
            {
                let startPos = new CursorPosition()
                startPos.offsetInSelection = i;
                startPos.offsetInDocument = i+ selectionStartOffset;

                let comments = LispFormatter.readComments(editor.document, textString, startPos);
                formattedstring += comments;

                i += comments.length;
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
                    sexpr.trim();
                    let reader = new ListReader(sexpr, leftparen.location);
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
            sexpr.trim();
            let reader = new ListReader(sexpr, leftParensStack[0].location);
            let lispLists = reader.read_list();
            formattedstring += lispLists.formatting();
        }

        return formattedstring;
    }
}