import * as vscode from 'vscode'
import { DisplayNode, LspFileNode, ProjectTreeProvider } from './projectTree'

const fs = require('fs')

export async function openLspFile(clickedTreeItem: DisplayNode) {

    try {
        let isLspFile = clickedTreeItem instanceof LspFileNode;
        if (!isLspFile)
            return;

        let lspNode = clickedTreeItem as LspFileNode;
        const exists = fs.existsSync(lspNode.filePath);
        if (exists != lspNode.fileExists) {
            ProjectTreeProvider.instance().refreshData(clickedTreeItem);
        }

        if (exists == false) {
            return Promise.reject("File doesn't exist: " + lspNode.filePath); //TBD: localize
        }

        let options = { "preview": false };

        return vscode.commands.executeCommand("vscode.open", vscode.Uri.file(lspNode.filePath), options);
    }
    catch (e) {
        return Promise.reject(e);
    }
}