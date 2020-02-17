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

import { TextDocument, Position, TextEdit } from 'vscode';
import * as format from './listreader';
import { LispAtom, Sexpression, indentationForNarrowStyle } from './sexpression';
import { CursorPosition } from './listreader';

class ElementRange {
    constructor() {
        this.startPos = null;
        this.endPos = null;
        this.quoted = false;
    }

    startPos: format.CursorPosition;
    endPos: format.CursorPosition;
    quoted: boolean;
}

class ContainerElements {
    containerParens: ElementRange[] = null;
    containerBlockComment: ElementRange = null;
}

class BasicSemantics {
    operator: LispAtom = null;
    operands: Array<LispAtom | Sexpression> = new Array<LispAtom | Sexpression>();

    operatorLowerCase: string = null;
    leftParenPos: vscode.Position = null;

    static parse(exprInfo: ElementRange, document: vscode.TextDocument): BasicSemantics {
        //parse plain text
        let startPos2d = document.positionAt(exprInfo.startPos.offsetInDocument);
        let endPos2d = document.positionAt(exprInfo.endPos.offsetInDocument + 1);

        let sexpr = document.getText(new vscode.Range(startPos2d, endPos2d));

        let readerStartPos = new CursorPosition();
        readerStartPos.offsetInSelection = 0; //the start position in sexpr is 0
        readerStartPos.offsetInDocument = exprInfo.startPos.offsetInDocument; //the start position in doc
        let reader = new format.ListReader(sexpr, readerStartPos, document);

        let lispLists = reader.tokenize();

        if ((lispLists == null) || (lispLists.atoms == null) || (lispLists.atoms.length == 0))
            return null;

        if (lispLists.atoms[0].isLeftParen() == false) {
            console.log("ListReader didn't provide expected result.\n")
            return null;
        }

        //find operator
        let operator: LispAtom = null;
        let nextIndex = 0;
        for (let i = 1; i < lispLists.atoms.length; i++) {
            if (lispLists.atoms[i].isComment())
                continue; //ignore comment

            if (lispLists.atoms[i].isRightParen())
                break; //expression closed

            operator = lispLists.atoms[i];
            nextIndex = i + 1;
            break;
        }

        if ((operator == null) || (operator.symbol == null) || (operator.symbol == ""))
            return null;

        let ret = new BasicSemantics();
        ret.operator = operator;
        ret.operatorLowerCase = operator.symbol.toLowerCase();
        ret.leftParenPos = startPos2d;

        for (; nextIndex < lispLists.atoms.length; nextIndex++) {
            if (lispLists.atoms[nextIndex].isRightParen())//expression closed
                break;

            if (lispLists.atoms[nextIndex].isComment())
                continue;

            ret.operands.push(lispLists.atoms[nextIndex]);
        }

        return ret;
    }
}

function getTabSize(): number {
    let editor = vscode.window.activeTextEditor;

    if (editor)
        return <number>editor.options.tabSize;

    return 2;
}

function character2Column(charPosInLine: number, line: number, document: TextDocument): number {
    let tabsize = getTabSize();

    if (line >= document.lineCount) {
        console.log("invalid line number;\n");
        return charPosInLine;
    }

    let lineText = document.lineAt(line).text;

    let column = 0;
    for (let i = 0; i < charPosInLine; i++) {
        if (lineText.charAt(i) == '\t')
            column += tabsize;
        else
            column++;
    }

    return column;
}

function getNumber_Lambda(document: TextDocument, cursorPos2d: Position, semantics: BasicSemantics): number {
    let operator = semantics.operator;
    if (operator == null) return -1;

    if (semantics.operatorLowerCase != "lambda")
        return -1;

    let column = character2Column(operator.column, operator.line, document);

    if (semantics.operands.length == 0) {
        //assuming user is adding argument list, which should align after "lambda "
        return column + operator.symbol.length + 1;
    }

    let argList = semantics.operands[0];
    if (isPosBetween(cursorPos2d, operator.line, operator.column, argList.line, argList.column)) {
        //it's after the start of function name and before the argument list
        //align with function name
        return column + operator.symbol.length + 1;
    }

    return -1; //leave it to default case handler
}

