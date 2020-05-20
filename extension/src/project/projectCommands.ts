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
import { clearSearchResults, clearSearchResultWithError, stopSearching, getWarnIsSearching } from './findReplace/clearResults';

export function registerProjectCommands(context: vscode.ExtensionContext) {
    try {

        SearchTreeProvider.instance.updateTitle(true);
        ProjectTreeProvider.instance().updateTitle(true);

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.createProject', async () => {
            try {
                if (getWarnIsSearching())
                    return;

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
            if (getWarnIsSearching())
                return;

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
            if (getWarnIsSearching())
                return;

            try {
                let addedFiles = await AddFile2Project();
                if (!addedFiles)
                    return;//it's possible that the user cancelled the operation
            }
            catch (err) {
                showErrorMessage("Failed to add selected files to project.", err);//TBD: localize
                return;
            }

            try {
                await SaveProject(true);
            }
            catch (err) {
                showErrorMessage("Failed to save project:", err); //TBD: localize
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.removeFileFromProject', async (selected) => {
            if (getWarnIsSearching())
                return;

            try {
                await excludeFromProject(selected);
            }
            catch (err) {
                showErrorMessage("Failed to remove selected file.", err); //TBD: localize
                return;
            }

            try {
                await SaveProject(true);
            }
            catch (err) {
                showErrorMessage("Failed to save project:", err); //TBD: localize
            }
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
            if (getWarnIsSearching())
                return;

            findInProject().catch(err => {
                showErrorMessage("Failed to find in project.", err); //TBD: localize
                clearSearchResultWithError("Failed to find in project. " + (err ? err.toString() : ''));//TBD: localize
            });
        }));

        //register the handler of "replace in project"
        context.subscriptions.push(vscode.commands.registerCommand('autolisp.replaceInProject', async () => {
            if (getWarnIsSearching())
                return;

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
            if (getWarnIsSearching())
                return;

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

const showErrOpt = { modal: true };

function showErrorMessage(description: string, detail: string) {
    if (!detail) {
        vscode.window.showErrorMessage(description, showErrOpt);
    } else {
        vscode.window.showErrorMessage(description + "\r\n" + detail, showErrOpt);
    }
}

export function unregisterProjectManager() {
    try {
        SearchTreeProvider.instance.updateTitle(false);
        ProjectTreeProvider.instance().updateTitle(false);
    }
    catch (err) {
        if (err)
            console.log(err);
    }
}