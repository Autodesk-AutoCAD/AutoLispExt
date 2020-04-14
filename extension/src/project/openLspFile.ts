import * as vscode from 'vscode'
import { DisplayNode, LspFileNode } from './projectTree'

export function openLspFile(clickedTreeItem: DisplayNode) {

    try {
        let isLspFile = clickedTreeItem instanceof LspFileNode;
        if (!isLspFile)
            return;

        let lspNode = clickedTreeItem as LspFileNode;
        if (lspNode.fileExists == false) {
            vscode.window.showErrorMessage("File doesn't exist");//TBD: localize
            return;
        }

        let options = { "preview": false };

        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(lspNode.filePath), options);
    }
    catch (e) {
        vscode.window.showErrorMessage("Unable to open file.")//TBD: localize
    }
}