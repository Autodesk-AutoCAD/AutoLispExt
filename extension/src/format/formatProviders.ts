import * as vscode from 'vscode';
import { LispFormatter } from './formatter'
import * as utils from "../utils"

export function registerDocumentFormatter() {
    vscode.languages.registerDocumentFormattingEditProvider(['autolisp', 'lisp'], {
        provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
            let activeTextEditor = vscode.window.activeTextEditor;
            let currentLSPDoc = activeTextEditor.document.fileName;
            let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
            if (ext === ".DCL") {
                vscode.window.showInformationMessage("Command doesn’t support DCL files.");
                return;
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
			let currentLSPDoc = activeTextEditor.document.fileName;
			let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
			if (ext === ".DCL") {
				vscode.window.showInformationMessage("Command doesn’t support DCL files.");
				return;
			}
			if (activeTextEditor.selection.isEmpty) {
				vscode.window.showInformationMessage("First, select the lines of code to format.");
			}
			
			let fmt = LispFormatter.format(activeTextEditor, false);
			return [vscode.TextEdit.replace(utils.getSelectedDocRange(activeTextEditor), fmt)];
		}
	});
}