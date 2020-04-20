
import * as vscode from 'vscode'
import * as fs from 'fs-extra';
import * as path from 'path'

import { ProjectNode, LspFileNode } from './projectTree';
import { ProjectDefinition } from './projectDefinition';

export async function getNewProjectFilePath() {
    const options: vscode.SaveDialogOptions = {
        //TBD: globalize
        saveLabel: 'Create',
        filters: {
            'Autolisp project files': ['prj']
        }
    };

    let fileUri = await vscode.window.showSaveDialog(options);
    if (fileUri)
        return Promise.resolve(fileUri);

    return Promise.resolve(undefined);
}

export async function createProject(prjFilePath: string) {
    let prjPathUpper = prjFilePath.toUpperCase();
    if (prjPathUpper.endsWith(".PRJ") == false)
        return Promise.reject("Only .prj file is allowed.")//TBD: localize

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