import * as vscode from "vscode";

export function getTreeItemTitle(treeNode: vscode.TreeItem): string {
  if (treeNode.label instanceof String) {
    var res = treeNode.label as string;
    return res;
  }
  var itemlebel = treeNode.label as vscode.TreeItemLabel;
  return itemlebel.label;
}
