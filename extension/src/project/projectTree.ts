import { IconUris } from './icons';
import { ProjectDefinition } from './projectDefinition';

import * as vscode from 'vscode'
import * as path from 'path'

const fs = require('fs');

export interface DisplayNode {
    getDisplayText: () => string;
    getTooltip: () => string;
    getIconUri: () => vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
    getNodeType: () => string;
    isCollapsible: () => Boolean;
}

export class ProjectNode implements DisplayNode {
    sourceFiles: Array<LspFileNode>;

    projectFilePath: string;
    projectDirectory: string;

    projectName: string;

    projectModified: Boolean = false;

    projectMetadata: ProjectDefinition = null;

    getDisplayText(): string {
        return this.projectName;
    }

    getTooltip(): string {
        return this.projectFilePath;
    }

    getNodeType(): string {
        return "project"
    }

    isCollapsible(): Boolean {
        return true;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } {
        return null;//currently we don't provide icon for project node
    }
}

export class LspFileNode implements DisplayNode {
    filePath: string;
    fileExists: boolean;

    rawFilePath: string;//the raw path string read from .prj file; for new added file, it should be null

    getDisplayText(): string {
        return path.basename(this.filePath);
    }

    getTooltip(): string {
        this.fileExists = fs.existsSync(this.filePath);
        if (this.fileExists)
            return this.filePath;
        else
            return "File doesn't exist: " + this.filePath; //TBD: localize
    }

    getNodeType(): string {
        return "lspFile"
    }

    isCollapsible(): Boolean {
        return false;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } {
        this.fileExists = fs.existsSync(this.filePath);
        if (this.fileExists)
            return IconUris.lspFile();
        else
            return IconUris.missingFile();
    }
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<DisplayNode>{
    private rootNode: ProjectNode = null;

    private constructor() {
    }

    private static currentInstance: ProjectTreeProvider = null;
    static instance(): ProjectTreeProvider {
        if (ProjectTreeProvider.currentInstance == null) {
            let inst = new ProjectTreeProvider();
            ProjectTreeProvider.currentInstance = inst
            vscode.window.registerTreeDataProvider('Autolisp-ProjectView', inst);
        }

        return ProjectTreeProvider.currentInstance;
    }

    public updateData(newRootNode: ProjectNode) {
        this.rootNode = newRootNode;

        this.onChanged.fire();
    }

    public refreshData(data?: DisplayNode) {
        this.onChanged.fire(data);
    }

    public get projectNode(): ProjectNode {
        if (!ProjectTreeProvider.currentInstance)
            return null;

        return ProjectTreeProvider.currentInstance.rootNode;
    }


    public static hasProjectOpened(): Boolean {
        if (!ProjectTreeProvider.currentInstance.projectNode)
            return false;

        return true;
    }

    //return false if file already belongs to given project;
    //return true in all other cases
    public addFileNode(filePath: string): Boolean {
        if (!this.rootNode)
            return;

        let ret = addLispFileNode2ProjectTree(this.rootNode, filePath, null);
        if (ret) {
            this.rootNode.projectModified = true;
        }

        return ret;
    }

    private onChanged: vscode.EventEmitter<DisplayNode> = new vscode.EventEmitter<DisplayNode>();
    public readonly onDidChangeTreeData?: vscode.Event<DisplayNode> = this.onChanged.event;

    public static TreeItemClicked = 'LispProjectNodeClicked';
    public getTreeItem(element: DisplayNode): vscode.TreeItem | Thenable<import("vscode").TreeItem> {
        let treeNode = new vscode.TreeItem(element.getDisplayText());
        treeNode.collapsibleState = element.isCollapsible() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        treeNode.tooltip = element.getTooltip();
        treeNode.iconPath = element.getIconUri();
        treeNode.contextValue = element.getNodeType();

        treeNode.command = {
            title: treeNode.label,
            command: ProjectTreeProvider.TreeItemClicked,
            tooltip: treeNode.tooltip,
            arguments: [
                element
            ]
        }
        return treeNode;
    }

    public getChildren(element?: DisplayNode): vscode.ProviderResult<DisplayNode[]> {
        if (!this.rootNode)
            return null;

        if (!element) {
            //it's asking for the root node
            let ret: DisplayNode[] = [this.rootNode];
            return ret;
        }

        if (element == this.rootNode) {
            return this.rootNode.sourceFiles;
        }

        return null;
    }

}

//root: node of the owner project
//fileName: the absolute file path of the lsp file to add
//rawFilePath: the raw string of file path read from .prj file; for new added file, it should be null

//return false if the file is already in project;
//return true in all other cases
export function addLispFileNode2ProjectTree(root: ProjectNode, fileName: string, rawFilePath: string): Boolean {
    let file2Add = path.normalize(fileName).toUpperCase();

    for (let fileNode of root.sourceFiles) {
        let addedFile = path.normalize(fileNode.filePath).toUpperCase();

        if (file2Add == addedFile)
            return false;
    }

    let fileNode = new LspFileNode();
    fileNode.filePath = fileName;
    fileNode.fileExists = fs.existsSync(fileName);
    fileNode.rawFilePath = rawFilePath;
    root.sourceFiles.push(fileNode);

    return true;
}
