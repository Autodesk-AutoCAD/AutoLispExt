import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path'
import * as fs from 'fs-extra';

const os = require('os');

export function getFullDocRange(editor: vscode.TextEditor): vscode.Range {
    return editor.document.validateRange(
        new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(Number.MAX_VALUE, Number.MAX_VALUE)
        )
    );
}

export function getSelectedDocRange(editor: vscode.TextEditor): vscode.Range {
    let startPos = new vscode.Position(editor.selection.start.line, editor.selection.start.character);
    let endPos = new vscode.Position(editor.selection.end.line, editor.selection.end.character);
    return editor.document.validateRange(
        new vscode.Range(
            startPos,
            endPos
        )
    );
}

export function acitiveDocHasValidLanguageId(): Boolean {
    const editor = vscode.window.activeTextEditor;

    return editor.document.languageId === 'autolisp' ||
        editor.document.languageId === 'autolispdcl' ||
        editor.document.languageId === 'lisp';
}

//get the editor opened for the given file;
//return null if there's no editor for this file
export function getDocument(filePath: string): vscode.TextDocument {
    let docs = vscode.workspace.textDocuments;
    if(!docs)
        return null;

    for (let doc of docs) {
        if(doc.isClosed || doc.isUntitled || !doc.fileName)
            continue;
            
        if (pathEqual(filePath, doc.fileName, false) == false)
            continue;

        return doc;
    }

    return null;
}

let isWindows = undefined;

export function pathEqual(path1:string, path2:string, isDir:boolean): boolean {
    let p1 = path.normalize(path1);
    let p2 = path.normalize(path2);

    if(isDir) {
        //for directory, eliminate the trailing slash if it exists
        p1 = path.format(path.parse(p1));
        p2 = path.format(path.parse(p2));
    }

    if(isWindows == undefined) {
        isWindows = (os.type() == 'Windows_NT');
    }
        
    if(isWindows)
        return p1.toLocaleLowerCase() == p2.toLocaleLowerCase();
    else
        return p1 == p2;
}

//if the given file is opened in an editor, save its latest content into a temp file,
//  and return the file path of this temp file;
//  otherwise return the original file path

//the reason why we save open doc to tmp:
//  1. we need to search in the unsaved text;
//  2. the user might manually override the encoding on VS Code editor;
export function saveOpenDoc2Tmp(filePath:string): string {
    let doc = getDocument(filePath);
    if(doc == null)
        return filePath;
    
    let tmpFile = getTmpFilePath();

    fs.writeFileSync(tmpFile, doc.getText());

    return tmpFile;
}

export function getTmpFilePath(): string {

    let tmpFile = tryGetTmpFilePath();

    while (fs.existsSync(tmpFile)) {
        //in case the file path is occupied
        tmpFile = tryGetTmpFilePath();
    }

    return tmpFile;
}

function tryGetTmpFilePath() {
    return path.join(os.tmpdir(), `unsaved.${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.tmp`);
}

// useful when building from new RegExp and incorporating a dynamic keyword as part of the search pattern.
export function escapeRegExp(string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

// en-US is forced because native AutoLisp is in english and ZXX is a 'no particular language' override
// https://unicode.org/reports/tr35/#BCP_47_Language_Tag_Conversion
const collator = new Intl.Collator([vscode.env.language, 'en-US', 'zxx'], { sensitivity: 'base', });
export function StringEqualsIgnoreCase(str1: string, str2: string): boolean {
    return collator.compare(str1, str2) === 0;
}

// For situations (like parsing) where many strings are being constructed or one large string from many small sources.
// This doesn't save nearly as much garbage collection/performance as a .Net implementation, but it does do what it
// intended to do and in large scenarios the performance increase is very obvious.
export class StringBuilder {
	private _charCodes: Array<number> = [];

    charCodeAt(index: number): number {
        return this._charCodes[index];
    }

    hasValues(): boolean {
        return this._charCodes.length > 0;
    }

	appendCode(charCode: number): void {
		this._charCodes.push(charCode);
	}

    endsWith(charCode: number): boolean {
		return this._charCodes[this._charCodes.length - 1] === charCode;
	}

    materialize(): string {
		try {
			return String.fromCharCode(...this._charCodes);	
		} finally {
			this._charCodes.length = 0;
		}
	}


    // This is no longer used, but functional and can be put back in if you need it
    //------------------------------------------------------------------------------
	// appendString(char: string): void {
	// 	for (let i = 0; i < char.length; i++) {
	// 		this._charCodes.push(char.charCodeAt(i));
	// 	}
	// }


    // This is no longer used, but functional and can be put back in if you need it
    //------------------------------------------------------------------------------
	// static toCharCodeArray(chars: string, inArray?: Array<number>): Array<number> {
    //     if (!inArray) {
    //         inArray = [];
    //     }
	// 	for (let i = 0; i < chars.length; i++) {
	// 		inArray.push(chars.charCodeAt(i));
	// 	}
	// 	return inArray;
	// }

    
    // This is no longer used, but functional and can be put back in if you need it
    //------------------------------------------------------------------------------
	// endsWithCodes(charCodes: Array<number>): boolean {
	// 	let offsetLength = this._charCodes.length - charCodes.length;
	// 	if (offsetLength < 0) {
	// 		return false;
	// 	}
	// 	for (let i = offsetLength, j = 0; j < charCodes.length; i++, j++) {
	// 		if (this._charCodes[i] !== charCodes[j]) {
	// 			return false;
	// 		}
	// 	}
	// 	return true;
	// }

	
}