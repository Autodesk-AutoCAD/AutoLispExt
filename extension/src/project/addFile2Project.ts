import * as vscode from 'vscode'
import { ProjectTreeProvider } from './projectTree';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function AddFile2Project() {
    try {
        if (ProjectTreeProvider.hasProjectOpened() == false) {
            let msg = localize("autolispext.project.addfile.openproject", "A project must be open before you can add a file.");
            return Promise.reject(msg);
        }

        let selectedFiles = await SelectLspFiles();
        if (!selectedFiles)
            return; //user has cancelled the open file dialog
        
        let addedFiles = [];
        for (let file of selectedFiles) {
            let fileUpper = file.fsPath.toUpperCase();
            if (fileUpper.endsWith(".LSP") == false) {
                let msg = localize("autolispext.project.addfile.onlylspallowed", "Only LSP files are allowed.");
                return Promise.reject(msg);
            }

            if (ProjectTreeProvider.instance().addFileNode(file.fsPath) == false) {
                let msg = localize("autolispext.project.addfile.filealreadyexist", "File already exists in this project.");
                vscode.window.showInformationMessage(msg + file.fsPath);
            } else {
                addedFiles.push(file);
            }
        }
        
        if (!addedFiles.length)
            return;

        return Promise.resolve(addedFiles);
    }
    catch (e) {
        console.log(e);
        return Promise.reject(e);
    }
}

async function SelectLspFiles() {
    let label = localize("autolispext.project.addfile.openlabel", "Add to Project");
    const options: vscode.OpenDialogOptions = {
        //TBD: globalize
        canSelectMany: true,
        openLabel: label,
        filters: {
            'Autolisp source files': ['lsp']
        }
    };

    let fileUris = await vscode.window.showOpenDialog(options);
    if (fileUris && fileUris.length > 0)
        return Promise.resolve(fileUris);
}
