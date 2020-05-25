import { SaveProject } from './saveProject';
import { ProjectTreeProvider } from './projectTree';
import * as vscode from 'vscode';
import { pathEqual } from '../utils';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

//return false if no project is opened or there are no unsaved changes or user select "Save" or "Don't Save" the changes
//return true if there are unsaved changes and user select "Cancel" or just close the dialog
export async function CheckUnsavedChanges(): Promise<boolean> {
    const root = ProjectTreeProvider.instance().projectNode;
    if (!root) {
        return false;
    }

    // get unsaved source files
    const unsavedFiles = vscode.workspace.textDocuments.filter(file => {
        if (file.isDirty) {
            for (let fileNode of root.sourceFiles) {
                if (pathEqual(fileNode.filePath, file.fileName, false)) {
                    return true;
                }
            }
            return false;
        }
    });
    
    // prompt user if there are unsaved changes
    if (root.projectModified || unsavedFiles.length > 0) {
        let msg = localize("autolispext.project.checkunsavedchanges.message", "Do you want to save the changes?");
        let save = localize("autolispext.project.checkunsavedchanges.save", "Save");
        let dontSave = localize("autolispext.project.checkunsavedchanges.dontsave", "Don't Save");
        const selection = await vscode.window.showWarningMessage(msg, {modal: true}, save, dontSave);
        if (!selection) {
            return true;
        }
        if (selection == save) {
            for (let file of unsavedFiles) {
                file.save();
            }
            if (root.projectModified) {
                await SaveProject(true);
            }
        }
        return false;
    }

    return false;
}