function getNumber_Defun(document: TextDocument, cursorPos2d: Position, semantics: BasicSemantics): number {
    let operator = semantics.operator;
    if (operator == null) return -1;

    if ((semantics.operatorLowerCase != "defun") &&
        (semantics.operatorLowerCase != "defun-q"))
        return -1;

    if (semantics.operands.length == 0) {
        let column = character2Column(operator.column, operator.line, document);

        //assuming user is adding function name, which should be after, e.g., "defun "
        return column + operator.symbol.length + 1;
    }

    let funName = semantics.operands[0];

    if (isPosBetween(cursorPos2d, operator.line, operator.column, funName.line, funName.column)) {
        let column = character2Column(operator.column, operator.line, document);

        //cursor is after the start of defun, and before the function name
        //1 column after the end of operator
        return column + operator.symbol.length + 1;
    }

    if (semantics.operands.length == 1) {
        let column = character2Column(funName.column, funName.line, document);

        //it's after the start of function name; argument list missing
        //assume user is adding argument list, which should align with function name
        return column;
    }

    let argList = semantics.operands[1];
    if (isPosBetween(cursorPos2d, funName.line, funName.column, argList.line, argList.column)) {
        let column = character2Column(funName.column, funName.line, document);

        //it's after the start of function name and before the argument list
        //align with function name
        return column;
    }

    return -1; //leave it to default case handler
}

function getNumber_Defun_ArgList(document: vscode.TextDocument, exprInfo: ElementRange, parentParenExpr: ElementRange): number {
    let parentSemantics = BasicSemantics.parse(parentParenExpr, document);
    if (parentSemantics == null) return -1;

    let parentOperator = parentSemantics.operator;
    if (parentOperator == null) return -1;

    if ((parentSemantics.operatorLowerCase != "defun") &&
        (parentSemantics.operatorLowerCase != "defun-q") &&
        (parentSemantics.operatorLowerCase != "lambda"))
        return -1;

    let directChildren = parentSemantics.operands;

    //find the starting ( of argument list
    for (let i = 0; i < directChildren.length; i++) {
        if ((directChildren[i] instanceof Sexpression) == false)
            continue;

        let subLists = <Sexpression>directChildren[i];
        for (let j = 0; j < subLists.atoms.length; j++) {
            if (subLists.atoms[j].isLeftParen() == false)
                continue;

            //found it
            let pos2d = document.positionAt(exprInfo.startPos.offsetInDocument);
            if (pos2d.line != directChildren[i].line)
                return -1;

            if (pos2d.character != directChildren[i].column)
                return -1;

            //now the exprInfo represents the range of ([argument list]) of defun

            let column = character2Column(directChildren[i].column, directChildren[i].line, document);

            return column + 1;//horizontally right after the ( of argument list
        }
    }

    return -1;
}

//check if cursorPos2d is after [line, column]
function isPosAfter(cursorPos2d: Position, line: number, column: number): boolean {
    if (cursorPos2d.line < line)
        return false;

    if (cursorPos2d.line == line) {
        if (cursorPos2d.character <= column)
            return false;
    }

    return true;
}

//check if cursorPos2d is between [line1, column1] and [line2, column2]
function isPosBetween(cursorPos2d: Position, line1: number, column1: number, line2: number, column2: number): boolean {
    if (isPosAfter(cursorPos2d, line1, column1) == false)
        return false;

    //now cursorPos2d is after [line1, column1]

    if (cursorPos2d.line > line2)
        return false;

    if (cursorPos2d.line == line2) {
        if (cursorPos2d.character > column2)
            return false;
    }

    //now cursorPos2d is before or at [line2, column2]
    //if cursofPos2d is at [line2,column2], when typing sth. new, it's still between the left and right atoms
    return true;
}

function getIdentationForWideFormatStyle(document: TextDocument, cursorPos2d: Position, semantics: BasicSemantics): number {
    if (semantics.operands.length == 0)
        return -1; //to deal with default logic

    //if it's after the first operand, align with it
    if (isPosAfter(cursorPos2d, semantics.operands[0].line, semantics.operands[0].column)) {
        let column = character2Column(semantics.operands[0].column, semantics.operands[0].line, document);

        return column;
    }

    return -1;
}

