import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { isCursorInDoubleQuoteExpr } from "../format/autoIndent";

let internalLispFuncs: Array<string> = [];
let internalDclKeys: Array<string> = [];
let winOnlyListFuncPrefix: Array<string> = [];

let allCmdsAndSysvars: Array<string> = [];

export function isInternalAutoLispOp(item: string): boolean {
    if (!item)
        return false;

    for (let i = 0; i < internalLispFuncs.length; i++) {
        if (internalLispFuncs[i] === item)
            return true;
    }
    return false;
}

function readDataFileByDelimiter(datafile: string, delimiter: string, action: (item: string) => void) {
    var fs = require("fs");
    var dataPath = path.resolve(__dirname, datafile);
    fs.readFile(dataPath, "utf8", function(err, data) {
        var lineList = new Array<String>();
        if (err === null) {
            if (data.includes("\r\n")) {
                lineList = data.split("\r\n");
            }
            else {
                lineList = data.split("\n");
            }

            lineList.forEach(line => {
                var items = line.split(delimiter);
                var item = items[0];
                item = item.trim();
                if (item.length > 0)
                    action(item);
            });
        }
    });
}

function readDataFileByLine(datafile: string, action: (items: string[]) => void) {
    var fs = require("fs");
    var dataPath = path.resolve(__dirname, datafile);
    fs.readFile(dataPath, "utf8", function(err, data) {
        if (err === null) {
            if (data.includes("\r\n")) {
                action(data.split("\r\n"));
            }
            else {
                action(data.split("\n"));
            }
        }
    });
}
export function readAllBultinFunctions() {
    readDataFileByLine("../../extension/data/alllispkeys.txt", (items) => { internalLispFuncs = items });

    readDataFileByLine("../../extension/data/alldclkeys.txt", (items) => { internalDclKeys = items });

    readDataFileByLine("../../extension/data/winonlylispkeys_prefix.txt", (items) => { winOnlyListFuncPrefix = items });

    readDataFileByDelimiter("../../extension/data/cmdAndVarsList.txt", ",", (item) => {
        var isLispCmds = item.startsWith("C:") || item.startsWith("c:");
        if (!isLispCmds && allCmdsAndSysvars.indexOf(item) < 0)
            allCmdsAndSysvars.push(item)
    });

}

function getCmdAndVarsCompletionCandidates(allCandiates: string[], word: string, userInputIsUpper: boolean): Array<vscode.CompletionItem> {
    var hasUnderline = false;
    if (word[0] == "_") {
        hasUnderline = true;
        word = word.substring(1);
    }

    var hasDash = false;
    if (word[0] == "-") {
        hasDash = true;
    }

    let suggestions: Array<vscode.CompletionItem> = [];
    allCandiates.forEach((item) => {
        var candidate = item;
        if (userInputIsUpper)
            candidate = item.toUpperCase();
        else
            candidate = item.toLowerCase();

        if (candidate.startsWith(word)) {
            var label = candidate;

            // The _ symbol has special mean in AutoCAD commands, so we add the prefix if it matches the command name
            if (hasUnderline)
                label = "_" + label;

            const completion = new vscode.CompletionItem(label);

            // to work around the middle dash case issue in vscode, when insert it ignores the dash
            if (hasDash)
                completion.insertText = label.substring(1);

            suggestions.push(completion);
        }
    });

    return suggestions;
}

function getCompletionCandidates(allCandiates: string[], word: string, userInputIsUpper: boolean): Array<vscode.CompletionItem> {
    let suggestions: Array<vscode.CompletionItem> = [];
    allCandiates.forEach((item) => {
        var candidate = item;
        if (userInputIsUpper)
            candidate = item.toUpperCase();
        else
            candidate = item.toLowerCase();

        if (candidate.startsWith(word)) {
            var label = candidate;
            const completion = new vscode.CompletionItem(label);
            suggestions.push(completion);
        }
    });

    return suggestions;
}

function getMatchingWord(document: vscode.TextDocument, position: vscode.Position): [string, boolean] {
    let linetext = document.lineAt(position).text;

    let word = document.getText(document.getWordRangeAtPosition(position));
    let wordSep = " &#^()[]|;'\".";

    // Autolisp has special word range rules and now VScode has some issues to check the "word" range, 
    // so it needs this logic to check the REAL word range
    let pos = position.character;
    pos -= 2;
    let length = 1;
    let hasSetLen = false;
    for (; pos >= 0; pos--) {
        let ch = linetext.charAt(pos);
        if (wordSep.includes(ch)) {
            if (!hasSetLen)
                length = word.length;
            word = linetext.substr(pos + 1, length);
            break;
        }
        length++;
        hasSetLen = true;
    }

    var isupper = () => {
        var lastCh = word.slice(-1);
        var upper = lastCh.toUpperCase();
        if (upper != lastCh.toLowerCase() && upper == lastCh)
            return true;
        return false;
    }
    var inputIsUpper = isupper();
    if (inputIsUpper)
        word = word.toUpperCase();
    else word = word.toLowerCase();

    return [word, inputIsUpper];
}

function getLispAndDclCompletions(document: vscode.TextDocument, word: string, isupper: boolean): vscode.CompletionItem[] {
    let currentLSPDoc = document.fileName;
    let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
    let candidatesItems = internalLispFuncs;
    if (ext === ".DCL") {
        candidatesItems = internalDclKeys;
    }
    let allSuggestions: Array<vscode.CompletionItem> = [];
    allSuggestions = getCompletionCandidates(candidatesItems, word, isupper);

    if (os.platform() === "win32") {
        return allSuggestions;
    }
    else {
        return allSuggestions.filter(function(suggestion) {
            for (var prefix of winOnlyListFuncPrefix) {
                if (suggestion.label.startsWith(prefix)) {
                    return false;
                }
            }
            return true;
        });
    }
    return allSuggestions;
}

export function registerAutoCompletionProviders() {
    vscode.languages.registerCompletionItemProvider(['autolisp', 'lsp', 'autolispdcl'], {

        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

            try {
                let linetext = document.lineAt(position).text;
                if (linetext.startsWith(";") || linetext.startsWith(";;")
                    || linetext.startsWith("#|")) {
                    return [];
                }

                let [inputword, userInputIsUpper] = getMatchingWord(document, position);
                if (inputword.length == 0)
                    return [];

                var isInDoubleQuote = isCursorInDoubleQuoteExpr(document, position);
                if (isInDoubleQuote) {
                    var cmds = getCmdAndVarsCompletionCandidates(allCmdsAndSysvars, inputword, userInputIsUpper);
                    return cmds;
                }

                return getLispAndDclCompletions(document, inputword, userInputIsUpper);
            }
            catch (err) {
                return [];
            }
        }
    });
}