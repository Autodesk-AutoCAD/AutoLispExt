import { DisplayNode, ProjectNode } from '../projectTree';
import { IconUris } from '../icons';
import { SearchOption } from './options';
import * as vscode from 'vscode';
import { AutoLispExt } from '../../extension';

export class FileNode implements DisplayNode {
    filePath: string = '';
    shortPath: string = '';
    findings: FindingNode[] = [];

    errorInReplace: string = null;//error message provided when replace in file
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    getDisplayText(): string {
        return this.shortPath + " (" + this.findings.length + ")";
    }

    getTooltip(): string {
        if (!this.errorInReplace)
            return this.filePath;

        return this.filePath + "\r\n" + this.errorInReplace;
    }

    getIconUri(): vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri; } {
        if (!this.errorInReplace)
            return IconUris.lspFile();

        return IconUris.missingFile();
    }

    getNodeType(): string {
        return "findinggroup";
    }

    getChildren(): FindingNode[] {
        if (!this.errorInReplace)
            return this.findings;

        return null;
    }

    getCollapsibleState(): vscode.TreeItemCollapsibleState {
        if (!this.errorInReplace)
            return this.collapsibleState;

        return vscode.TreeItemCollapsibleState.None;
    }

    setCollapsibleState(state: vscode.TreeItemCollapsibleState) {
        this.collapsibleState = state;
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
        let tooltip = `${this.line}: ${this.text}`;
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

    getCollapsibleState(): vscode.TreeItemCollapsibleState {
        return vscode.TreeItemCollapsibleState.None;
    }

    setCollapsibleState() {
    }
}

export class SummaryNode implements DisplayNode {
    summary: string = '';
    tooltip: string = '';

    makeTooltip(opt: SearchOption, prjNode: ProjectNode) {
        this.tooltip = '';

        let prjNameClause = '';
        let prjPathStatement = '';
        if (prjNode) {
            let inStr = AutoLispExt.localize("autolispext.project.findreplace.searchtree.in", " in ");
            let prjFileStr = AutoLispExt.localize("autolispext.project.findreplace.searchtree.prjfile", "\r\nProject file: ");
            prjNameClause = inStr + `${prjNode.projectName}`;
            prjPathStatement = prjFileStr + `${prjNode.projectFilePath}`;
        }

        if (opt.isReplace) {
            let replace = AutoLispExt.localize("autolispext.project.findreplace.searchtree.replace", "Replace ");
            let withStr = AutoLispExt.localize("autolispext.project.findreplace.searchtree.with", " with ");
            this.tooltip = replace + `\"${opt.keyword}\"` + withStr + `\"${opt.replacement}\"${prjNameClause};`;
        }
        else {
            let findStr = AutoLispExt.localize("autolispext.project.findreplace.searchtree.find", "Find ");
            this.tooltip = findStr + `\"${opt.keyword}\"${prjNameClause};`;
        }
        this.tooltip += prjPathStatement;

        if (opt.matchCase) {
            this.tooltip += AutoLispExt.localize("autolispext.project.findreplace.searchtree.matchcaseon", "\r\nMatch case: ON");
        }
        if (opt.matchWholeWord) {
            this.tooltip += AutoLispExt.localize("autolispext.project.findreplace.searchtree.matchwholewordon", "\r\nMatch whole word: ON");
        }
        if (opt.useRegularExpr) {
            this.tooltip += AutoLispExt.localize("autolispext.project.findreplace.searchtree.regexpon", "\r\nUse regular expression: ON");
        }

        this.tooltip += "\r\n" + this.summary;
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

    getNodeType(): string {
        return SummaryNode.nodeTypeString;
    }

    getCollapsibleState(): vscode.TreeItemCollapsibleState {
        return vscode.TreeItemCollapsibleState.None;
    }

    setCollapsibleState() {
    }

    static readonly nodeTypeString = "summary";
}

export class SearchTreeProvider implements vscode.TreeDataProvider<DisplayNode> {
    private constructor() {
        this.treeControl = vscode.window.createTreeView('Autolisp-FindReplaceView', { treeDataProvider: this });
        this.treeControl.onDidCollapseElement(e => {
            e.element.setCollapsibleState(vscode.TreeItemCollapsibleState.Collapsed);
        })
        this.treeControl.onDidExpandElement(e => {
            e.element.setCollapsibleState(vscode.TreeItemCollapsibleState.Expanded);
        })
    }

    public static instance: SearchTreeProvider = new SearchTreeProvider();
    public static showResult: string = "showSearchResult";

    private onChanged: vscode.EventEmitter<DisplayNode> = new vscode.EventEmitter<DisplayNode>();
    public readonly onDidChangeTreeData?: vscode.Event<DisplayNode> = this.onChanged.event;

    private rootNodes: DisplayNode[] = null;
    private treeControl: vscode.TreeView<DisplayNode> = null;

    public lastSearchOption: SearchOption = null;

    public reset(newResult: DisplayNode[], summary: SummaryNode, opt: SearchOption) {
        this.rootNodes = new Array<DisplayNode>();
        this.rootNodes.push(summary);
        if (newResult != null) {
            for (let fileNode of newResult) {
                this.rootNodes.push(fileNode);
            }
        }

        this.lastSearchOption = opt;

        this.onChanged.fire(null);
    }

    public clear() {
        this.rootNodes = null;

        this.onChanged.fire(null);
    }

    public getTreeItem(element: DisplayNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        try {
            let treeNode = new vscode.TreeItem(element.getDisplayText());
            treeNode.collapsibleState = element.getCollapsibleState();
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
                    return fileNode.getChildren();
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
