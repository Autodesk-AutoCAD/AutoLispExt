import * as vscode from 'vscode';
import { LispFormatter } from './formatter'
import * as utils from "../utils"
import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function registerDocumentFormatter() {
    vscode.languages.registerDocumentFormattingEditProvider(['autolisp', 'lisp'], {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            let activeTextEditor = vscode.window.activeTextEditor;
            if (activeTextEditor == undefined)
                return [];
            let currentLSPDoc = activeTextEditor.document.fileName;
            let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
            if (ext === ".DCL") {
                let msg = localize("autolispext.format.notsupport.dcl", "Command doesn't support DCL files.");
                vscode.window.showInformationMessage(msg);
                return [];
            }

            let fmt = LispFormatter.format(activeTextEditor, true);
            return [vscode.TextEdit.replace(utils.getFullDocRange(activeTextEditor), fmt)];
        }
    });
}

export function registeSelectionFormatter() {
    vscode.languages.registerDocumentRangeFormattingEditProvider(['autolisp', 'lisp'], {
        provideDocumentRangeFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            let activeTextEditor = vscode.window.activeTextEditor;
            if (activeTextEditor == undefined)
                return [];
            let currentLSPDoc = activeTextEditor.document.fileName;
            let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
            if (ext === ".DCL") {
                let msg = localize("autolispext.format.notsupport.dcl", "Command doesn't support DCL files.");
                vscode.window.showInformationMessage(msg);
                return [];
            }
            if (activeTextEditor.selection.isEmpty) {
                let msg = localize("autolispext.format.selectionlines", "First, select the lines of code to format.");
                vscode.window.showInformationMessage(msg);
            }

            let fmt = LispFormatter.format(activeTextEditor, false);
            return [vscode.TextEdit.replace(utils.getSelectedDocRange(activeTextEditor), fmt)];
        }
    });
}