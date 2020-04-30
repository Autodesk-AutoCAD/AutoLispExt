import { SaveProject } from './saveProject';
import { ProjectTreeProvider } from './projectTree';
import * as vscode from 'vscode';
import { pathEqual } from '../utils';

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
        const selection = await vscode.window.showWarningMessage("Do you want to save the changes you made to the project?\n\nYour changes will be lost if you don't save them.", {modal: true}, "Save", "Don't Save");
        if (!selection) {
            return true;
        }
        if (selection == "Save") {
            for (let file of unsavedFiles) {
                file.save();
            }
            if (root.projectModified) {
                await SaveProject(true);
                ProjectTreeProvider.instance().refreshData();
            }
        }
        return false;
    }

    return false;
}