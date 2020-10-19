import { IconUris } from './icons';
import { ProjectDefinition } from './projectDefinition';
import { ReadonlyDocument } from './readOnlyDocument';
import * as vscode from 'vscode';
import * as path from 'path';
import { pathEqual } from '../utils';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();
const fs = require('fs');

export interface DisplayNode {
    getDisplayText: () => string;
    getTooltip: () => string;
    getIconUri: () => vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
    getNodeType: () => string;
    getCollapsibleState: () => vscode.TreeItemCollapsibleState;
    setCollapsibleState(state: vscode.TreeItemCollapsibleState): void;
}

export class ProjectNode implements DisplayNode {
    sourceFiles: Array<LspFileNode>;

    projectFilePath: string;
    projectDirectory: string;

    projectName: string;

    projectModified: Boolean = false;

    projectMetadata: ProjectDefinition = null;
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

    getDisplayText(): string {
        if (this.projectModified) {
            let unsaved = localize("autolispext.project.tree.unsaved", " (UNSAVED)");
            return this.projectName + unsaved;
        } else {
            return this.projectName;
        }
    }

    getTooltip(): string {
        return this.projectFilePath;
    }

    getNodeType(): string {
        return "project"
    }

    getCollapsibleState(): vscode.TreeItemCollapsibleState {
        return this.collapsibleState;
    }

    setCollapsibleState(state: vscode.TreeItemCollapsibleState) {
        this.collapsibleState = state;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } {
        return null;//currently we don't provide icon for project node
    }
}

export class LspFileNode implements DisplayNode {
    filePath: string;
    fileExists: boolean;
    document: ReadonlyDocument;
    rawFilePath: string;//the raw path string read from .prj file; for new added file, it should be null

    getDisplayText(): string {
        return path.basename(this.filePath);
    }

    getTooltip(): string {
        this.fileExists = fs.existsSync(this.filePath);
        if (this.fileExists) {
            return this.filePath;
        } else {
            let msg = localize("autolispext.project.tree.filenotexist", "File doesn't exist: ");
            return msg + this.filePath;
        }
    }

    getNodeType(): string {
        return "lspFile"
    }

    getCollapsibleState(): vscode.TreeItemCollapsibleState {
        return vscode.TreeItemCollapsibleState.None;
    }

    setCollapsibleState() {
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
    private treeControl: vscode.TreeView<DisplayNode> = null;

    private constructor() {
        ProjectTreeProvider.currentInstance = this;

        this.treeControl = vscode.window.createTreeView('Autolisp-ProjectView', { treeDataProvider: this });
        this.treeControl.onDidCollapseElement(e => {
            e.element.setCollapsibleState(vscode.TreeItemCollapsibleState.Collapsed);
        })
        this.treeControl.onDidExpandElement(e => {
            e.element.setCollapsibleState(vscode.TreeItemCollapsibleState.Expanded);
        })
    }

    private static currentInstance: ProjectTreeProvider = new ProjectTreeProvider();
    static instance(): ProjectTreeProvider {
        return ProjectTreeProvider.currentInstance;
    }

    public updateData(newRootNode: ProjectNode) {
        this.rootNode = newRootNode;
        vscode.commands.executeCommand("setContext", "autolisp.hasProject", ProjectTreeProvider.hasProjectOpened());
        this.onChanged.fire();
    }

    public refreshData(data?: DisplayNode) {
        this.onChanged.fire(data);
    }

    public get projectNode(): ProjectNode {
        return this.rootNode;
    }

    public static hasProjectOpened(): Boolean {
        if (!ProjectTreeProvider.currentInstance)
            return false;

        if (!ProjectTreeProvider.currentInstance.projectNode)
            return false;

        return true;
    }

    public addFileNode(filePath: string) {
        if (!this.rootNode)
            return;

        addLispFileNode2ProjectTree(this.rootNode, filePath, null);
        this.rootNode.projectModified = true;
    }

    private onChanged: vscode.EventEmitter<DisplayNode> = new vscode.EventEmitter<DisplayNode>();
    public readonly onDidChangeTreeData?: vscode.Event<DisplayNode> = this.onChanged.event;

    public static TreeItemClicked = 'LispProjectNodeClicked';
    public getTreeItem(element: DisplayNode): vscode.TreeItem | Thenable<import("vscode").TreeItem> {
        try {
            let treeNode = new vscode.TreeItem(element.getDisplayText());
            treeNode.collapsibleState = element.getCollapsibleState();
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
        catch (err) {
            console.log(err);
            return null;
        }
    }

    public getChildren(element?: DisplayNode): vscode.ProviderResult<DisplayNode[]> {
        try {
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
        catch (err) {
            console.log(err);
            return null;
        }
    }

}

export function isFileAlreadyInProject(fileName: string, root: ProjectNode): boolean {
    for (let fileNode of root.sourceFiles) {
        if (pathEqual(fileName, fileNode.filePath, false))
            return true;
    }

    return false;
}

export function hasFileWithSameName(fileName: string, root: ProjectNode): boolean {
    let lowerLeft = path.basename(fileName).toLocaleLowerCase();

    for (let fileNode of root.sourceFiles) {
        let lowerRight = path.basename(fileNode.filePath).toLocaleLowerCase();

        if(lowerLeft == lowerRight)
            return true;
    }

    return false;
}

//root: node of the owner project
//fileName: the absolute file path of the lsp file to add
//rawFilePath: the raw string of file path read from .prj file; for new added file, it should be null
export function addLispFileNode2ProjectTree(root: ProjectNode, fileName: string, rawFilePath: string) {
    let fileNode = new LspFileNode();
    fileNode.filePath = fileName;
    fileNode.fileExists = fs.existsSync(fileName);
    fileNode.rawFilePath = rawFilePath;
    fileNode.document = ReadonlyDocument.open(fileName);
    root.sourceFiles.push(fileNode);
}
