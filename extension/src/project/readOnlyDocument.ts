import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs'

export class ReadonlyLine implements vscode.TextLine {
    private constructor() {

    }

    static Create(txt: string, line: number): ReadonlyLine {
        let ret = new ReadonlyLine();

        ret.text = txt;
        ret.lineNumber = line;

        return ret;
    }

    lineNumber: number;
    text: string;

    get rangeIncludingLineBreak(): vscode.Range {
        throw new Error("Method not implemented")//not used in AutolispExt
    }

    get range(): vscode.Range {
        throw new Error("Method not implemented")//not used in AutolispExt
    }

    get firstNonWhitespaceCharacterIndex(): number {
        throw new Error("Method not implemented")//not used in AutolispExt
    }

    get isEmptyOrWhitespace(): boolean {
        throw new Error("Method not implemented")//not used in AutolispExt
    }
}

export class ReadonlyDocument implements vscode.TextDocument {
    private constructor(filePath: string) {
        this.uri = vscode.Uri.file(filePath);
        this.fileName = filePath;
        this.isUntitled = false;
        this.version = 1;
        this.isDirty = false;
        this.isClosed = false;
    }

    static open(filePath: string): ReadonlyDocument {
        if (fs.existsSync(filePath) == false) {
            return null;
        }

        let langId = null;
        let filePathLower = filePath.toLocaleLowerCase();
        if (filePathLower.endsWith('.prj')) {
            langId = 'autolispprj';
        }
        else if (filePathLower.endsWith('.lsp')) {
            langId = 'autolisp';
        }
        else {
            return null;
        }

        let ret = new ReadonlyDocument(filePath);

        let data = fs.readFileSync(filePath).toString();
        ret.initialize(data, langId);
        return ret;
    }

    static createProject(prjContent: string): ReadonlyDocument {
        let ret = new ReadonlyDocument('');

        ret.initialize(prjContent, 'autolispprj');
        return ret;
    }

    initialize(fileContent: string, languageId: string) {
        this.fileContent = fileContent.split('\r\n').join('\n').split('\n').join('\r\n');//to make sure every line ends with \r\n
        this.eol = vscode.EndOfLine.CRLF;
        this.eolLength = 2;

        this.languageId = languageId;

        if (this.fileContent.length == 0) {
            this.lineCount = 0;
            this.lines = [];
        }
        else {
            this.lines = fileContent.split('\r\n');
            this.lineCount = this.lines.length;
        }
    }

    fileContent: string;
    lines: string[];
    eolLength: number;

    //#region implementing vscode.TextDocument

    uri: vscode.Uri;
    fileName: string;
    isUntitled: boolean;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;

    eol: vscode.EndOfLine;
    lineCount: number;

    save(): Thenable<boolean> {
        throw new Error('save is not allowed on read-only document.');
    }

    lineAt(line: number): vscode.TextLine;
    lineAt(position: vscode.Position): vscode.TextLine;
    lineAt(position: number | vscode.Position): vscode.TextLine {
        let line = -1;
        if (typeof position === 'number') {
            line = <number>position;
        }
        else {
            line = position.line;
        }

        if (line >= this.lineCount) //line number starts by 0
            return null;

        return ReadonlyLine.Create(this.lines[line], line);
    }

    offsetAt(position: vscode.Position): number {
        if (position.line >= this.lineCount)
            return this.fileContent.length; //invalid input; put the "cursor" after the last char

        let offset = 0;
        //count char number before the given line
        for (let line = 0; line < position.line; line++) {
            offset += this.lines[line].length;
            offset += this.eolLength;
        }

        //now the last line
        let lastLine = this.lines[position.line];
        let charNum = position.character;
        if (position.character >= lastLine.length)
            charNum = lastLine.length; //put the "cursor" after the last char

        offset += charNum;

        return offset;
    }

    positionAt(offset: number): vscode.Position {
        let charCounted = 0;

        for (let line = 0; line < this.lineCount; line++) {
            let lineText = this.lines[line];
            if ((charCounted + lineText.length) >= offset) {
                //the offset is inside current line
                let charNum = offset - charCounted;

                return new vscode.Position(line, charNum);
            }

            //now, the offset is outside current line

            if (line == (this.lineCount - 1)) {
                //current line is the end of all, so the given position is invalid

                return new vscode.Position(line, lineText.length);//put the "cursor" after the last char
            }

            //then there's at least 1 more line; continue the loop
            charCounted += lineText.length;
            charCounted += this.eolLength;

            if (charCounted >= offset) {
                //well, the given offset is inside or right after the '\r\n'
                return new vscode.Position(line + 1, 0);
            }
        }

        //the code shouldn't get here because it should have returned in the for loop when line == this.lineCount - 1
        throw new Error("can't convert offset to position");
    }

    getText(range?: vscode.Range): string {
        if (!range)
            return this.fileContent;

        range = this.validateRange(range);

        let start = this.offsetAt(range.start);
        let end = this.offsetAt(range.end);

        if (start >= this.fileContent.length)
            return '';

        return this.fileContent.substring(start, end);
    }

    getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range {
        throw new Error('Method not implemented.');//it's only needed by auto complete, which won't run for a .prj
    }

    validateRange(range: vscode.Range): vscode.Range {
        let start = this.offsetAt(range.start);
        let end = this.offsetAt(range.end);

        let startPos = this.positionAt(start);
        let endPos = this.positionAt(end);

        return new vscode.Range(startPos, endPos);
    }

    validatePosition(position: vscode.Position): vscode.Position {
        throw new Error('Method not implemented.'); //not used in AutolispExt
    }

    //#endregion
}