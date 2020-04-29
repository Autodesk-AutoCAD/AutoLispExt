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
export function getEditor(filePath: string): vscode.TextEditor {
    let editors = vscode.window.visibleTextEditors;
    if ((!editors) || (editors.length == 0))
        return null;

    let targetFilePath = filePath.toLowerCase().split('/').join("\\")
  
    for (let editor of editors) {
        if(!editor.document)
            continue;

        if(!editor.document.fileName)
            continue;
            
        let editorFilePath = editor.document.fileName.toLowerCase().split('/').join("\\")

        if (editorFilePath != targetFilePath)
            continue;

        return editor;
    }

    return null;
}

//if the given file is opened in an editor with unsaved changes, save its latest content into a temp file,
//  and return the file path of this temp file
//otherwise return the original file path
export function saveUnsavedDoc2Tmp(filePath:string): string {
    let editor = getEditor(filePath);
    if(editor == null)
        return filePath;
    
    if(editor.document.isDirty == false)
        return filePath;

    let tmpFile = getTmpFilePath();

    fs.writeFileSync(tmpFile, editor.document.getText());

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
