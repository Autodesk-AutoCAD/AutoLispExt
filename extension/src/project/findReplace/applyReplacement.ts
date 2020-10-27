import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { FileNode } from './searchTree';
import { getDocument } from '../../utils';
import { AutoLispExt } from '../../extension';

export async function applyReplacementInFile(filePlan: FileNode) {
    try {
        if (fs.existsSync(filePlan.filePath) == false) {
            filePlan.errorInReplace = AutoLispExt.localize("autolispext.project.findreplace.applyreplacement.filenotexist", "File doesn't exist.");
            return;
        }

        let doc = getDocument(filePlan.filePath);

        let data = null;
        if (doc != null)
            data = doc.getText();//it's possible that the editor has latest changes that are not saved
        else
            data = fs.readFileSync(filePlan.filePath).toString();

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
        filePlan.errorInReplace = err.toString();
    }
}

//If this file is shown in VS Code editor, change its content in editor and return true;
//otherwise returns false, and leave the file content unchanged
//throws an error if the editor failed to replace text
async function applyChangeInEditor(filePath: string, fileContent: string) {

    let doc = getDocument(filePath);
    if (doc != null) {
        //ok, there's an editor shown for the same file

        let docRange = doc.validateRange(
            new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(Number.MAX_VALUE, Number.MAX_VALUE)
            ));

        let edit = new vscode.WorkspaceEdit();
        edit.replace(doc.uri, docRange, fileContent);

        let succ = await vscode.workspace.applyEdit(edit);
        if (!succ) {
            let msg = AutoLispExt.localize("autolispext.project.findreplace.applyreplacement.replacetextfailed", "Failed to replace text: ");
            throw new Error(msg + filePath);
        }

        return Promise.resolve(true);
    }

    return Promise.resolve(false);
}

//return the error message;
//return null on success
function applyChangeByFile(filePath: string, fileContent: string): string {
    try {
        fs.writeFileSync(filePath, fileContent);
        return null;
    }
    catch (err) {
        console.log(err);
        return err.toString();
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
