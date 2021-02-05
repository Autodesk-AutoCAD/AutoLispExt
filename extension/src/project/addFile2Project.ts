import * as vscode from 'vscode'
import { ProjectTreeProvider, isFileAlreadyInProject, hasFileWithSameName } from './projectTree';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

import * as path from 'path'

export async function AddFile2Project(fileList?: vscode.Uri[]) {
    try {
        if (ProjectTreeProvider.hasProjectOpened() == false) {
            let msg = localize("autolispext.project.addfile.openproject", "A project must be open before you can add a file.");
            return Promise.reject(msg);
        }

        let selectedFiles = fileList ?? await SelectLspFiles();
        if (!selectedFiles)
            return; //user has cancelled the open file dialog

        let addedFiles = [];
        for (let file of selectedFiles) {
            let fileUpper = file.fsPath.toUpperCase();
            if (fileUpper.endsWith(".LSP") == false) {
                let msg = localize("autolispext.project.addfile.onlylspallowed", "Only LSP files are allowed.");
                return Promise.reject(msg);
            }

            if(hasMultipleExtensions(fileUpper)) {
                //File name like hello.lsp.lsp causes problem with legacy IDE.
                //Legacy IDE doesn't allow user to add hello.lsp.lsp into a project, but if there happen to be a file
                //  named hello.lsp, it will add hello.lsp into project, and this is wrong.
                //To keep consistency with legacy IDE, we have to reject files of this kind.
                let msg = localize("autolispext.project.addfile.onlylspallowed", "Only LSP files are allowed.");
                return Promise.reject(msg);
            }

            if (isFileAlreadyInProject(file.fsPath, ProjectTreeProvider.instance().projectNode)) {
                let msg = localize("autolispext.project.addfile.filealreadyexist", "File already exists in this project: ");
                vscode.window.showInformationMessage(msg + file.fsPath);

                continue;
            }

            if(hasFileWithSameName(file.fsPath, ProjectTreeProvider.instance().projectNode)) {
                let msg = localize("autolispext.project.addfile.samenameexist", "File with the same name already exists in this project: ");
                vscode.window.showInformationMessage(msg + path.basename(file.fsPath));

                continue;
            }
 
            ProjectTreeProvider.instance().addFileNode(file.fsPath);
            addedFiles.push(file);

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

function hasMultipleExtensions(filePath:string):boolean {
    let ext1 = path.extname(filePath);
    if(!ext1)
        return false;
    
    let leftSide = filePath.substr(0, filePath.length - ext1.length);
    let ext2 = path.extname(leftSide);
    
    if(ext2)
        return true;
    else
        return false;
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
