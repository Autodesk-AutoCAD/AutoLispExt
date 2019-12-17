// $NoKeywords: $
//
//  Copyright 2020 Autodesk, Inc.  All rights reserved.
//
//  Use of this software is subject to the terms of the Autodesk license 
//  agreement provided at the time of installation or download, or which 
//  otherwise accompanies this software in either electronic or hard copy form.   
//
// extension.ts
//
// CREATED BY:  AutoCAD team               DECEMBER. 2019
//
// DESCRIPTION: Lisp vscode extension core code.
//

import * as vscode from 'vscode';

import { OnTypeFormattingEditProvider, TextDocument, Position, FormattingOptions, CancellationToken, TextEdit } from 'vscode';
import * as format from './lispreader';
import { LispAtom } from './sexpression';

class ParenExprInfo
{
    constructor()
    {
      this.startPos = null;
      this.endPos = null;
    }

    startPos: format.CursorPosition;
    endPos: format.CursorPosition;
}

function getOperator(document:vscode.TextDocument, exprInfo:ParenExprInfo): LispAtom
{
    let startPos2d = document.positionAt(exprInfo.startPos.offsetInDocument);
    let endPos2d = document.positionAt(exprInfo.endPos.offsetInDocument + 1);

    let sexpr = document.getText(new vscode.Range(startPos2d, endPos2d));
    let reader = new format.ListReader(sexpr, exprInfo.startPos, document);
    let lispLists = reader.tokenize();

    if((lispLists == null) || (lispLists.atoms == null) || (lispLists.atoms.length == 0))
        return null;

    if(lispLists.atoms[0].isLeftParen() == false)
    {
        console.log("ListReader doesn't provide expected result.\n")
        return null;
    }

    let operator: LispAtom = null;
    for(let i=1; i<lispLists.atoms.length; i++)
    {
        if(lispLists.atoms[i].isComment())
            continue; //ignore comment
        
        operator = lispLists.atoms[i];
        break;
    }

    if(operator == null)
        return null;

    return operator;
}


function getWhiteSpaceNumber(document:vscode.TextDocument, exprInfo:ParenExprInfo): number 
{
    let operator = getOperator(document, exprInfo);

    if(operator == null)
        return -1;

    if(operator.symbol == null)
        return -1;

    //the default case: align to (right side of first item + 1 white space)
    //e.g.:
    //(theOperator xxx
    //             //auto indent pos)
    //(theOperator     xxx
    //             //auto indent pos)

    return operator.column + operator.symbol.length + 1;
}

function getIndentation(document:vscode.TextDocument, exprInfoArray:ParenExprInfo[]): string 
{
    if((exprInfoArray == null) || (exprInfoArray.length == 0))
        return ""; //no identation for top level text

    let num = getWhiteSpaceNumber(document, exprInfoArray[0]);
    if(num == -1)
    {
        console.log("failed to parse paren expression.\n");
        return "  ";//two white spaces on error
    }

    let ret = "";
    for(let i=0; i<num; i++)
        ret += " ";

    return ret;
}

export
function subscribeOnEnterEvent()
{
    vscode.languages.registerOnTypeFormattingEditProvider(
        ['autolisp', 'lisp'], 
        {
            provideOnTypeFormattingEdits(document: vscode.TextDocument, position2d: Position, ch: string): vscode.TextEdit[]
            {
                if(ch != '\n')
                    return null;

                 let edits = new Array<TextEdit>();

                //step 1: work out the indentation and fill white spaces in the new line
                //step 1.1, search for all parentheses that contain current posistion
                let containerExprs = findCoveringParens(document, position2d);

                //check if there's already some unexpected handler that has made auto-indent
                let lineText = document.lineAt(position2d.line).text;
                let trimmedLine = lineText.trimLeft();
                let unexpectedIndentLength = lineText.length - trimmedLine.length;

                let indentation = getIndentation(document, containerExprs);
                edits.push(TextEdit.insert(position2d, indentation));

                //step 1.3, remove possibly inserted indentation from unexpected handlers that run before this handler
                if(unexpectedIndentLength > 0)
                {
                    let startPos = new Position(position2d.line, 0);
                    let endPos = new Position(position2d.line, unexpectedIndentLength);
                    edits.push(TextEdit.delete(new vscode.Range(startPos, endPos)));
                }

                //step 2: remove the ending ' ' and '\t' at the end of the old line
                let trimEnd = makeTrimEndInfo(document, position2d);
                if(null != trimEnd)
                    edits.push(trimEnd);

                 return edits;
                }
        },
        '\n'
    );
}

