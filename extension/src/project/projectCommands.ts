import * as vscode from 'vscode'
import { OpenProject } from './openProject';
import { ProjectTreeProvider } from './projectTree';
import { openLspFile } from './openLspFile';
import { IconUris } from './icons';
import { AddFile2Project } from './addFile2Project';

export function registerProjectCommands(context: vscode.ExtensionContext) {
    try {

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.createProject', async () => {
            vscode.window.showInformationMessage("[Create Project] Not implemented yet");
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.openProject', async () => {
            OpenProject()
                .then(prjNode => {
                    if (!prjNode)
                        return;//it's possible that the user cancelled the operation

                    ProjectTreeProvider.instance().updateData(prjNode);
                })
                .catch(err => {
                    vscode.window.showErrorMessage("Failed to open the given project.");//TBD: localize
                });
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.addFile2Project', async () => {
            AddFile2Project()
                .then(addedFiles => {
                    if (!addedFiles)
                        return;//it's possible that the user cancelled the operation

                    ProjectTreeProvider.instance().refreshData();
                })
                .catch(err => {
                    vscode.window.showErrorMessage("Failed to add selected files to project.");//TBD: localize
                })
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.SaveProject', async () => {
            vscode.window.showInformationMessage("[Save Project] Not implemented yet");
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.loadAllFiles', async () => {
            vscode.window.showInformationMessage("[Load all files] Not implemented yet");
        }));


        context.subscriptions.push(vscode.commands.registerCommand(ProjectTreeProvider.TreeItemClicked, (treeItem) => {
            openLspFile(treeItem);
        }));

        IconUris.initialize();
    }
    catch (e) {
        vscode.window.showErrorMessage("Failed to initialize Autolisp project manager.");//TBD: localize
        console.log(e);
    }
}