function getNumber_SetQ(document: TextDocument, cursorPos2d: Position, semantics: BasicSemantics): number {
    let operandNumBeforePos = -1;

    if (semantics.operands.length == 0)
        return -1; //to deal with default logic

    //get the number of operands before current position to determine it should be a variable or value if I
    //add a new atom here
    for (let i = 0; i < semantics.operands.length - 1; i++) {
        //check if it's between the beginnings of operand[i] and operand[i+1]
        let operand1 = semantics.operands[i];
        let operand2 = semantics.operands[i + 1];
        if (isPosBetween(cursorPos2d, operand1.line, operand1.column, operand2.line, operand2.column) == false)
            continue;

        operandNumBeforePos = i + 1;
        break;
    }

    if (operandNumBeforePos == -1) {
        //check if it's after the beginning of last operand
        let lastOperand = semantics.operands[semantics.operands.length - 1];

        if (isPosAfter(cursorPos2d, lastOperand.line, lastOperand.column))
            operandNumBeforePos = semantics.operands.length;
    }

    if (operandNumBeforePos == -1)
        return -1;


    let firstOperandStartColumn = character2Column(semantics.operands[0].column, semantics.operands[0].line, document);

    if ((operandNumBeforePos % 2) == 0) {
        //it's a variable
        return firstOperandStartColumn;
    }
    else {
        //it's a value
        return firstOperandStartColumn + 1;
    }
}

function getWhiteSpaceNumber(document: TextDocument, exprInfo: ElementRange, parentParenExpr: ElementRange,
    cursorPos2d: Position): number {
    if (parentParenExpr != null) {
        let num = getNumber_Defun_ArgList(document, exprInfo, parentParenExpr);
        if (num >= 0)
            return num;
    }

    let semantics = BasicSemantics.parse(exprInfo, document);

    let operator: LispAtom = (semantics != null) ? semantics.operator : null;

    if ((operator == null) || (operator.symbol == null)) {
        //align right after the beginning ( if there's no operator at all; 
        let startPos2d = document.positionAt(exprInfo.startPos.offsetInDocument);

        let column = character2Column(startPos2d.character, startPos2d.line, document);
        return column + 1;
    }

    if (exprInfo.quoted && (semantics.operatorLowerCase != "lambda")) {
        //align right after the beginning ( if:
        //1) the beginning ( is after operator ' and
        //2) the operator of () is not lambda
        let startPos2d = document.positionAt(exprInfo.startPos.offsetInDocument);

        let column = character2Column(startPos2d.character, startPos2d.line, document);
        return column + 1;
    }

    if (operator.symbol.startsWith('"') || operator.symbol.startsWith("'")) {
        //first atom is a string or after '
        //just align with it

        let column = character2Column(operator.column, operator.line, document);
        return column;
    }

    let leftParenCol = character2Column(semantics.leftParenPos.character, semantics.leftParenPos.line, document);
    let endPos2d = document.positionAt(exprInfo.endPos.offsetInDocument + 1);
    if (cursorPos2d.line == endPos2d.line) {
        let textBehindCursor = document.getText(new vscode.Range(cursorPos2d, endPos2d));
        textBehindCursor = textBehindCursor.trim();
        if (textBehindCursor.startsWith(")"))
            return leftParenCol;
    }

    let charCol: number = -1;
    switch (semantics.operatorLowerCase) {
        case "setq":
            charCol = getNumber_SetQ(document, cursorPos2d, semantics);
            if (charCol >= 0)
                return charCol;
            break;

        case "defun":
        case "defun-q":
            charCol = getNumber_Defun(document, cursorPos2d, semantics);
            if (charCol >= 0)
                return charCol;
            break;

        case "lambda":
            charCol = getNumber_Lambda(document, cursorPos2d, semantics);
            if (charCol >= 0)
                return charCol;
            break;

        // All the following keywords using Narrow format style
        case "if":
        case "cond":
        case "while":
        case "repeat":
        case "foreach":
        case "progn":
            return indentationForNarrowStyle() + semantics.leftParenPos.character;

        default:
            let sexpr = new Sexpression();
            let atoms = new Array<LispAtom | Sexpression>();
            atoms = atoms.concat(semantics.operator);
            atoms = atoms.concat(semantics.operands);
            sexpr.setAtoms(atoms);

            if (sexpr.shouldFormatWideStyle(cursorPos2d.character)) {
                charCol = getIdentationForWideFormatStyle(document, cursorPos2d, semantics);
                if (charCol >= 0)
                    return charCol;
            }
            break;
    }

    //the default case: align to Narrow format style:
    //(theOperator xxx
    //    auto indent pos)
    return leftParenCol + indentationForNarrowStyle();
}

