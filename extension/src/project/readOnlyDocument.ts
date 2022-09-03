import * as vscode from 'vscode';
import * as fs from 'fs';
import * as nls from 'vscode-nls';
import { LispParser } from '../parsing/lispParser';
import { DocumentManager } from '../documents';
import { DocumentServices } from '../services/documentServices';
import { ILispFragment } from '../astObjects/ILispFragment';
import { LispContainer } from '../astObjects/lispContainer';
import { DclTile } from '../astObjects/dclTile';
import * as DclParser from '../parsing/dclParser';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class ReadonlyLine implements vscode.TextLine {
    private constructor() {}

    static Create(txt: string, line: number): ReadonlyLine {
        let ret = new ReadonlyLine();

        ret.text = txt;
        ret.lineNumber = line;

        return ret;
    }

    lineNumber: number;
    text: string;

    get rangeIncludingLineBreak(): vscode.Range {
        throw new Error("Method not implemented");//not used in AutolispExt
    }

    get range(): vscode.Range {
        throw new Error("Method not implemented");//not used in AutolispExt
    }

    get firstNonWhitespaceCharacterIndex(): number {
        throw new Error("Method not implemented");//not used in AutolispExt
    }

    get isEmptyOrWhitespace(): boolean {
        throw new Error("Method not implemented");//not used in AutolispExt
    }
}

export class ReadonlyDocument implements vscode.TextDocument {
    private constructor(filePath: string) {
        this.uri = vscode.Uri.file(filePath);
        this.fileName = DocumentServices.normalizeFilePath(filePath);
        this.isUntitled = false;
        this.version = 1;
        this.isDirty = false;
        this.isClosed = false;
    }

    static open(filePath: string): ReadonlyDocument {
        const langId = DocumentManager.getSelectorType(filePath);
        if (fs.existsSync(filePath) === false || langId === "") {
            return null;
        }
        
        let ret = new ReadonlyDocument(filePath);

        let data = fs.readFileSync(filePath).toString();
        ret.initialize(data, langId);
        return ret;
    }

    // Example Use Cases
    //      Identify global variables from fragments of AutoLisp code
    //      Currently in use to save/create PRJ files
    static createMemoryDocument(fileContent: string, languageId: string): ReadonlyDocument {        
        let ret = new ReadonlyDocument('');
        ret.initialize(fileContent, languageId);
        return ret;
    }

    // Added this to essentially cast standard TextDocument's to a ROD type enabling work to be done with enhanced standardized/functionality
    // Related to to discussion issue#30
    static getMemoryDocument(doc: vscode.TextDocument): ReadonlyDocument {        
        let ret = new ReadonlyDocument('');
        ret.eol = vscode.EndOfLine.CRLF;
        ret.eolLength = 2;
        ret.lineCount = doc.lineCount;
        ret.languageId = DocumentManager.getSelectorType(doc.fileName);
        ret.lines = [];        
        ret.fileName = doc.fileName;
        for (let i = 0; i < doc.lineCount; i++) {
            ret.lines.push(doc.lineAt(i).text);
        }
        ret.fileContent = ret.lines.join('\r\n');
        return ret;
    }

    initialize(rawContent: string, langId: string) {
        this.fileContent = rawContent.replace(/\r*\n/g, '\r\n');//rawContent.split('\r\n').join('\n').split('\n').join('\r\n');//to make sure every line ends with \r\n
        this.eol = vscode.EndOfLine.CRLF;
        this.eolLength = 2;

        this.languageId = langId;

        if (this.fileContent.length === 0) {
            this.lineCount = 0;
            this.lines = [];
        }
        else {
            this.lines = this.fileContent.split('\r\n');
            this.lineCount = this.lines.length;
        }
    }


    fileContent: string;
    lines: string[];
    eolLength: number;
    private _documentContainer: LispContainer|DclTile; // Added to drastically reduces complexity in other places.

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

        if (line >= this.lineCount) { //line number starts by 0
            return null;
        }

        return ReadonlyLine.Create(this.lines[line], line);
    }

    offsetAt(position: vscode.Position): number {
        if (position.line >= this.lineCount) {
            return this.fileContent.length; //invalid input; put the "cursor" after the last char
        }
        let offset = 0;
        //count char number before the given line
        for (let line = 0; line < position.line; line++) {
            offset += this.lines[line].length;
            offset += this.eolLength;
        }

        //now the last line
        let lastLine = this.lines[position.line];
        let charNum = position.character;
        if (position.character >= lastLine.length) {
            charNum = lastLine.length; //put the "cursor" after the last char
        }
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

            if (line === (this.lineCount - 1)) {
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
        let msg = localize("autolispext.project.readonlydocument.convertoffsettopositionfailed", "Failed to convert offset to position.");
        throw new Error(msg);
    }

    getText(range?: vscode.Range): string {
        if (!range) {
            return this.fileContent;
        }
        range = this.validateRange(range);

        let start = this.offsetAt(range.start);
        let end = this.offsetAt(range.end);

        if (start >= this.fileContent.length) {
            return '';
        }
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


    equal(doc: vscode.TextDocument): boolean {
        return this.fileName.toUpperCase().replace(/\\/g, '/') === doc.fileName.toUpperCase().replace(/\\/g, '/')
               && this.fileContent === doc.getText().replace(/\r\n|\r|\n/g, '\r\n'); //.split('\r\n').join('\n').split('\n').join('\r\n');
    }

    
    get documentContainer(): LispContainer {
        if (this.languageId !== DocumentManager.Selectors.lsp) {
            return null;
        }

        return (this._documentContainer instanceof LispContainer)
            ? this._documentContainer
            : this._documentContainer = LispParser.getDocumentContainer(this.fileContent);
    }

    get documentDclContainer(): DclTile {
        if (this.languageId !== DocumentManager.Selectors.dcl) {
            return null;
        }

        return (this._documentContainer instanceof DclTile)
            ? this._documentContainer
            : this._documentContainer = DclParser.getDocumentTileContainer(this.fileContent);
    }
}