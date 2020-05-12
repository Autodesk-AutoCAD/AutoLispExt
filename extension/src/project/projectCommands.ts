import * as vscode from 'vscode'
import { OpenProject } from './openProject';
import { ProjectTreeProvider } from './projectTree';
import { openLspFile } from './openLspFile';
import { IconUris } from './icons';
import { AddFile2Project } from './addFile2Project';
import { SaveProject } from './saveProject';
import { excludeFromProject } from './excludeFile';
import { getNewProjectFilePath, createProject } from './createProject';
import { findInProject } from './findReplace/findInProject';
import { SearchTreeProvider, SummaryNode } from './findReplace/searchTree';
import { openSearchResult } from './findReplace/openSearchResult';
import { replaceInProject } from './findReplace/replaceInProject';
import { CheckUnsavedChanges } from './checkUnsavedChanges';
import { clearSearchResults, clearSearchResultWithError, stopSearching } from './findReplace/clearResults';

export function registerProjectCommands(context: vscode.ExtensionContext) {
    try {

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.createProject', async () => {
            try {
                if (await CheckUnsavedChanges()) {
                    return;
                }

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

        //register the handler of "find in project"
        context.subscriptions.push(vscode.commands.registerCommand('autolisp.findInProject', async () => {
            findInProject().catch(err => {
                showErrorMessage("Failed to find in project.", err); //TBD: localize
                clearSearchResultWithError("Failed to find in project. " + (err ? err.toString() : ''));//TBD: localize
            });
        }));

        //register the handler of "replace in project"
        context.subscriptions.push(vscode.commands.registerCommand('autolisp.replaceInProject', async () => {
            replaceInProject().catch(err => {
                showErrorMessage("Failed to replace in project.", err); //TBD: localize
                clearSearchResultWithError("Failed to replace in project. " + (err ? err.toString() : ''));//TBD: localize
            })
        }));

        context.subscriptions.push(vscode.commands.registerCommand(SearchTreeProvider.showResult, (treeItem) => {
            openSearchResult(treeItem, SearchTreeProvider.instance.lastSearchOption)
                .catch(err => {
                    showErrorMessage("Failed to open search result.", err); //TBD: localize
                })
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.clearSearchResults', (treeItem) => {
            try {
                clearSearchResults();
            }
            catch (err) {
                showErrorMessage("Failed to clear search results.", err); //TBD localize
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.stopSearch', () => {
            try {
                stopSearching();
            }
            catch (err) {
                console.log("failed to stop searching;")
                if (err)
                    console.log(err.toString());
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
