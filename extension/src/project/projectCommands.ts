import * as vscode from 'vscode'
import { OpenProject } from './openProject';
import { ProjectTreeProvider } from './projectTree';
import { openLspFile } from './openLspFile';
import { IconUris } from './icons';
import { AddFile2Project } from './addFile2Project';
import { SaveProject } from './saveProject';
import { excludeFromProject } from './excludeFile';
import { getNewProjectFilePath, createProject } from './createProject';
import { getSearchOption } from './findReplace/options';
import { FindInProject } from './findReplace/findInProject';
import { SearchTreeProvider } from './findReplace/searchTree';

export function registerProjectCommands(context: vscode.ExtensionContext) {
    try {

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.createProject', async () => {
            try {
                let prjPath = await getNewProjectFilePath();
                if (!prjPath)
                    return;

                let prjNode = await createProject(prjPath.fsPath);

                ProjectTreeProvider.instance().updateData(prjNode);

                await SaveProject(false);
            }
            catch (err) {
                showErrorMessage("Failed to create project.", err);//TBD: localize
            }
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

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.removeFileFromProject', async (selected) => {
            excludeFromProject(selected)
                .then(() => {
                    ProjectTreeProvider.instance().refreshData();
                })
                .catch(err => {
                    showErrorMessage("Failed to remove selected file.", err); //TBD: localize
                })
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.SaveProject', async () => {
            SaveProject(true)
                .then(prjPath => {
                    ProjectTreeProvider.instance().refreshData();
                    vscode.window.showInformationMessage("Project file saved"); //TBD: localize
                })
                .catch(err => {
                    showErrorMessage("Failed to save project:", err); //TBD: localize
                });
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.loadAllFiles', async () => {
            vscode.window.showInformationMessage("[Load all files] Not implemented yet");
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.refreshFileStatus', async () => {
            try {
                ProjectTreeProvider.instance().refreshData();
            } catch (err) {
                showErrorMessage("Failed to refresh file status.", err); //TBD: localize
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand(ProjectTreeProvider.TreeItemClicked, (treeItem) => {
            openLspFile(treeItem)
                .catch(err => {
                    showErrorMessage("Failed to open file.", err); //TBD: localize
                })
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.findInProject', async () => {
            try {
                if (ProjectTreeProvider.hasProjectOpened() == false) {
                    vscode.window.showInformationMessage("Please open or create a project first"); //TBD: localize
                    return;
                }

                let opt = await getSearchOption('Find in Project', 'type keyword, and press ENTER'); //TBD: localize
                if (opt.completed == false)
                    return;

                let finder = new FindInProject();
                await finder.execute(opt, ProjectTreeProvider.instance().projectNode);

                SearchTreeProvider.instance.reset(finder.resultByFile);
            }
            catch (err) {
                showErrorMessage("Failed to search in project.", err); //TBD: localize
            }
        }));

        IconUris.initialize();
    }
    catch (e) {
        vscode.window.showErrorMessage("Failed to initialize Autolisp project manager.");//TBD: localize
        console.log(e);
    }
}

function showErrorMessage(description: string, detail: string) {
    if (!detail) {
        vscode.window.showErrorMessage(description);
    } else {
        vscode.window.showErrorMessage(description + "\r\n" + detail);
    }
}
