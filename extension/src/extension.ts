// $ts: extension.ts#2 $ $Change: 385917 $ $DateTime: 2018/12/05 11:52:14 $ $Author: yunjian.zhang $
// $NoKeywords: $
//
//  Copyright 2018 Autodesk, Inc.  All rights reserved.
//
//  Use of this software is subject to the terms of the Autodesk license 
//  agreement provided at the time of installation or download, or which 
//  otherwise accompanies this software in either electronic or hard copy form.   
//
// extension.ts
//
// CREATED BY:  yunjian.zhang               DECEMBER. 2018
//
// DESCRIPTION: Lisp vscode extension core code.
//
'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as Net from 'net';
import * as os from 'os';

import {
	LanguageClient

} from 'vscode-languageclient';

import { pickProcess } from './acadPicker';
import { calculateABSPathForDAP, isSupportedLispFile } from './platform';
import { ProcessPathCache } from './processCache';
import { AutoFormater } from "./autoFormater";
import { DiagnosticsCtrl } from './diagnosticsCtrl';
import { onUriRequested } from './uriHandler';
import { existsSync } from 'fs';

let client: LanguageClient;

var fs = require("fs");
let internalLispFuncs: Array<String> = [];
let internalDclKeys: Array<String> = [];
var lispkeyspath = path.resolve(__dirname, "../data/alllispkeys.txt");
fs.readFile(lispkeyspath, "utf8", function (err, data) {
	if (err === null) {
		if (data.includes("\r\n")) {
			internalLispFuncs = data.split("\r\n");
		}
		else {
			internalLispFuncs = data.split("\n");
		}	
	}
});
var dclkeyspath = path.resolve(__dirname, "../data/alldclkeys.txt");
fs.readFile(dclkeyspath, "utf8", function (err, data) {
	if (err === null) {
		if (data.includes("\r\n")) {
			internalDclKeys = data.split("\r\n");
		}
		else {
			internalDclKeys = data.split("\n");
		}
	}
});
let winOnlyListFuncPrefix: Array<string> = [];
var winonlyprefixpath = path.resolve(__dirname, "../data/winonlylispkeys_prefix.txt");
fs.readFile(winonlyprefixpath, "utf8", function (err, data) {
	if (err == null) {
		if (data.includes("\r\n")) {
			winOnlyListFuncPrefix = data.split("\r\n");
		}
		else {
			winOnlyListFuncPrefix = data.split("\n");
		}
	}
});

let strNoADPerr: string = "doesn’t exist. Verify that the file exists in the same folder as that for the product specified in the launch.json file.";
let strNoACADerr: string = "doesn’t exist. Verify and correct the folder path to the product executable.";
let acadPid2Attach = -1;

let attachCfgName = 'AutoLISP Debug: Attach';
let attachCfgType = 'attachlisp';
let attachCfgRequest = 'attach';

export function setDefaultAcadPid(pid: number) {
    acadPid2Attach = pid;
}

export function createAttachConfig() {
    return {
        type: attachCfgType,
        name: attachCfgName,
        request: attachCfgRequest,
        stopOnEntry: false,
        protocol: 'auto'
    };
}

