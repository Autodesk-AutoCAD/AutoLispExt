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
import { LispAtom, Sexpression } from './sexpression';
import { CursorPosition } from './lispreader';

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

class BasicSemantics
{
    operator: LispAtom = null;
    operands: Array<LispAtom | Sexpression> = new Array<LispAtom | Sexpression>();

    operatorLowerCase: string = null;

    static parse(exprInfo:ParenExprInfo, document:vscode.TextDocument): BasicSemantics
    {
        //parse plain text
        let startPos2d = document.positionAt(exprInfo.startPos.offsetInDocument);
        let endPos2d = document.positionAt(exprInfo.endPos.offsetInDocument + 1);
    
        let sexpr = document.getText(new vscode.Range(startPos2d, endPos2d));

        let readerStartPos = new CursorPosition();
        readerStartPos.offsetInSelection = 0; //the start position in sexpr is 0
        readerStartPos.offsetInDocument = exprInfo.startPos.offsetInDocument; //the start position in doc
        let reader = new format.ListReader(sexpr, readerStartPos, document);
    
        let lispLists = reader.tokenize();

        if((lispLists == null) || (lispLists.atoms == null) || (lispLists.atoms.length == 0))
            return null;

        if(lispLists.atoms[0].isLeftParen() == false)
        {
            console.log("ListReader didn't provide expected result.\n")
            return null;
        }

        //find operator
        let operator: LispAtom = null;
        let nextIndex = 0;
        for(let i=1; i<lispLists.atoms.length; i++)
        {
            if(lispLists.atoms[i].isComment())
                continue; //ignore comment

            if(lispLists.atoms[i].isRightParen())
                break; //expression closed
            
            operator = lispLists.atoms[i];
            nextIndex = i + 1;
            break;
        }

        if((operator == null) || (operator.symbol == null) || (operator.symbol == ""))
            return null;

        let ret = new BasicSemantics();
        ret.operator = operator;
        ret.operatorLowerCase = operator.symbol.toLowerCase();

        for(; nextIndex <lispLists.atoms.length; nextIndex++)
        {
            if(lispLists.atoms[nextIndex].isRightParen())//expression closed
                break;
            
            if(lispLists.atoms[nextIndex].isComment())
                continue;
            
            ret.operands.push(lispLists.atoms[nextIndex]);
        }

        return ret;
    }    
}

function getNumber_Defun_ArgList(document:vscode.TextDocument, exprInfo:ParenExprInfo, parentParenExpr:ParenExprInfo): number 
{
    let parentSemantics = BasicSemantics.parse(parentParenExpr, document);
    if(parentSemantics == null) return -1;

    let parentOperator = parentSemantics.operator;
    if(parentOperator == null) return -1;

    if(parentSemantics.operatorLowerCase != "defun") return -1;

    let directChildren = parentSemantics.operands;

    //find the starting ( of argument list
    for(let i = 0; i < directChildren.length; i++)
    {
        if((directChildren[i] instanceof Sexpression) == false)
            continue;

        let subLists = <Sexpression>directChildren[i];
        for(let j = 0; j < subLists.atoms.length; j++)
        {
            if(subLists.atoms[j].isLeftParen() == false)
                continue;

            //found it
            let pos2d = document.positionAt(exprInfo.startPos.offsetInDocument);
            if(pos2d.line != directChildren[i].line)
                return -1;
            
            if(pos2d.character != directChildren[i].column)
                return -1;

            //now the exprInfo represents the range of ([argument list]) of defun
            return directChildren[i].column + 1;//horizontally right after the ( of argument list
        }        
    }

    return -1; //to deal it with the default code path
}

//check if cursorPos2d is after [line, column]
function isPosAfter(cursorPos2d: Position, line:number, column:number): boolean
{
    if(cursorPos2d.line < line)
        return false;
    
    if(cursorPos2d.line == line)
    {
        if(cursorPos2d.character <= column)
            return false;
    }

    return true;
}

//check if cursorPos2d is between [line1, column1] and [line2, column2]
function isPosBetween(cursorPos2d: Position, line1:number, column1:number, line2:number, column2:number): boolean
{
    if(isPosAfter(cursorPos2d, line1, column1) == false)
        return false;

    //now cursorPos2d is after [line1, column1]

    if(cursorPos2d.line > line2)
        return false;

    if(cursorPos2d.line == line2)
    {
        if(cursorPos2d.character > column2)
            return false;
    }

    //now cursorPos2d is before or at [line2, column2]
    //if cursofPos2d is at [line2,column2], when typing sth. new, it's still between the left and right atoms
    return true;
}

function getNumber_SetQ(document:vscode.TextDocument, cursorPos2d: Position, semantics:BasicSemantics): number 
{
    let operandNumBeforePos = -1;

    if(semantics.operands.length == 0)
        return -1; //to deal with default logic

    //get the number of operands before current position to determine it should be a variable or value if I
    //add a new atom here
    for(let i=0; i<semantics.operands.length-1; i++)
    {
        //check if it's between the beginnings of operand[i] and operand[i+1]
        let operand1 = semantics.operands[i];
        let operand2 = semantics.operands[i+1];
        if(isPosBetween(cursorPos2d, operand1.line, operand1.column, operand2.line, operand2.column) == false)
            continue;
        
        operandNumBeforePos = i+1;
        break;
    }

    if(operandNumBeforePos == -1)
    {
        //check if it's after the beginning of last operand
        let lastOperand = semantics.operands[semantics.operands.length-1];

        if(isPosAfter(cursorPos2d, lastOperand.line, lastOperand.column))
            operandNumBeforePos = semantics.operands.length;
        else
            operandNumBeforePos = 0;
    }

    let firstOperandStartColumn = semantics.operands[0].column;

    if((operandNumBeforePos%2) == 0)
    {
        //it's a variable
        return firstOperandStartColumn;
    }
    else
    {
        //it's a value
        return firstOperandStartColumn + 1;
    }
}

function getWhiteSpaceNumber(document:vscode.TextDocument, exprInfo:ParenExprInfo, parentParenExpr:ParenExprInfo,
    cursorPos2d: Position): number 
{
    if(parentParenExpr != null)
    {
        let num = getNumber_Defun_ArgList(document, exprInfo, parentParenExpr);
        if(num >= 0)
            return num;
    }

    let semantics = BasicSemantics.parse(exprInfo, document);

    let operator = semantics.operator;

    if(operator == null)
        return -1;

    if(operator.symbol == null)
        return -1;

    if(semantics.operatorLowerCase == "setq")
    {
        let num = getNumber_SetQ(document, cursorPos2d, semantics);

        if(num >= 0)
            return num;
    }

    //the default case: align to (right side of first item + 1 white space)
    //e.g.:
    //(theOperator xxx
    //             //auto indent pos)
    //(theOperator     xxx
    //             //auto indent pos)

    return operator.column + operator.symbol.length + 1;
}

function getIndentation(document:vscode.TextDocument, exprInfoArray:ParenExprInfo[], cursorPos2d: Position): string 
{
    if((exprInfoArray == null) || (exprInfoArray.length == 0))
        return ""; //no identation for top level text

    let parentParenExpr: ParenExprInfo = null;
    if(exprInfoArray.length > 1)
        parentParenExpr = exprInfoArray[1];

    let num = getWhiteSpaceNumber(document, exprInfoArray[0], parentParenExpr, cursorPos2d);
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

                let indentation = getIndentation(document, containerExprs, position2d);
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
