import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { isCursorInDoubleQuoteExpr } from "../format/autoIndent";

let internalLispFuncs: Array<string> = [];
let internalDclKeys: Array<string> = [];
let winOnlyListFuncPrefix: Array<string> = [];

let allSysvars: Array<string> = [];
let allArxCmds: Array<string> = [];

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

    readDataFileByDelimiter("../../extension/data/allcmds.txt", ",", (item) => { allArxCmds.push(item) });

    readDataFileByDelimiter("../../extension/data/allsysvars.txt", " ", (item) => { allSysvars.push(item) });
}

function getCompletionCandidates(allCandiates: string[], word: string, userInputIsUpper: boolean): Array<vscode.CompletionItem> {
    let allSuggestions: Array<vscode.CompletionItem> = [];
    allCandiates.forEach((item) => {
        var candidate = item;
        if (userInputIsUpper)
            candidate = item.toUpperCase();
        if (candidate.startsWith(word) || candidate.endsWith(word)) {
            const completion = new vscode.CompletionItem(candidate);
            allSuggestions.push(completion);
        }
    });

    return allSuggestions;
}

export function registerAutoCompletionProviders() {
    vscode.languages.registerCompletionItemProvider(['autolisp', 'lsp', 'autolispdcl'], {

        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

            try {

                let currentLSPDoc = document.fileName;
                let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
                let candidatesItems = internalLispFuncs;
                if (ext === ".DCL") {
                    candidatesItems = internalDclKeys;
                }

                // If it is in comments, it doesn't need to provide lisp autocomplete
                let linetext = document.lineAt(position).text;
                if (linetext.startsWith(";") || linetext.startsWith(";;")
                    || linetext.startsWith("#|") || linetext.startsWith("|#")) {
                    return [];
                }

                let word = document.getText(document.getWordRangeAtPosition(position));
                let wordSep = " &#^()[]|;'\".";

                // Autolisp has special word range rules and now VScode has some issues to check the "word", 
                // so it needs this logic to check the REAL word range
                let pos = position.character;
                pos -= 2;
                let length = 0;
                for (; pos >= 0; pos--) {
                    let ch = linetext.charAt(pos);
                    if (wordSep.includes(ch)) {
                        if (length == 0)
                            length = word.length;
                        word = linetext.substr(pos + 1, length);
                        break;
                    }
                    length++;
                }
                if (word.length == 0)
                    return [];
                var isupper = () => {
                    if (word === word.toLocaleUpperCase())
                        return true;
                    return false;
                }
                var userInputIsUpper = isupper();

                let allSuggestions: Array<vscode.CompletionItem> = [];

                var isInDoubleQuote = isCursorInDoubleQuoteExpr(document, position);
                if (isInDoubleQuote) {
                    allSuggestions = allSuggestions.concat(getCompletionCandidates(allArxCmds, word, userInputIsUpper));

                    allSuggestions = allSuggestions.concat(getCompletionCandidates(allSysvars, word, userInputIsUpper));

                    return allSuggestions;
                }

                allSuggestions = allSuggestions.concat(getCompletionCandidates(candidatesItems, word, userInputIsUpper));

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
            }
            catch (err) {
                return [];
            }
        }
    });
}