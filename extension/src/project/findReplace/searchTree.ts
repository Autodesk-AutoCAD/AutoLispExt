import { DisplayNode, ProjectNode } from '../projectTree';
import { IconUris } from '../icons';
import { SearchOption } from './options';

import * as vscode from 'vscode';

export class FileNode implements DisplayNode {
    filePath: string = '';
    shortPath: string = '';
    findings: FindingNode[] = [];

    errorInReplace: string = '';//error message provided when replace in file

    getDisplayText(): string {
        return this.shortPath;
    }

    getTooltip(): string {
        return this.filePath;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri; } {
        return IconUris.lspFile();
    }

    getNodeType(): string {
        return "findinggroup";
    }

    isCollapsible(): Boolean {
        return true;
    }
}

export class FindingNode implements DisplayNode {
    line: number = -1;
    column: number = -1;
    text: string = '';
    filePath: string = '';

    errorInReplace: string = '';//error message provided when replace in file

    getDisplayText(): string {
        return this.text;
    }

    getTooltip(): string {
        let tooltip = `${this.line}:${this.column} ${this.text}`;
        if ((this.line <= 0) || (this.column <= 0)) {
            //in rg, the line/column number starts with 1
            console.log("invalid finding node: " + tooltip);
            return this.text;
        }

        return tooltip;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri; } {
        return null; //no icon for a single find result
    }

    getNodeType(): string {
        return "finding";
    }

    isCollapsible(): Boolean {
        return false;
    }
}

export class SummaryNode implements DisplayNode {
    summary:string = '';
    tooltip:string = '';

    makeTooltip(opt:SearchOption, prjNode:ProjectNode) {
        this.tooltip = '';

        let prjNameClause = '';
        let prjPathStatement = '';
        if(prjNode) {
            prjNameClause = ` in ${prjNode.projectName}`;
            prjPathStatement = `\r\nProject file: ${prjNode.projectFilePath}`; //TBD: localize
        }

        if(opt.isReplace) {
            this.tooltip = `Replace \"${opt.keyword}\" with \"${opt.replacement}\"${prjNameClause};`; //TBD: localization 
        }
        else {
            this.tooltip = `Find \"${opt.keyword}\"${prjNameClause};`; //TBD: localization
        }
        this.tooltip += prjPathStatement;
        
        if(opt.matchCase) {
            this.tooltip += '\r\nMatch case: ON';//TBD: localization
        }
        if(opt.matchWholeWord) {
            this.tooltip += '\r\nMatch whole word: ON' //TBD: localization
        }
        if(opt.useRegularExpr) {
            this.tooltip += '\r\nUse regular expression: ON' //TBD: localization
        }
    }

    getDisplayText(): string {
        return this.summary;
    }

    getTooltip(): string {
        return this.tooltip;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri; } {
        return null;
    }

    getNodeType (): string {
        return SummaryNode.nodeTypeString;
    }

    isCollapsible(): Boolean {
        return false;
    }

    static readonly nodeTypeString = "summary";
}

export class SearchTreeProvider implements vscode.TreeDataProvider<DisplayNode> {
    private constructor() {
        vscode.window.registerTreeDataProvider('Autolisp-FindReplaceView', this);
    }

    public static instance: SearchTreeProvider = new SearchTreeProvider();
    public static showResult: string = "showSearchResult";

    private onChanged: vscode.EventEmitter<DisplayNode> = new vscode.EventEmitter<DisplayNode>();
    public readonly onDidChangeTreeData?: vscode.Event<DisplayNode> = this.onChanged.event;

    private rootNodes: DisplayNode[] = null;

    public lastSearchOption: SearchOption = null;

    public reset(newResult: DisplayNode[], summary: SummaryNode, opt: SearchOption) {
        this.rootNodes = new Array<DisplayNode>();
        this.rootNodes.push(summary);
        if(newResult != null) {
            for(let fileNode of newResult) {
                this.rootNodes.push(fileNode);
            }
        }
        
        this.lastSearchOption = opt;

        this.onChanged.fire();
    }

    public clear() {
        this.rootNodes = null;

        this.onChanged.fire();
    }

    public getTreeItem(element: DisplayNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        try {
            let treeNode = new vscode.TreeItem(element.getDisplayText());
            treeNode.collapsibleState = element.isCollapsible() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
            treeNode.tooltip = element.getTooltip();
            treeNode.iconPath = element.getIconUri();
            treeNode.contextValue = element.getNodeType();

            treeNode.command = {
                title: treeNode.label,
                command: SearchTreeProvider.showResult,
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
            if (!element) {
                //asking for elements on top level
                return SearchTreeProvider.instance.rootNodes;
            }
            else {
                //asking for children of given element
                if (element instanceof FileNode) {
                    let fileNode = element as FileNode;
                    return fileNode.findings;
                }

                return null;
            }
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }

}
