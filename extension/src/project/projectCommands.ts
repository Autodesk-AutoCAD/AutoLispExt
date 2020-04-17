import * as vscode from 'vscode'
import { OpenProject } from './openProject';
import { ProjectTreeProvider } from './projectTree';
import { openLspFile } from './openLspFile';
import { IconUris } from './icons';
import { AddFile2Project } from './addFile2Project';
import { SaveProject } from './saveProject';

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
                    showErrorMessage("Failed to open the given project.", err);//TBD: localize
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
                    showErrorMessage("Failed to add selected files to project.", err);//TBD: localize
                })
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.SaveProject', async () => {
            SaveProject()
            .then(prjPath => {
                vscode.window.showInformationMessage("Project file saved"); //TBD: localize
            })
            .catch(err => {
                showErrorMessage("Failed to save project:", err); //TBD: localize
            });
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.loadAllFiles', async () => {
            vscode.window.showInformationMessage("[Load all files] Not implemented yet");
        }));


        context.subscriptions.push(vscode.commands.registerCommand(ProjectTreeProvider.TreeItemClicked, (treeItem) => {
            openLspFile(treeItem)
            .catch(err => {
                showErrorMessage("Failed to open file.", err); //TBD: localize
            })
        }));

        IconUris.initialize();
    }
    catch (e) {
        vscode.window.showErrorMessage("Failed to initialize Autolisp project manager.");//TBD: localize
        console.log(e);
    }
}

function showErrorMessage(description:string, detail:string) {
    if(!detail) {
        vscode.window.showErrorMessage(description);
    } else {
        vscode.window.showErrorMessage(description + "\r\n" + detail);
    }
}
