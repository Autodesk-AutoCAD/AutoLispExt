
'use strict';
import * as vscode from 'vscode';

import {
	LanguageClient
} from 'vscode-languageclient';


import * as Diagnostics from './diagnosticsCtrl';
import { onUriRequested } from './uriHandler';

import * as formatProviders from './format/formatProviders';
import * as autoCompletionProvider from "./completion/autocompletionProvider";
import * as statusBar from "./statusbar";
import * as autoIndent from './format/autoIndent';
import * as DebugProviders from "./debug";
import { registerProjectCommands } from "./project/projectCommands";
import { registerCommands } from "./commands";
import { AutoLispExt } from "./context";
import * as nls from 'vscode-nls';
import { AutoLispDocumentSymbolProvider } from './providers/lspSymbolProvider';
import { DclDocumentSymbolProvider } from './providers/dclSymbolProvider';

// The example uses the file message format.
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	AutoLispExt.initialize(context);	
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
	Diagnostics.registerDiagnosticHandler(context);

	//-----------------------------------------------------------
	//4. debug adapter
	DebugProviders.registerLispDebugProviders(context);

 	//-----------------------------------------------------------
    //5. register the handler to uri scheme: vscode://autodesk.autolispext?......
    vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri) {
            onUriRequested(uri);
        }
	});
	
	//-----------------------------------------------------------
	//6. register commands
	registerProjectCommands(context);
	registerCommands(context);

    // Register the Document Symbol Provider for AutoLISP files
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'autolisp' },
            new AutoLispDocumentSymbolProvider()
        )
    );
	// Register the symbol provider for DCL files
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            { language: 'dcl' }, 
            new DclDocumentSymbolProvider()
        )
    );
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
