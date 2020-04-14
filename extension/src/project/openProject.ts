import * as vscode from 'vscode'
import { ProjectNode, LspFileNode } from './projectTree'
import { CursorPosition, ListReader } from '../format/listreader';
import { Sexpression } from '../format/sexpression';
import * as path from 'path'

const fs = require('fs');

export async function OpenProject() {

    try {
        let prjUri = await SelectProjectFile();
        if (!prjUri)
            return;

        let document = await vscode.workspace.openTextDocument(prjUri);
        if (!document)
            return;

        let ret = ParseProjectDocument(prjUri.fsPath, document);
        if (ret)
            return Promise.resolve(ret);
    }
    catch (e) {
        Promise.reject(e);
    }
}

async function SelectProjectFile() {
    const options: vscode.OpenDialogOptions = {
        //TBD: globalize
        canSelectMany: false,
        openLabel: 'Open Autolisp Project',
        filters: {
            'Autolisp project files': ['prj'], 
            'All files': ['*']
        }
    };

    let fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri.length > 0)
        return Promise.resolve(fileUri[0]);

    return Promise.reject();
}


function ParseProjectDocument(prjPath: string, document: vscode.TextDocument): ProjectNode {

    let readerStartPos = new CursorPosition();
    readerStartPos.offsetInSelection = 0; //the start position in sexpr is 0
    readerStartPos.offsetInDocument = 0; //the start position in doc
    let reader = new ListReader(document.getText(), readerStartPos, document);

    let lispLists = reader.tokenize();
    if ((!lispLists) || (!lispLists.atoms) || (lispLists.atomsCount() < 2))
        return undefined;

    let atomsCount = lispLists.atomsCount();
    for (let i = 0; i < atomsCount; i++) {
        //find for the VLISP-PROJECT-LIST expression
        if (lispLists.atoms[i] == null) continue;
        if (!(lispLists.atoms[i] instanceof Sexpression)) continue;

        let vlspPrjList = lispLists.atoms[i] as Sexpression;

        if (vlspPrjList.atomsCount() < 1)
            continue;

        if (vlspPrjList.atoms[1].symbol != "VLISP-PROJECT-LIST") {
            continue;
        }

        //now it's a project expression

        if(IsValidProjectExpression(vlspPrjList) == false)
            return undefined; //it's content is not valid

        let prjName: string = vlspPrjList.atoms[3].symbol;
        let fileList = vlspPrjList.atoms[5] as Sexpression;

        let root = new ProjectNode();
        root.projectName = prjName;
        root.projectFilePath = prjPath;
        root.projectDirectory = path.dirname(prjPath);
        root.sourceFiles = new Array<LspFileNode>();

        if (vlspPrjList.atoms[5] instanceof Sexpression)
        {
            //create source file nodes
            for (let j = 1; j < (fileList.atoms.length - 1); j++) {
                let fileName = Convert2AbsoluteLspFilePath(fileList.atoms[j].symbol, root.projectDirectory);
                if(!fileName)
                    return undefined;

                let fileNode = new LspFileNode();
                fileNode.filePath = fileName;
                fileNode.fileExists = fs.existsSync(fileName);
                root.sourceFiles.push(fileNode);
            }
        }

        return root;
    } //end of the for loop of project file elements

    return undefined;
}

function Convert2AbsoluteLspFilePath(fileName:string, prjDir:string): string {
    //remove the starting and ending "
    if (fileName.startsWith('\"') == false)
        return undefined;

    if (fileName.endsWith('\"') == false)
        return undefined;

    fileName = fileName.substr(1, fileName.length - 2);

    //make sure it's absolute path
    if (path.isAbsolute(fileName) == false)
        fileName = path.join(prjDir, fileName);

    //add the file extension back if necessary
    if (!path.extname(fileName)) {
        //it's possible that a lisp project file ignores the .lsp extension
        //it's also possible that the source file has no extension
        if (fs.existsSync(fileName) == false)
            fileName = fileName + ".lsp";
    }

    return fileName;
}

function IsValidProjectExpression(expr: Sexpression): Boolean {
    //it should have at least 6 children
    if ((!expr.atoms) || (expr.atomsCount() < 6))
        return false;

    //the 3rd and 4th ones should be for project name
    if (expr.atoms[2].symbol.toUpperCase() != ":NAME") {
        console.error(":NAME not found");
        return false;
    }

    //the 5th and 6th ones should be for for source files
    if (expr.atoms[4].symbol.toUpperCase() != ":OWN-LIST") {
        console.error(":OWN-LIST not found");
        return false;
    }

    return true;
}