export function activate(context: vscode.ExtensionContext) {

	//-----------------------------------------------------------
	//1. lisp autoformat
	//-----------------------------------------------------------
	vscode.languages.registerDocumentFormattingEditProvider(['autolisp', 'lisp'], {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			let activeTextEditor = vscode.window.activeTextEditor;
			let currentLSPDoc = activeTextEditor.document.fileName;
			let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
			if (ext === ".DCL") {
				vscode.window.showInformationMessage("Command doesn’t support DCL files.");
				return;
			}

			return [vscode.TextEdit.replace(AutoFormater.getFullDocRange(activeTextEditor), AutoFormater.excuteFormatDoc(activeTextEditor, true))];
		}
	});

	vscode.languages.registerDocumentRangeFormattingEditProvider(['autolisp', 'lisp'], {
		provideDocumentRangeFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			let activeTextEditor = vscode.window.activeTextEditor;
			let currentLSPDoc = activeTextEditor.document.fileName;
			let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
			if (ext === ".DCL") {
				vscode.window.showInformationMessage("Command doesn’t support DCL files.");
				return;
			}
			if (activeTextEditor.selection.isEmpty) {
				vscode.window.showInformationMessage("First, select the lines of code to format.");
			}
			return [vscode.TextEdit.replace(AutoFormater.getSelectedDocRange(activeTextEditor), AutoFormater.excuteFormatDoc(activeTextEditor, false))];
		}
	});

	vscode.languages.registerCompletionItemProvider(['autolisp', 'lsp', 'autolispdcl'], {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

			let currentLSPDoc = document.fileName;
			let ext = currentLSPDoc.substring(currentLSPDoc.length - 4, currentLSPDoc.length).toUpperCase();
			let candidatesItems = internalLispFuncs;
			if (ext === ".DCL")
			{
				candidatesItems = internalDclKeys;
			}
			
			// If it is in comments, it doesn't need to provide lisp autocomplete
			let linetext = document.lineAt(position).text;
            if (linetext.startsWith(";") || linetext.startsWith(";;")
                || linetext.startsWith("#|") || linetext.startsWith("|#"))
			{
				return;
			}

			let word = document.getText(document.getWordRangeAtPosition(position));
            let wordSep = " &#^()[]|;'\".";
            // Maybe has some issues for matching first item
            let pos = linetext.indexOf(word);
            pos--;
            let length = 0;
            for (; pos >= 0; pos--) {
                if (linetext.length <= pos)
                    break;
                let ch = linetext.charAt(pos);
                if (wordSep.includes(ch)) {
                    word = linetext.substr(pos + 1, word.length + length);
                    break;
                }
                length++;
            }

			let allSuggestions: Array<vscode.CompletionItem> = [];
			word = word.toLowerCase();

			candidatesItems.forEach((item) => {
				if (item.startsWith(word) || item.endsWith(word)) {
					const completion = new vscode.CompletionItem(item.toString());
					allSuggestions.push(completion);
				}
			});

			if (os.platform() === "win32") {
				return allSuggestions;
			}
			else {
				return allSuggestions.filter(function (suggestion) {
					for (var prefix of winOnlyListFuncPrefix) {
						if (suggestion.label.startsWith(prefix)) {
							return false;
						}
					}
					return true;
				});
			}
		}
	});

	//-----------------------------------------------------------
	//2. lisp load button
	//-----------------------------------------------------------
	let lspLoadButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	lspLoadButton.text = "📄Load lisp";
	lspLoadButton.color = 'white';
	lspLoadButton.tooltip = "Load the Current File";
	lspLoadButton.command = "extension.loadCurrentLisp";
	lspLoadButton.show();
	context.subscriptions.push(vscode.commands.registerCommand("extension.loadCurrentLisp", () => {
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			//execute load progress 
			if (vscode.debug.activeDebugSession !== undefined) {
				vscode.debug.activeDebugSession.customRequest("customLoad", currentLSPDoc);
			} else {
				vscode.window.showErrorMessage("First, attach to or launch a host application before loading this file.");
			}
		} else {
			let platform = os.type();
			if(platform === 'Windows_NT'){
				vscode.window.showErrorMessage("This file format isn’t supported. Activate a window containing a DCL, LSP, or MNL file.");
			}
			else{
				vscode.window.showErrorMessage("This file format isn’t supported. Activate a window containing a DCL or LSP file.");
			}	
		}
	}));
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => {
		let currentLSPDoc = vscode.window.activeTextEditor.document.fileName;
		if(isSupportedLispFile(currentLSPDoc)) {
			lspLoadButton.show();
		} else {
			lspLoadButton.hide();
		}
	}));

	//-----------------------------------------------------------
	//3. runtime diagnostics
	//-----------------------------------------------------------
	DiagnosticsCtrl.initDiagnostic();

	//-----------------------------------------------------------
	//4. debug adapter
	//-----------------------------------------------------------
	//this command is used for launch debug calculating DebugAdapter path and arguments
	context.subscriptions.push(vscode.commands.registerCommand("extension.lispLaunchAdapterExecutableCommand", async () => {

		let lispadapterpath = ProcessPathCache.globalLispAdapterPath;
		let productStartCommand = ProcessPathCache.globalProductPath;
		let productStartParameter = ProcessPathCache.globalParameter;
		return {
			command: lispadapterpath,
			args:["--", productStartCommand, productStartParameter]
		};
	}));
	context.subscriptions.push(vscode.commands.registerCommand("extension.lispAttachAdapterExecutableCommand", async () => {
		let lispadapterpath = ProcessPathCache.globalLispAdapterPath;
		return {
			command: lispadapterpath,
			args: []
		};
	}));

	// register a configuration provider for 'lisp' launch debug type
	const launchProvider = new LispLaunchConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('launchlisp', launchProvider));
	context.subscriptions.push(launchProvider);

	//register a configuration provider for 'lisp' attach debug type
	const attachProvider = new LispAttachConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(attachCfgType, attachProvider));
	context.subscriptions.push(attachProvider);

	//register attach failed message
	context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
		console.log(event);
        if (event.session && (event.session.type === "launchlisp" || event.session.type === attachCfgType)) {
			if (event.event === "runtimeerror") {
				// handle runtime diagnostics errors
				DiagnosticsCtrl.addDocumentDiagnostics(event.body.file, event.body.message, event.body.startline, event.body.startcol, event.body.endline, event.body.endcol);
			} 
			else if (event.event === "clearcache") {
				setDefaultAcadPid(-1);
			}
			else if (event.event === "acadnosupport") {
				vscode.window.showErrorMessage("This instance of AutoCAD doesn’t support debugging AutoLISP files, use a release later than AutoCAD 2020.");
			}
		}
    }));

    //register the handler to uri scheme: vscode://autodesk.autolispext?......
    vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri) {
            onUriRequested(uri);
        }
    });

	context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(e => {
		// clear the runtime diagnostics errors
		DiagnosticsCtrl.clearDocumentDiagnostics();
	}));
	context.subscriptions.push(vscode.debug.onDidStartDebugSession(e => {
		// clear the runtime diagnostics errors
		DiagnosticsCtrl.clearDocumentDiagnostics();
	}));

	context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(e => {
		// clear the runtime diagnostics errors
		DiagnosticsCtrl.clearDocumentDiagnostics();
	}));
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