function getIndentationInBlockComment(document: vscode.TextDocument, commentRange: ElementRange, cursorNewPos2d: Position): string {
    let startPos2d = document.positionAt(commentRange.startPos.offsetInDocument);

    let indentNum = startPos2d.character + 2;//default alignment: horizontally after ;|

    //now, check if the block comment has multiple lines; if true, and the old cursor pos is not on the first line,
    //the new line should align with the old line
    let cursorOldLine = cursorNewPos2d.line - 1;
    if (cursorOldLine > startPos2d.line) {
        let textLastLine = document.lineAt(cursorOldLine).text;
        let trimmedText = textLastLine.trimLeft();
        indentNum = textLastLine.length - trimmedText.length;
    }
    else if (cursorOldLine == startPos2d.line) {
        let textLastLine = document.lineAt(cursorOldLine).text;
        let charNumBeforeRealComment = startPos2d.character + 2;
        textLastLine = textLastLine.substr(charNumBeforeRealComment);

        let trimmedText = textLastLine.trimLeft();
        indentNum = charNumBeforeRealComment + textLastLine.length - trimmedText.length;
    }

    let indentStr = "";
    for (let i = 0; i < indentNum; i++)
        indentStr += " ";

    return indentStr;
}

function getIndentation(document: TextDocument, containerInfo: ContainerElements, cursorPos2d: Position): string {
    if (containerInfo.containerBlockComment != null)
        return getIndentationInBlockComment(document, containerInfo.containerBlockComment, cursorPos2d);

    let exprInfoArray: ElementRange[] = containerInfo.containerParens;
    if ((exprInfoArray == null) || (exprInfoArray.length == 0))
        return ""; //no identation for top level text

    let parentParenExpr: ElementRange = null;
    if (exprInfoArray.length > 1)
        parentParenExpr = exprInfoArray[1];

    let num = getWhiteSpaceNumber(document, exprInfoArray[0], parentParenExpr, cursorPos2d);
    if (num == -1) {
        console.log("failed to parse paren expression.\n");
        return "";
    }

    let ret = "";
    for (let i = 0; i < num; i++)
        ret += " ";

    return ret;
}

function createContainerBlockCommentInfo(commentStartPos: CursorPosition, nextPos2Scan: CursorPosition, cursorPos: number,
    document: vscode.TextDocument, docText: string): ElementRange {
    if (cursorPos < (commentStartPos.offsetInDocument + 2))
        return null;

    if (nextPos2Scan == null) {
        //the block comment is not finished; the whole rest doc after ;| is inside the comment
        let endPos = new CursorPosition();
        endPos.offsetInDocument = docText.length;
        endPos.offsetInSelection = docText.length - commentStartPos.delta();

        let coverBlockComment = new ElementRange();
        coverBlockComment.startPos = commentStartPos;
        coverBlockComment.endPos = endPos;

        return coverBlockComment;
    }

    if (cursorPos > nextPos2Scan.offsetInDocument)
        return null;//nextPos2Scan if after the end of comment; it's just a rough check to quickly exclude most impossible cases

    let commentStartPos2d = document.positionAt(commentStartPos.offsetInDocument);
    let commentEndPos2d = document.positionAt(nextPos2Scan.offsetInDocument);
    let commentText = document.getText(new vscode.Range(commentStartPos2d, commentEndPos2d));

    if (commentText.endsWith("|;") == false)
        console.log("unexpected end of a block comment");

    if (cursorPos <= (commentStartPos.offsetInDocument + commentText.length - 2)) {
        let coverBlockComment = new ElementRange();
        coverBlockComment.startPos = commentStartPos;
        coverBlockComment.endPos = nextPos2Scan;

        return coverBlockComment;
    }

    //console.log("check if it can be avoided\n");

    return null;
}


