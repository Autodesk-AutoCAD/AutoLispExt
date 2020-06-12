import { ProjectNode, ProjectTreeProvider } from './projectTree';
import { ProjectDefinition } from './projectDefinition';
import { LispFormatter } from '../format/formatter';

import * as path from 'path'
import * as fs from 'fs-extra';
import { pathEqual } from '../utils';
import { ReadonlyDocument } from './readOnlyDocument';
import * as nls from 'vscode-nls';

import {longListFormatAsSingleColum, resetLongListFormatAsSingleColum} from '../format/sexpression'

const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
import * as vscode from 'vscode';

export async function SaveProject(refresh: boolean) {
    try {
        if (ProjectTreeProvider.hasProjectOpened() == false) {
            let msg = localize("autolispext.project.saveproject.noprojecttosave", "No project to save.");
            return Promise.reject(msg);
        }

        let root = ProjectTreeProvider.instance().projectNode;

        //work out the correct project file text
        let prjFileText = generateProjectText(root);
        if (!prjFileText) {
            let msg = localize("autolispext.project.saveproject.generateprjcontentfailed", "Failed to generate project content.");
            return Promise.reject(msg);
        }

        //format the text before writing to file
        let doc = ReadonlyDocument.createProject(prjFileText);
        longListFormatAsSingleColum();
        let formatedText = LispFormatter.format(doc, null);
        resetLongListFormatAsSingleColum();

        //write to file
        let targetPath = root.projectFilePath;
        fs.writeFileSync(targetPath, formatedText);
        root.projectModified = false;

        if (refresh)
            ProjectTreeProvider.instance().refreshData();
        return Promise.resolve(targetPath);
    }
    catch (e) {
        if (refresh)
            ProjectTreeProvider.instance().refreshData();

        resetLongListFormatAsSingleColum();
        return Promise.reject(e);
    }
}

//Save a project and all of its unsaved LSP files that are opened in VS Code
//As we save changes of project automatcially, project is not "dirty" in most cases
//So it mainly helps user to save unsaved files of current project
export async function SaveAll() {
    const root = ProjectTreeProvider.instance().projectNode;
    if (!root) {
        let msg = localize("autolispext.project.saveproject.noprojecttosave", "No project to save.");
        return Promise.reject(msg);
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

    for (let file of unsavedFiles) {
        file.save();
    }

    if (root.projectModified) {
        await SaveProject(true);
    }

    return Promise.resolve();
}

//return the raw text of project file, using the latest source file list to replace the original one;
//return null on error
function generateProjectText(root: ProjectNode): string {
    let fileList = makeSourceFileList(root);

    let prjFileText = makeProjectFileHeader(root);
    prjFileText += makeProjectExpression(fileList, root.projectMetadata);
    prjFileText += ';;; EOF';

    return prjFileText;
}

function makeProjectFileHeader(root: ProjectNode): string {
    let today = new Date();
    let ret = ';;; VLisp project file [V2.0] ' + root.projectName;
    ret += ' saved to:[' + root.projectDirectory + ']';
    ret += ' at:[' + today.toLocaleDateString() + ']';
    ret += '\r\n';

    return ret;
}

function makeProjectExpression(srcFileList: string, prjDef: ProjectDefinition): string {
    let ret = '(' + ProjectDefinition.key_expr_name + '\r\n';

    ret += makeKeyValuePair(prjDef, ProjectDefinition.key_name);

    ret += ProjectDefinition.key_own_list + '\r\n';
    ret += srcFileList + '\r\n';

    ret += makeKeyValuePair(prjDef, ProjectDefinition.key_fas_dir);
    ret += makeKeyValuePair(prjDef, ProjectDefinition.key_tmp_dir);
    ret += makeKeyValuePair(prjDef, ProjectDefinition.key_proj_keys);
    ret += makeKeyValuePair(prjDef, ProjectDefinition.key_cxt_id);

    //in case there're some more properties other than the standard properties
    for (let key in prjDef.metaData) {
        if (ProjectDefinition.isStandardProperty(key))
            continue;

        ret += makeKeyValuePair(prjDef, key);
    }

    ret += ')\r\n';

    return ret;
}

function makeKeyValuePair(metaData: ProjectDefinition, key: string): string {
    return key + '\r\n' + metaData.getProperty(key) + '\r\n';
}

export function makeSourceFileList(root: ProjectNode): string {
    let fileList = '';

    if (root.sourceFiles.length == 0) {
        fileList = ' nil ';
    }
    else {
        fileList = ' (';

        for (let file of root.sourceFiles) {
            if (file.rawFilePath) {
                fileList += file.rawFilePath; //use the original text read on opening
                fileList += " ";
                continue;
            }

            let fileDir = path.dirname(file.filePath);
            if (pathEqual(root.projectDirectory, fileDir, true) == false) {
                //in this case, we use absolute path, and file extension will be ignored
                let str2Add = path.normalize(file.filePath).split('\\').join('/');// "/" is used in file path in .prj file
                str2Add = str2Add.substring(0, str2Add.length - 4);//to remove the extension
                fileList += ('\"' + str2Add + '\" ');
                continue;
            }

            //in this case, the directory and file extension will be ignored
            let str2Add = path.basename(file.filePath);
            str2Add = str2Add.substring(0, str2Add.length - 4);//to remove the extension
            fileList += ('\"' + str2Add + '\" ');
            continue;
        }

        fileList = fileList.trimRight() + ') ';
    }

    return fileList;
}