export function acitiveDocHasValidLanguageId() : Boolean
{
	const editor = vscode.window.activeTextEditor;

	return editor.document.languageId === 'autolisp' || 
		   editor.document.languageId === 'autolispdcl' || 
		   editor.document.languageId === 'lisp';
}

export function need2AddDefaultConfig(config: vscode.DebugConfiguration) : Boolean
{
	if(config.type) return false;
	if(config.request) return false;
	if(config.name) return false;

	return true;
}


class LispLaunchConfigurationProvider implements vscode.DebugConfigurationProvider {

	private _server?: Net.Server;

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
		console.log(config);
		
		// if launch.json is missing or empty
		if (need2AddDefaultConfig(config)) {
			config.type = 'launchlisp';
			config.name = 'AutoLISP Debug: Launch';
			config.request = 'launch';
		}

        if (vscode.window.activeTextEditor)
            config.program = vscode.window.activeTextEditor.document.fileName;

        if (config["type"] === "launchlisp") {
			// 1. get acad and adapter path
			//2. get acadRoot path
			//2.1 get acadRoot path from launch.json
			let productPath = "";
			if (config["attributes"])
				productPath = config["attributes"]["path"] ? config["attributes"]["path"] : "";

			if (!productPath && ProcessPathCache.globalProductPath) {
				//2.2 get acadRoot path from global cache
				productPath = ProcessPathCache.globalProductPath;
			}
			if (!productPath) {
				vscode.window.showInformationMessage("Specify the absolute path to the product with the Path attribute of the launch.json file.");
				let platform = os.type();
				if(platform === 'Windows_NT'){
					productPath = await vscode.window.showInputBox({placeHolder: "Specify the absolute path for the product. For example, C://Program Files//Autodesk//AutoCAD//acad.exe."});
				}
				else if(platform === 'Darwin'){
					productPath = await vscode.window.showInputBox({placeHolder: "Specify the absolute path for the product. For example, /Applications/Autodesk/AutoCAD.app/Contents/MacOS/AutoCAD."});
				}
				else{
					productPath = await vscode.window.showInputBox({placeHolder: "Specify the absolute path for the product."});
				}
			}
			//3. get acad startup params
			if (!existsSync(productPath)) {
				if (!productPath || productPath.length == 0)
					vscode.window.showErrorMessage("AutoCAD " + strNoACADerr);
				else
					vscode.window.showErrorMessage(productPath + " " + strNoACADerr);
				ProcessPathCache.globalProductPath = "";
				return undefined;
			} else {
				let params = "";
				if (config["attributes"])
					params = config["attributes"]["params"] ? config["attributes"]["params"] : "";
				ProcessPathCache.globalParameter = params;
			}
			//4. get debug adapter path
			let lispadapterpath = calculateABSPathForDAP(productPath);
			if (!existsSync(lispadapterpath)) {
				vscode.window.showErrorMessage(lispadapterpath + " " + strNoADPerr);
				ProcessPathCache.globalProductPath = "";
				return undefined;
			}
			ProcessPathCache.globalLispAdapterPath = lispadapterpath;
			ProcessPathCache.globalProductPath = productPath;
		}
		return config;
	}

	dispose() {
		if (this._server) {
			this._server.close();
		}
	}
}

class LispAttachConfigurationProvider implements vscode.DebugConfigurationProvider {

	private _server?: Net.Server;

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {

		// if launch.json is missing or empty
       if (need2AddDefaultConfig(config)) {
                config.type = attachCfgType;
                config.name = attachCfgName;
                config.request = attachCfgRequest;
        }

        if (vscode.window.activeTextEditor)
            config.program = vscode.window.activeTextEditor.document.fileName;

		ProcessPathCache.clearProductProcessPathArr();
        let processId = await pickProcess(false, acadPid2Attach);
		if (!processId) {
			return vscode.window.showInformationMessage("No process for which to attach could be found.").then(_ => {
				return undefined;	// abort attach
			});
		}
		ProcessPathCache.chooseProductPathByPid(parseInt(processId));
		let lispadapterpath = calculateABSPathForDAP(ProcessPathCache.globalProductPath);
		if (!existsSync(lispadapterpath)) {
			vscode.window.showErrorMessage(lispadapterpath + " " + strNoADPerr);
			ProcessPathCache.globalProductPath = "";
			return undefined;
		}
		ProcessPathCache.globalLispAdapterPath = lispadapterpath;
		config.processId = processId;

        return config;
	}

	dispose() {
		if (this._server) {
			this._server.close();
		}
	}
}