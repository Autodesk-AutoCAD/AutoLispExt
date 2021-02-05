
import * as vscode from 'vscode'
import * as fs from 'fs-extra';
import * as path from 'path'
import { AutoLispExt } from '../extension';
import { ProjectNode, LspFileNode } from './projectTree';
import { ProjectDefinition } from './projectDefinition';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export async function getNewProjectFilePath() {
    let label = localize("autolispext.project.createproject.createlabel", "Create");
    const filterDesc = localize("autolispext.project.createproject.projectfilter", "AutoLISP Project Files");
    const options: vscode.SaveDialogOptions = {
        saveLabel: label,
        filters: {}
    };
    options.filters[filterDesc] = ['prj'];

    let fileUri = await vscode.window.showSaveDialog(options);    
    if (fileUri) {
        if (path.basename(fileUri.fsPath).indexOf(' ') === -1) {
            return Promise.resolve(fileUri);
        } else {
            let msg = AutoLispExt.localize("autolispext.project.createproject.nospaces", "Legacy PRJ naming rules do not allow spaces");
            return Promise.reject(msg);
        }
    } else {
        return Promise.resolve(undefined);
    }
}

export async function createProject(prjFilePath: string) {
    let prjPathUpper = prjFilePath.toUpperCase();
    if (prjPathUpper.endsWith(".PRJ") == false) {
        let msg = localize("autolispext.project.createproject.onlyprjallowed", "Only PRJ files are allowed.");
        return Promise.reject(msg)
    }

    if (fs.existsSync(prjFilePath))
        fs.removeSync(prjFilePath);

    let fileName = path.basename(prjFilePath);
    fileName = fileName.substring(0, fileName.length - 4);

    //create the project node
    let root = new ProjectNode();
    root.projectName = fileName;
    root.projectFilePath = prjFilePath;
    root.projectDirectory = path.dirname(prjFilePath);
    root.sourceFiles = new Array<LspFileNode>();
    root.projectMetadata = ProjectDefinition.CreateEmpty(fileName);

    return Promise.resolve(root);
}