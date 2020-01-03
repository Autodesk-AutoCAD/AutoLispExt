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


import { DiagnosticsCtrl } from './diagnosticsCtrl';
import { onUriRequested } from './uriHandler';

import * as formatProviders from './format/formatProviders'
import * as autoCompletionProvider from "./completion/autocompletionProvider"
import * as statusBar from "./statusbar"
import * as autoIndent from './format/autoIndent'

import * as DebugProviders from "./debug"

let client: LanguageClient;

autoCompletionProvider.readAllBultinFunctions();

export function activate(context: vscode.ExtensionContext) {

	//-----------------------------------------------------------
	//1. lisp autoformat
	//-----------------------------------------------------------
	autoIndent.subscribeOnEnterEvent(); //auto indent

	formatProviders.registerDocumentFormatter();
	formatProviders.registeSelectionFormatter();

	autoCompletionProvider.registerAutoCompletionProviders();

	//-----------------------------------------------------------
	//2. lisp load button
	//-----------------------------------------------------------
	statusBar.registerLoadLispButton(context);

	//-----------------------------------------------------------
	//3. runtime diagnostics
	//-----------------------------------------------------------
	DiagnosticsCtrl.initDiagnostic();

	//-----------------------------------------------------------
	//4. debug adapter
	DebugProviders.registerLispDebugProviders(context);

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