function findContainers(document: vscode.TextDocument, cursorPos2d: Position): ContainerElements {
    let docAsString = document.getText();
    let cursorPos = document.offsetAt(cursorPos2d);

    let docStringLength = docAsString.length;

    let parenPairs = new Array<ElementRange>();//temp array to find ( ... ) expression
    let coverParenPairs = new Array<ElementRange>(); //( ... ) expressions that are ancestors of current position
    let coverBlockComment: ElementRange = null;

    let isPrevCharQuote = false;//inside operator '
    for (let pos = 0; pos < docStringLength; /*startPosInString++*/) {
        let char = docAsString.charAt(pos);
        let nextChar = (pos < (docStringLength - 1)) ? docAsString.charAt(pos + 1) : null;

        if ((pos > cursorPos) && (parenPairs.length == 0)) {
            //it's behind the given position, and there's no closing ) to look for;
            //let's quit.
            break;
        }

        //highest priority
        if (char == ';') {
            let commentStartPos = format.CursorPosition.create(pos, pos);

            let nextPos2Scan = format.ListReader.findEndOfComment(document, docAsString, commentStartPos);

            if ((nextChar == '|') && (coverBlockComment == null)) {
                //check if cursor is in this block comment, and if true, create an ElementRange to keep this information
                coverBlockComment = createContainerBlockCommentInfo(commentStartPos, nextPos2Scan, cursorPos, document, docAsString);
            }

            if (nextPos2Scan == null) //doc ended or not found
                break;

            pos = nextPos2Scan.offsetInDocument;
            continue;
        }

        //getting here means you're not in a comment

        //2nd highest priority
        if (char == '"') {
            isPrevCharQuote = false;

            let stringStartPos = format.CursorPosition.create(pos, pos);

            let nextPos2Scan = format.ListReader.findEndOfDoubleQuoteString(document, docAsString, stringStartPos);

            if (nextPos2Scan == null) //doc ended or not found
                break;

            pos = nextPos2Scan.offsetInDocument;
            continue;
        }

        if (char == '\'') {
            isPrevCharQuote = true;
            pos++;
            continue;
        }

        let curCharQuoted = false;
        if (format.ListReader.isEmpty(char, nextChar) == false) {
            curCharQuoted = isPrevCharQuote;

            isPrevCharQuote = false;
        }

        //getting here means you're in neither comment nor string with double quotes

        if (char == '(') {
            let anExpr = new ElementRange();
            anExpr.quoted = curCharQuoted;
            anExpr.startPos = format.CursorPosition.create(pos, pos);
            parenPairs.push(anExpr);

            pos++;
            continue;
        }

        if (char == ')') {
            if (parenPairs.length <= 0) {
                //a ) that has no starting (; let's ignore it
                pos++;
                continue;
            }

            let parenExpr = parenPairs.pop();
            parenExpr.endPos = format.CursorPosition.create(pos, pos);

            //now check if it covers current position
            if ((cursorPos > parenExpr.startPos.offsetInDocument) &&
                (cursorPos <= parenExpr.endPos.offsetInDocument)) {
                //note the if cursor is on the closing ), we take it as inside an expression, as new input will be before )
                coverParenPairs.push(parenExpr);
            }

            pos++;
            continue;
        }

        pos++;
        continue;
    }//end of the for loop based scan

    while (true) {
        if (parenPairs.length == 0)
            break;

        let expr = parenPairs.pop();
        if (expr.endPos != null)
            continue;

        //it's an expression that is not ended; it contains current position too
        expr.endPos = format.CursorPosition.create(docAsString.length - 1, docAsString.length - 1);
        coverParenPairs.push(expr);
    }

    let containerInfo = new ContainerElements();
    containerInfo.containerParens = coverParenPairs;
    containerInfo.containerBlockComment = coverBlockComment;

    return containerInfo;
}

export function subscribeOnEnterEvent() {
    vscode.languages.registerOnTypeFormattingEditProvider(
        ['autolisp', 'lisp'],
        {
            provideOnTypeFormattingEdits(document: vscode.TextDocument, position2d: Position, ch: string): vscode.TextEdit[] {
                if (ch != '\n')
                    return [];

                let edits = new Array<TextEdit>();

                try {
                    //step 1: work out the indentation and fill white spaces in the new line
                    //step 1.1, search for all parentheses that contain current posistion
                    let containerInfo = findContainers(document, position2d);

                    //step 1.2, work out the correctly indented text string of the given line
                    let lineOldText = document.lineAt(position2d.line).text;
                    let lineNoLeftPadding = lineOldText.trimLeft();
                    let leftblanks = lineOldText.length - lineNoLeftPadding.length;
                    let leftblanksPos = new vscode.Position(position2d.line, leftblanks);

                    let lineIndentation = getIndentation(document, containerInfo, position2d);
                    let lineStartPos2d = new vscode.Position(position2d.line, 0);

                    edits.push(TextEdit.delete(new vscode.Range(lineStartPos2d, leftblanksPos)));
                    edits.push(TextEdit.insert(lineStartPos2d, lineIndentation));

                } catch (err) {
                    vscode.window.showInformationMessage("It met some errors to compute the identation.");
                }

                return edits;
            }
        },
        '\n'
    );
}