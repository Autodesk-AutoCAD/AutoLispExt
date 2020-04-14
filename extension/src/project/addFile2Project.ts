import * as vscode from 'vscode'
import { ProjectTreeProvider } from './projectTree';

export async function AddFile2Project() {
    try {
        if (ProjectTreeProvider.hasProjectOpened() == false)
            return; //no project exists

        let selectedFiles = await SelectLspFiles();
        if (!selectedFiles)
            return; //user has cancelled the open file dialog

        for (let file of selectedFiles) {
            ProjectTreeProvider.instance().addFileNode(file.fsPath);
        }

        return Promise.resolve(selectedFiles);
    }
    catch (e) {
        console.log(e);
        return Promise.reject(e);
    }
}

async function SelectLspFiles() {
    const options: vscode.OpenDialogOptions = {
        //TBD: globalize
        canSelectMany: true,
        openLabel: 'Add to Project',
        filters: {
            'Autolisp source files': ['lsp'],
            'All files': ['*']
        }
    };

    let fileUris = await vscode.window.showOpenDialog(options);
    if (fileUris && fileUris.length > 0)
        return Promise.resolve(fileUris);
}
