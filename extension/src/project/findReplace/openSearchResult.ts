import { SearchOption } from './options';
import { FindingNode } from './searchTree';

import * as vscode from 'vscode';
import * as fs from 'fs';

export async function openSearchResult(clickedTreeItem: FindingNode, searchOpt: SearchOption) {

    try {
        let isSingleResult = clickedTreeItem instanceof FindingNode;
        if (!isSingleResult)
            return;

        let finding = clickedTreeItem as FindingNode;
        const exists = fs.existsSync(finding.filePath);

        if (exists == false) {
            return Promise.reject("File doesn't exist: " + finding.filePath); //TBD: localize
        }

        let line = finding.line - 1; //rp line starts with 1 but vscode starts with 0
        let col = finding.column - 1;

        let textLen = searchOpt.keyword.length;
        if (searchOpt.useRegularExpr) {
            let flags = searchOpt.matchCase ? null : 'i';
            let reg = new RegExp(searchOpt.keyword, flags);
            let matches = reg.exec(finding.text);
            if (matches.length <= 0) {
                console.log("can't detect keyword length with regular expression on");
            } else {
                textLen = matches[0].length;
            }
        }

        let opt = { "selection": new vscode.Range(new vscode.Position(line, col), new vscode.Position(line, col + textLen)) }
        return vscode.commands.executeCommand("vscode.open",
            vscode.Uri.file(finding.filePath),
            opt);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
