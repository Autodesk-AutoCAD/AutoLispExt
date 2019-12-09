import * as vscode from 'vscode';
import { ListReader } from "./lispreader";

class LeftParentItem {
    public location: Number;

    constructor(pos) {
        this.location = pos;
    }
}


export class LispFormatter {
    private static readComments(str: string, index: number): string {
        let commentsPrefix = ";";
        if (index + 1 < str.length)
            commentsPrefix += str.charAt(index + 1);
        let isBlockComment = false;
        if (commentsPrefix == ";|")
            isBlockComment = true;

        let res = "";
        for (let i = index; i < str.length; i++) {

            let ch = str.charAt(i);
            if (ch == "\n") {
                if (!isBlockComment)
                    break;
            }

            if (ch == "|" && isBlockComment && i < str.length - 1) {
                let nextch = str.charAt(i + 1);
                if (nextch == ";") {
                    res += ch;
                    res += nextch;
                    break;
                }
            }
            res += ch;
        }

        return res;
    }

    public static format(editor: vscode.TextEditor, ifFullFormat: boolean): string {
        let textString = editor.document.getText();
        if (!ifFullFormat) {
            textString = "";
            for (let row = editor.selection.start.line; row <= editor.selection.end.line; row++)
                textString += editor.document.lineAt(row).text + "\n";
        }

        textString.trim();
        if (textString.length == 0)
            return "";

        let formattedstring = "";

        let leftParensStack = [];

        for (let i = 0; i < textString.length; i++) {
            let ch = textString.charAt(i);

            if (ch == ";" && leftParensStack.length == 0) {
                let comments = LispFormatter.readComments(textString, i);
                formattedstring += comments;
                formattedstring += "\n";

                i += comments.length;
            }

            if (ch == "(") {
                leftParensStack.push(new LeftParentItem(i));
            } else if (ch == ")") {
                if (leftParensStack.length == 0) {
                    // this is unbalnace paren
                    vscode.window.showErrorMessage("Unbalanced token found.");
                    continue;
                }
                else if (leftParensStack.length == 1) {
                    // this is the toplevel scope s-expression
                    let leftparen = leftParensStack.pop();
                    let sexpr = textString.substring(i + 1, leftparen.location);
                    sexpr.trim();
                    let reader = new ListReader(sexpr, leftparen.location);
                    let lispLists = reader.read_list();
                    formattedstring += lispLists.formatting();
                    formattedstring += "\n";
                }
                else {
                    leftParensStack.pop();
                }
            }
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