function findCoveringParens(document: vscode.TextDocument, cursorPos2d:Position) : ParenExprInfo[]
{
    let docAsString = document.getText();
    let cursorPos = document.offsetAt(cursorPos2d);

    let docStringLength = docAsString.length;

    let parenPairs = new Array<ParenExprInfo>();//temp array to find ( ... ) expression
    let coverParenPairs = new Array<ParenExprInfo>(); //( ... ) expressions that are ancestors of current position

    for(let pos = 0; pos < docStringLength; /*startPosInString++*/ )
    {
        let char = docAsString.charAt(pos);

        if((pos > cursorPos) && (parenPairs.length == 0))
        {
            //it's behind the given position, and there's no closing ) to look for;
            //let's quit.
            break;
        }

        if(char == ';')
        {
            let commentStartPos = format.CursorPosition.create(pos, pos);

            let nextPos2Scan = format.ListReader.findEndOfComment(document, docAsString, commentStartPos);
            if(nextPos2Scan == null) //doc ended or not found
                break;

            pos = nextPos2Scan.offsetInDocument;
            continue;
        }

        //getting here means you're not in a comment

        if(char == '"')
        {
            let stringStartPos = format.CursorPosition.create(pos, pos);

            let nextPos2Scan = format.ListReader.findEndOfDoubleQuoteString(document, docAsString, stringStartPos);

            if(nextPos2Scan == null) //doc ended or not found
                break;

            pos = nextPos2Scan.offsetInDocument;
            continue;
        }

        //getting here means you're in neither comment nor string with double quotes

        if(char == '(')
        {
            let anExpr = new ParenExprInfo();
            anExpr.startPos = format.CursorPosition.create(pos, pos);
            parenPairs.push(anExpr);

            pos++;
            continue;
        }

        if(char == ')')
        {
            if(parenPairs.length <= 0)
            {
                //a ) that has no starting (; let's ignore it
                pos++;
                continue;
            }

            let parenExpr = parenPairs.pop();
            parenExpr.endPos = format.CursorPosition.create(pos, pos);

             //now check if it covers current position
            if((cursorPos > parenExpr.startPos.offsetInDocument) &&
              (cursorPos <= parenExpr.endPos.offsetInDocument))
            {
                //note the if cursor is on the closing ), we take it as inside an expression, as new input will be before )
                coverParenPairs.push(parenExpr);
            }

            pos++;
            continue;
        }
        
        pos++;
        continue;
    }//end of the for loop based scan

    while(true)
    {
        if(parenPairs.length == 0)
            break;

        let expr = parenPairs.pop();
        if(expr.endPos != null)
            continue;

        //it's an expression that is not ended; it contains current position too
        expr.endPos = format.CursorPosition.create(docAsString.length - 1, docAsString.length- 1);
        coverParenPairs.push(expr);
    }
 
    let dbgMsg = "All parens that cover given position:\n";
    for(let i=0; i<coverParenPairs.length; i++)
    {
        var startPos2d = document.positionAt(coverParenPairs[i].startPos.offsetInDocument);
        //see https://stackoverflow.com/questions/45203543/vs-code-extension-api-to-get-the-range-of-the-whole-text-of-a-document/46427868
        //to get the text between [startPos, endPos], you need getText(startPos, endPos +1)
        var endPos2d = document.positionAt(coverParenPairs[i].endPos.offsetInDocument + 1);
        
        dbgMsg += ("[(" + (startPos2d.line +1).toString() + ", " + (startPos2d.character + 1).toString() + "), ");
        dbgMsg += ("(" + (endPos2d.line +1).toString() + ", " + (endPos2d.character + 1).toString() + ")]\n");
        dbgMsg += document.getText(new vscode.Range(startPos2d, endPos2d));
        //dbgMsg += document.getText(new vscode.Range(new Position(0, 0), new Position(2, 1)));
        dbgMsg += "\n************************\n";
    }
    console.log(dbgMsg); 

    return coverParenPairs;
}

function makeTrimEndInfo(document: vscode.TextDocument, position2d:Position) : TextEdit
{
    let line = position2d.line;

    //it's called after ENTER key is handled, the position before ENTER key is:
    let oldLine = line - 1;
    let textInOldLine = document.lineAt(oldLine).text;//the text remains in old line after ENTER key event
    let lineWidth = textInOldLine.length;//note that a column in VS Code means a complete character

    //search in old line, and locate the first char right before old position that is neither ' ' nor '\t'

    var oldColumnIndex:number;
    for(oldColumnIndex = lineWidth - 1; oldColumnIndex >= 0 ; oldColumnIndex--)
    {
        if(textInOldLine.charAt(oldColumnIndex) == ' ')
          continue;

         if(textInOldLine.charAt(oldColumnIndex) == '\t')
          continue;

         break;//found it
    }

    if((oldColumnIndex >= 0) && //found a non empty char
       ((oldColumnIndex + 1) < lineWidth)) //and there's at least 1 empty char after it in the same line
    {
        ////found the first char that was neither ' ' nor '\t'; remove the rest in this line
        let start = new Position(oldLine, oldColumnIndex + 1);//start with the empty char
        let end = new Position(oldLine, lineWidth); //end pos has to be the real ending index + 1 to compose the following range
        let range = new vscode.Range(start, end);
        return TextEdit.delete(range);
    }

    return null;
}
