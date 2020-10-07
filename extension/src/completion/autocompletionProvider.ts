import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { isCursorInDoubleQuoteExpr } from "../format/autoIndent";
import { LispParser } from '../format/parser';
import { Sexpression, LispAtom } from '../format/sexpression';
import { findContainers, ElementRange } from "../format/autoIndent";
import { webHelpContainer } from "../help/openWebHelp";
import { activeDocuments } from '../workspace/workspaceInit';
import { ReadonlyDocument } from '../project/readOnlyDocument';

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
    let platform = (os.platform() === "win32") ? "WIN" : "MAC";
    allCandiates.forEach((item) => {
        var candidate = item;
        if (userInputIsUpper)
            candidate = item.toUpperCase();
        else
            candidate = item.toLowerCase();

        if (candidate.startsWith(word) && (platform === "WIN" || !winOnlyListFuncPrefix.find(pref => candidate.startsWith(pref)))) {
            let label = candidate;
            let lower = label.toLowerCase();
            let cKind: vscode.CompletionItemKind = AutoLispKind.vsKind(AutoLispKind.Symbol);
            if (webHelpContainer.ambiguousFunctions[lower] && webHelpContainer.ambiguousFunctions[lower][0].platforms.includes(platform)){
                cKind = AutoLispKind.vsKind(AutoLispKind.Function);
            } else if (webHelpContainer.functions[lower] && webHelpContainer.functions[lower].platforms.includes(platform)){
                cKind = AutoLispKind.vsKind(AutoLispKind.Function);
            } else if (webHelpContainer.enumerators[lower]){
                cKind = AutoLispKind.vsKind(AutoLispKind.Enum);
            }
            const completion = new vscode.CompletionItem(label, cKind);
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

// Made a derived enum so we can swap out the vscode.CompletionItemKind values in a single place
// Image of most symbols: https://camo.qiitausercontent.com/fb2a29c3301ab07f8af7cfa657752bdd9a62b8ea/68747470733a2f2f71696974612d696d6167652d73746f72652e73332e61702d6e6f727468656173742d312e616d617a6f6e6177732e636f6d2f302f3138393034312f66396263613830662d333136362d643338382d386538362d3632613535313363616431332e706e67
export enum AutoLispKind {
    Global = vscode.CompletionItemKind.Property,
    Local = vscode.CompletionItemKind.Variable,
    Arg = vscode.CompletionItemKind.Value,
    Defun = vscode.CompletionItemKind.Class,
    Enum = vscode.CompletionItemKind.Constant,
    Symbol = vscode.CompletionItemKind.Field,
    Function = vscode.CompletionItemKind.Method
}
export namespace AutoLispKind {
    export function vsKind(kind: AutoLispKind): vscode.CompletionItemKind { return kind as unknown as vscode.CompletionItemKind; }
}

export class CompletionSymbolCollector {
    private values: Map<string, string[]> = new Map();
    private used: string[] = [ ];
    private ret: vscode.CompletionItem[] = [ ];
    private word: string = "";
    private rooted: boolean = false;
    private previousItems: string[] = [ ];
    constructor(){ // uses the Enum Names as the list values so we can F2 rename them without having to hunt down string versions of them
        this.values.set(AutoLispKind[AutoLispKind.Arg], []);
        this.values.set(AutoLispKind[AutoLispKind.Defun], []);
        this.values.set(AutoLispKind[AutoLispKind.Global], []);
        this.values.set(AutoLispKind[AutoLispKind.Local], []);
        this.values.set(AutoLispKind[AutoLispKind.Symbol], []);
    }

    get allValues (): Map<string, string[]> { return this.values;}

    private assembleResult(lst: string[], kind: vscode.CompletionItemKind){
        const platform = (os.platform() === "win32") ? "WIN" : "MAC";
        lst.forEach(name => {
            const key = name.toLowerCase();
            if (platform === "WIN" || !winOnlyListFuncPrefix.find(pref => key.startsWith(pref))){
                if (this.used.indexOf(key) === -1 && (this.word === "" || key.startsWith(this.word))){
                    this.ret.push(new vscode.CompletionItem(name, kind));
                    this.used.push(key);
                }
            }
        });
    }

    private tryAddSymbol(name: string, kind: AutoLispKind): void {
        const ucName = name.toUpperCase();
        if (name.indexOf(' ') === -1 && !this.values.get(AutoLispKind[kind]).find(p => p.toUpperCase() === ucName)){
            this.values.get(AutoLispKind[kind]).push(name);
        }
        this.previousItems.unshift(ucName);
    }

    private traverseSexpression(sx: Sexpression): void {
        let context: number|string = "";
        sx.atoms.forEach(atom =>{
            if (context !== "EXIT" && atom instanceof Sexpression){    
                this.traverseSexpression(atom as Sexpression);
                if (context === 2){
                    context = 1;
                }
            } else if (context !== "EXIT") {                
                const ucAtom = atom.symbol.toUpperCase();
                if (atom.isComment() === true || atom.isLineComment() === true) { 
                    // simply ignore all comments
                } else if (context === "ARGS") {
                    // collecting AutoLispKind.Arg's
                    if (atom.symbol === "/"){
                        context = "LOCALS";
                        this.previousItems.unshift("/");
                    } else if (atom.symbol === ")"){
                        context = "";
                        this.previousItems.unshift(")");
                    } else {
                        this.tryAddSymbol(atom.symbol, AutoLispKind.Arg);
                    }
                } else if (context === "LOCALS") { 
                    // collecting AutoLispKind.Local's
                    if (ucAtom === ")"){
                        context = "";
                        this.previousItems.unshift(")");
                    } else {
                        this.tryAddSymbol(atom.symbol, AutoLispKind.Local);
                    }                    
                } else if (context === 1) { 
                    // collecting AutoLispKind.Global's     
                    if (ucAtom === ")") {
                        context = ""; // Done collecting Global Vars
                        this.previousItems.unshift(ucAtom);
                    } else {
                        context = 2;
                        this.tryAddSymbol(atom.symbol, AutoLispKind.Global);
                    }
                } else if (context === 2) {
                    if (ucAtom === ")"){
                        context = ""; // Done collecting Global Vars
                    } else {
                        context = 1; // should have been a primitive value (like a string or number), the next one could be another variable name
                    }
                    this.previousItems.unshift(ucAtom);                    
                } else if (this.rooted && ucAtom === "DEFUN" || ucAtom === "DEFUN-Q") {
                    context = "DEFUNCHILD"; // this is a child defun that I don't want variable data from
                    this.previousItems.unshift(context);
                } else if (context === "DEFUNCHILD") {
                    context = "EXIT";
                    this.tryAddSymbol(atom.symbol, AutoLispKind.Defun); // only collect defun name
                } else if (!this.rooted && this.previousItems[0] && (this.previousItems[0] === "DEFUN" || this.previousItems[0] === "DEFUN-Q")) {                    
                    this.rooted = true;                    
                    this.tryAddSymbol(atom.symbol, AutoLispKind.Defun); // collected root (first) defun name
                } else if (this.previousItems[1] && (this.previousItems[1] === "DEFUN" || this.previousItems[1] === "DEFUN-Q")) {
                    context = ucAtom === "(" ? "ARGS" : ""; // this context tells us when we are collecting args or locals
                    this.previousItems.unshift(ucAtom); // most likely a '(' but defuns aren't required to have a (arg / local) declaration space so it could be nil
                } else if (this.previousItems[0] && this.previousItems[0] === "SETQ") {
                    context = 2; // this context tells me I am looking for a variable declaration
                    this.tryAddSymbol(atom.symbol, AutoLispKind.Global);
                } else {
                    this.previousItems.unshift(ucAtom);
                }
            }
        });
    }

    load(document: vscode.TextDocument, position: vscode.Position): void {
        // get the scope of this position  
        let kwRegex: RegExp = /\(\s*(DEFUN|DEFUN-Q)\s+\S{1,99}(\s|\(|;)/gi;
        let tmp = findContainers(document, position);
        let pr1: ElementRange = tmp.containerBlockComment;
        let pr2: ElementRange[] = tmp.containerParens;
        let contents: string = "";
        const containers: ElementRange[] = findContainers(document, position).containerParens;
        for (let ci = 0; ci < containers.length; ci++) {
            const entry: ElementRange = containers[ci];
            const value: string = document.getText(new vscode.Range(document.positionAt(entry.startPos.offsetInDocument), document.positionAt(entry.endPos.offsetInDocument)));
            // retrieve the string contents of the first Defun scope
            if (value.search(kwRegex) !== -1){                
                contents = value;
                break;
            }
        }
        // Fallback for when the typed values are not in a Defun
        if (contents === ""){
            contents = document.getText(new vscode.Range(document.positionAt(containers.slice(-1)[0].startPos.offsetInDocument), document.positionAt(containers.slice(-1)[0].endPos.offsetInDocument)));
        }
        
        
        // Create and load that scope into a temporary document for contextual parsing, had to add this openFromContent method to narrow the LispParser SOW
        const tempDoc: ReadonlyDocument = ReadonlyDocument.openFromContent(contents, "autolisp");
        const lp: LispParser = new LispParser(tempDoc);        
        lp.tokenizeString(contents, 0); 
        // this atoms forest should only be comprised of a single Sexpression unless
        if (lp.atomsForest.length === 1 && lp.atomsForest[0] instanceof Sexpression){
            this.traverseSexpression(lp.atomsForest[0] as Sexpression);
        } else {
            // some kind of structural document error came into play
            debugger;
        }
        this.previousItems.length = 0; // cleanup the tracking mess

        // quick scan any open documents for defun headers. 
        // Note: This workspace.textDocuments array only ever contains a single document or I would of used it instead.
        
        activeDocuments.forEach(doc =>{
            for (let lnum = 0; lnum < doc.lineCount; lnum++) {
                const line: vscode.TextLine = doc.lineAt(lnum);
                const value: string = line.text.toUpperCase();
                if (value.search(kwRegex) !== -1){                                        
                    let finalVal = line.text.match(kwRegex)[0].replace(/\(\s*(DEFUN|DEFUN-Q)\s+/ig, "");
                    if (line.text.endsWith(finalVal) === false){
                        finalVal = finalVal.slice(0, -1);
                    }
                    this.tryAddSymbol(finalVal, AutoLispKind.Defun);
                }
            }
        });
    }

    getCollectedCompletionValuesFrom(kind: AutoLispKind, filteredBy?: string): Array<vscode.CompletionItem>{
        this.used.length = this.ret.length = 0;
        this.word = filteredBy ? filteredBy.toLowerCase() : "";
        this.assembleResult(this.values.get(AutoLispKind[kind]), AutoLispKind.vsKind(AutoLispKind.Arg));
        this.used.length = 0;
        return this.ret;
    }
    
    getCollectedCompletionValues(filteredBy?: string): Array<vscode.CompletionItem>{
        this.used.length = this.ret.length = 0;
        this.word = filteredBy ? filteredBy.toLowerCase() : "";
        this.assembleResult(this.values.get(AutoLispKind[AutoLispKind.Arg]), AutoLispKind.vsKind(AutoLispKind.Arg));
        this.assembleResult(this.values.get(AutoLispKind[AutoLispKind.Local]), AutoLispKind.vsKind(AutoLispKind.Local));
        this.assembleResult(this.values.get(AutoLispKind[AutoLispKind.Global]), AutoLispKind.vsKind(AutoLispKind.Global));
        this.assembleResult(this.values.get(AutoLispKind[AutoLispKind.Defun]), AutoLispKind.vsKind(AutoLispKind.Defun));
        this.assembleResult(this.values.get(AutoLispKind[AutoLispKind.Symbol]), AutoLispKind.vsKind(AutoLispKind.Symbol));
        if (os.platform() === "win32"){
            Object.keys(webHelpContainer.enumerators).forEach(name => {            
                if (this.used.indexOf(name) === -1 && name.startsWith(this.word)){
                    this.ret.push(new vscode.CompletionItem(name, AutoLispKind.vsKind(AutoLispKind.Enum)));
                    this.used.push(name);
                }
            });
        }
        this.used.length = 0;
        return this.ret;
    }
}


function getLispAndDclCompletions(document: vscode.TextDocument, word: string, isupper: boolean): vscode.CompletionItem[] {
    const ext: string = document.fileName.toUpperCase().slice(-4);
    if (ext === ".DCL") {
        return getCompletionCandidates(internalDclKeys, word, isupper);
    } else {
        const vIndexer: CompletionSymbolCollector = new CompletionSymbolCollector();
        vIndexer.load(document, vscode.window.activeTextEditor.selection.start);
        // Moved WIN|MAC platform filtering to the CompletionCandidate getters so we aren't building and then discarding CompletionItem structures.
        return vIndexer.getCollectedCompletionValues(word).concat(getCompletionCandidates(internalLispFuncs, word, isupper));
    }
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