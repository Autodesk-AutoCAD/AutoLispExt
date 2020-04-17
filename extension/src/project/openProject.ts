import { ProjectNode, LspFileNode, addLispFileNode2ProjectTree } from './projectTree'
import { CursorPosition, ListReader } from '../format/listreader';
import { Sexpression } from '../format/sexpression';
import { ProjectDefinition } from './projectDefinition';

import * as vscode from 'vscode'
import * as path from 'path'

const fs = require('fs');

export async function OpenProject() {

    try {
        let prjUri = await SelectProjectFile();
        if (!prjUri)
            return;

        return OpenProjectFile(prjUri);
    }
    catch (e) {
        return Promise.reject(e);
    }
}

export async function OpenProjectFile(prjUri: vscode.Uri) {
    let document = await vscode.workspace.openTextDocument(prjUri);
    if (!document)
        return Promise.reject("can't read project file: " + prjUri.fsPath); //TBD: localization

    let ret = ParseProjectDocument(prjUri.fsPath, document);
    if (ret)
        return Promise.resolve(ret);

    return Promise.reject("malformed project file: " + prjUri.fsPath); //TBD: localization
}

async function SelectProjectFile() {
    const options: vscode.OpenDialogOptions = {
        //TBD: globalize
        canSelectMany: false,
        openLabel: 'Open Project',
        filters: {
            'Autolisp project files': ['prj'],
            'All files': ['*']
        }
    };

    let fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri.length > 0)
        return Promise.resolve(fileUri[0]);

    //return Promise.resolve(undefined) by default, and it means the operation is cancelled
}


function ParseProjectDocument(prjPath: string, document: vscode.TextDocument): ProjectNode {

    let readerStartPos = new CursorPosition();
    readerStartPos.offsetInSelection = 0; //the start position in sexpr is 0
    readerStartPos.offsetInDocument = 0; //the start position in doc
    let reader = new ListReader(document.getText(), readerStartPos, document);

    let lispLists = reader.tokenize();
    let atomCount = lispLists.atoms.length;
    if ((!lispLists) || (!lispLists.atoms) || (atomCount < 2))
        return undefined;

    //get the VLISP-PROJECT-LIST expression
    let index = IndexOfProjectList(lispLists);
    if (index < 0)
        return undefined;
    let vlspPrjList = lispLists.atoms[index] as Sexpression;

    //parse project metadata
    let prjMetaData = ProjectDefinition.Create(vlspPrjList);
    if (IsValidProjectExpression(prjMetaData) == false)
        return undefined; //its content is not valid

    //get the value of :own-list pair, i.e. the source file list
    index = IndexOfSourceList(vlspPrjList);
    if (index < 0)//if there's no source file, we should at least get a "nil" string
        return undefined;
    let srcFileExpr = vlspPrjList.atoms[index];

    //create the project node
    let root = new ProjectNode();
    root.projectName = prjMetaData.Name;
    root.projectFilePath = prjPath;
    root.projectDirectory = path.dirname(prjPath);
    root.sourceFiles = new Array<LspFileNode>();
    root.projectMetadata = prjMetaData;

    if (srcFileExpr instanceof Sexpression) {
        let fileList = srcFileExpr as Sexpression;

        //create source file nodes
        for (let j = 1; j < (fileList.atoms.length - 1); j++) {
            let fileName = Convert2AbsoluteLspFilePath(fileList.atoms[j].symbol, root.projectDirectory);
            if (!fileName)
                return undefined;

            addLispFileNode2ProjectTree(root, fileName, fileList.atoms[j].symbol);
        }
    }

    return root;
}

function IndexOfSourceList(prjExpr: Sexpression): number {
    let atomsCount = prjExpr.atoms.length;
    for (let i = 0; i < atomsCount; i++) {
        if (prjExpr.atoms[i].symbol.toUpperCase() != ProjectDefinition.key_own_list)
            continue;

        //now i is the index of the key of src file pair 
        if (i >= atomsCount - 1)
            return -1;

        //i+1 is the index of value
        return i + 1;
    }

    return -1;
}

function IndexOfProjectList(rootExpr: Sexpression): number {
    let atomsCount = rootExpr.atoms.length;

    for (let i = 0; i < atomsCount; i++) {
        //find for the VLISP-PROJECT-LIST expression
        if (rootExpr.atoms[i] == null) continue;
        if (!(rootExpr.atoms[i] instanceof Sexpression)) continue;

        let vlspPrjList = rootExpr.atoms[i] as Sexpression;

        if (vlspPrjList.atoms.length < 2)
            continue;

        if (vlspPrjList.atoms[1].symbol.toUpperCase() != ProjectDefinition.key_expr_name) {
            continue;
        }

        return i;
    }

    return -1;
}

function Convert2AbsoluteLspFilePath(fileName: string, prjDir: string): string {
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

function IsValidProjectExpression(metaData: ProjectDefinition): Boolean {
    if (!metaData)
        return false;

    if (metaData.hasProperty(ProjectDefinition.key_name) == false)
        return false;

    if (metaData.hasProperty(ProjectDefinition.key_own_list) == false)
        return false;

    return true;
}
