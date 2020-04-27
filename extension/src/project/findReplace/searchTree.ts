import { DisplayNode } from '../projectTree';
import { IconUris } from '../icons';

import * as vscode from 'vscode';
import { SearchOption } from './options';

export class FileNode implements DisplayNode {
    filePath: string = '';
    shortPath: string = '';
    findings: FindingNode[] = [];

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

    public reset(newResult: DisplayNode[], opt: SearchOption) {
        this.rootNodes = newResult;
        this.lastSearchOption = opt;

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
