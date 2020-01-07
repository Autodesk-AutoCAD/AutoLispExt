import * as vscode from 'vscode';
import { internalLispFuncs } from './completion/autocompletionProvider'

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

export function isAutolispBultinAtom(op: string): boolean {
    let builtinSymbols = internalLispFuncs;
    if (builtinSymbols.indexOf(op) >= 0)
        return true;
    return false;
}