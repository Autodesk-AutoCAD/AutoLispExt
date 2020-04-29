import { FindInProject } from './findInProject';
import { FileNode } from './searchTree';

import * as fs from 'fs-extra';
import * as vscode from 'vscode'
import * as crypto from 'crypto';
import * as path from 'path'
import { getFullDocRange } from '../../utils';

var os = require('os');

export async function applyReplacement(projectPlan: FindInProject) {
    try {
        if (projectPlan.resultByFile.length == 0)
            return Promise.resolve();

        for (let fileNode of projectPlan.resultByFile) {
            await applyReplacementInFile(fileNode);
        }
    }
    catch (err) {
        Promise.reject(err);
    }
}

async function applyReplacementInFile(filePlan: FileNode) {
    try {
        if (fs.existsSync(filePlan.filePath) == false) {
            filePlan.errorInReplace = "File doesn't exist"; //TBD: localize
            return;
        }

        let data = fs.readFileSync(filePlan.filePath).toString();

        let newFileContent = '';
        for (let lineNum = 0; lineNum >= 0; lineNum++) {
            let newlinePos = data.indexOf('\n');
            if (newlinePos < 0) {
                //this is the last line
                newFileContent += chooseLineContent(lineNum, data, filePlan);
                break;
            }
            else {
                //this is not the last line
                //check if the line ends with '\r\n' or '\n'
                let isCrLf = false;
                if ((newlinePos > 0) && (data.charAt(newlinePos - 1) == '\r')) {
                    isCrLf = true;
                }

                if (isCrLf) {
                    newFileContent += chooseLineContent(lineNum, data.substr(0, newlinePos - 1), filePlan);
                }
                else {
                    newFileContent += chooseLineContent(lineNum, data.substr(0, newlinePos), filePlan);
                }

                newFileContent += '\r\n';

                data = data.substr(newlinePos + 1);
            }
        }

        let done = await applyChangeInEditor(filePlan.filePath, newFileContent);
        if (done)
            return;

        filePlan.errorInReplace = applyChangeByFile(filePlan.filePath, newFileContent);
    }
    catch (err) {
        filePlan.errorInReplace = err;
    }
}

//If this file is shown in VS Code editor, change its content in editor and return true;
//otherwise returns false, and leave the file content unchanged
//throws an error if the editor failed to replace text
async function applyChangeInEditor(filePath: string, fileContent: string) {
    let editors = vscode.window.visibleTextEditors;
    if ((!editors) || (editors.length == 0))
        return Promise.resolve(false);

    let targetFilePath = filePath.toLowerCase().split('/').join("\\")

    for (let editor of editors) {
        let editorFilePath = editor.document.fileName.toLowerCase().split('/').join("\\")

        if (editorFilePath != targetFilePath)
            continue;

        //ok, there's an editor shown for the same file

        let docRange = getFullDocRange(editor);

        let edit = new vscode.WorkspaceEdit();
        edit.replace(editor.document.uri, docRange, fileContent);

        let succ = await vscode.workspace.applyEdit(edit);
        if (!succ)
            throw new Error("failed to replace text: " + filePath);

        return Promise.resolve(true);
    }

    return Promise.resolve(false);
}

//return the error message;
//return null on success
function applyChangeByFile(filePath: string, fileContent: string): string {
    try {
        let tmpFile = getTmpFilePath();

        while (fs.existsSync(tmpFile)) {
            //in case the file path is occupied
            tmpFile = getTmpFilePath();
        }

        fs.writeFileSync(tmpFile, fileContent);
        fs.copyFileSync(tmpFile, filePath);
        fs.removeSync(tmpFile);

        return null;
    }
    catch (err) {
        console.log(err);
        return err;
    }
}

function chooseLineContent(line: number, oldLineText: string, replNode: FileNode) {
    for (let finding of replNode.findings) {
        let rgLine = finding.line - 1;//rg.exe line and column start with 1
        if (line != rgLine)
            continue;

        //it's in the replace plan; return the new text which is the result of replacing in old text
        return finding.text;
    }

    //it's not in the replace plan; continue using the old text
    return oldLineText;
}

function getTmpFilePath() {
    return path.join(os.tmpdir(), `archive.${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.tmp`);
}
