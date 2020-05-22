import * as vscode from 'vscode'
import { DisplayNode, LspFileNode, ProjectTreeProvider } from './projectTree'

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
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
            let msg = localize("autolispext.project.openlspfile.filenotexist", "File doesn't exist: ");
            return Promise.reject(msg + lspNode.filePath);
        }

        let options = { "preview": false };

        return vscode.commands.executeCommand("vscode.open", vscode.Uri.file(lspNode.filePath), options);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
