import { SearchOption } from './options';
import { FindingNode } from './searchTree';
import { getDocument } from '../../utils';
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

        let textLen = 0;
        if (searchOpt.isReplace == false) {
            textLen = searchOpt.keyword.length;
            if (searchOpt.useRegularExpr) {
				//it's a finding with regular expression; need to get the matched text to work out the length
                let flags = searchOpt.matchCase ? null : 'i';
                let reg = new RegExp(searchOpt.keyword, flags);
                let matches = reg.exec(finding.text);
                if (matches.length <= 0) {
                    console.log("can't detect keyword length with regular expression on");
                } else {
                    textLen = matches[0].length;
                }
            }
		}
		else {
			textLen = searchOpt.replacement.length;
		}

        // get document of the file or open the file if it's not opened
        let doc = getDocument(finding.filePath);
        if (!doc) {
            doc = await vscode.workspace.openTextDocument(vscode.Uri.file(finding.filePath));
            if (!doc) {
                return Promise.reject("Cannot open " + finding.filePath);
            }
        }

        // get text inside the searched range of the document and don't select the range if the text is changed since last search
        let start = new vscode.Position(line, col);
        let end = new vscode.Position(line, col + textLen);
        let range = new vscode.Range(start, end);
        let text = doc.getText(range);
        let textFound = finding.text.substr(col, textLen)
        if (text != textFound) {
            range = range.with(start, start);
        }

        let opt = { "selection": range}
        return vscode.commands.executeCommand("vscode.open",
            vscode.Uri.file(finding.filePath),
            opt);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
