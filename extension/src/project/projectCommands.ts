import * as vscode from 'vscode'
import { OpenProject } from './openProject';
import { ProjectTreeProvider } from './projectTree';
import { openLspFile } from './openLspFile';
import { IconUris } from './icons';
import { AddFile2Project } from './addFile2Project';
import { SaveProject, SaveAll } from './saveProject';
import { excludeFromProject } from './excludeFile';
import { getNewProjectFilePath, createProject } from './createProject';
import { findInProject } from './findReplace/findInProject';
import { SearchTreeProvider, SummaryNode } from './findReplace/searchTree';
import { openSearchResult } from './findReplace/openSearchResult';
import { replaceInProject } from './findReplace/replaceInProject';
import { CheckUnsavedChanges } from './checkUnsavedChanges';
import { clearSearchResults, clearSearchResultWithError, stopSearching, getWarnIsSearching } from './findReplace/clearResults';
import { RefreshProject } from './refreshProject';

import * as nls from 'vscode-nls';
import { grantExePermission } from './findReplace/ripGrep';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export function registerProjectCommands(context: vscode.ExtensionContext) {
    try {

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
                let msg = localize("autolispext.project.commands.createprojectfailed", "Failed to create the new project.");
                showErrorMessage(msg, err);
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
                    let msg = localize("autolispext.project.commands.openprojectfailed", "Failed to open the specified project.");
                    showErrorMessage(msg, err);
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
                let msg = localize("autolispext.project.commands.addfilefailed", "Failed to add selected files to project.");
                showErrorMessage(msg, err);
                return;
            }

            try {
                await SaveProject(true);
            }
            catch (err) {
                let msg = localize("autolispext.project.commands.saveprojectfailed", "Failed to save the project.");
                showErrorMessage(msg, err);
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.removeFileFromProject', async (selected) => {
            if (getWarnIsSearching())
                return;

            try {
                await excludeFromProject(selected);
            }
            catch (err) {
                let msg = localize("autolispext.project.commands.removefilefailed", "Failed to remove selected file.");
                showErrorMessage(msg, err);
                return;
            }

            try {
                await SaveProject(true);
            }
            catch (err) {
                let msg = localize("autolispext.project.commands.saveprojectfailed", "Failed to save the project.");
                showErrorMessage(msg, err);
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.SaveProject', async () => {
            if (getWarnIsSearching())
                return;

            SaveProject(true)
                .then(prjPath => {
                    let msg = localize("autolispext.project.commands.projectsaved", "Project file saved.");
                    vscode.window.showInformationMessage(msg);
                })
                .catch(err => {
                    let msg = localize("autolispext.project.commands.saveprojectfailed", "Failed to save the project.");
                    showErrorMessage(msg, err);
                });
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.SaveAll', async () => {
            if (getWarnIsSearching())
                return;

            SaveAll()
                .then(() => {
                    let msg = localize("autolispext.project.commands.allsaved", "All files saved.");
                    vscode.window.showInformationMessage(msg);
                })
                .catch(err => {
                    let msg = localize("autolispext.project.commands.saveallfailed", "Failed to save all the files in the project.");
                    showErrorMessage(msg, err);
                });
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.refresh', async () => {
            try {
                RefreshProject();
            } catch (err) {
                let msg = localize("autolispext.project.commands.refreshfailed", "Failed to refresh the project.");
                showErrorMessage(msg, err);
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand(ProjectTreeProvider.TreeItemClicked, (treeItem) => {
            openLspFile(treeItem)
                .catch(err => {
                    let msg = localize("autolispext.project.commands.openfilefailed", "Failed to open the file.");
                    showErrorMessage(msg, err);
                })
        }));

        //register the handler of "find in project"
        context.subscriptions.push(vscode.commands.registerCommand('autolisp.findInProject', async () => {
            if (getWarnIsSearching())
                return;

            findInProject().catch(err => {
                let msg = localize("autolispext.project.commands.findfailed", "Failed to find in project.");
                showErrorMessage(msg, err);
                clearSearchResultWithError(msg + (err ? err.toString() : ''));
            });
        }));

        //register the handler of "replace in project"
        context.subscriptions.push(vscode.commands.registerCommand('autolisp.replaceInProject', async () => {
            if (getWarnIsSearching())
                return;

            replaceInProject().catch(err => {
                let msg = localize("autolispext.project.commands.replacefailed", "Failed to replace text string in project.");
                showErrorMessage(msg, err);
                clearSearchResultWithError(msg + (err ? err.toString() : ''));
            })
        }));

        context.subscriptions.push(vscode.commands.registerCommand(SearchTreeProvider.showResult, (treeItem) => {
            openSearchResult(treeItem, SearchTreeProvider.instance.lastSearchOption)
                .catch(err => {
                    let msg = localize("autolispext.project.commands.openresultfailed", "Failed to open search results.");
                    showErrorMessage(msg, err);
                })
        }));

        context.subscriptions.push(vscode.commands.registerCommand('autolisp.clearSearchResults', (treeItem) => {
            if (getWarnIsSearching())
                return;

            try {
                clearSearchResults();
            }
            catch (err) {
                let msg = localize("autolispext.project.commands.clearresultfailed", "Failed to clear search results.");
                showErrorMessage(msg, err);
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

        grantExePermission();
    }
    catch (e) {
        let msg = localize("autolispext.project.commands.initializefailed", "Failed to initalize the AutoLISP Project Manager.");
        vscode.window.showErrorMessage(msg);
        console.log(e);
    }
}

const showErrOpt = { modal: true };

export function showErrorMessage(description: string, detail: string) {
    if (!detail) {
        vscode.window.showErrorMessage(description, showErrOpt);
    } else {
        vscode.window.showErrorMessage(description + "\r\n" + detail, showErrOpt);
    }
}
