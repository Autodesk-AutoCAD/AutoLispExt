
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
import { AutoLispDocumentSymbolProvider } from './symbolProvider'; // Assuming you create this file

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
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

export class AutoLispDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        
        return new Promise((resolve, reject) => {
            const symbols: vscode.DocumentSymbol[] = [];
            
            // Regex to find AutoLISP function definitions, e.g., (defun C:MYCOMMAND ... )
            // This regex captures the function name.
            const functionRegex = /^\s*\(\s*defun\s+([a-zA-Z0-9_:-]+)/gim;

            const text = document.getText();
            let match;
            while ((match = functionRegex.exec(text)) !== null) {
                const functionName = match[1];
                const position = document.positionAt(match.index);
                const range = new vscode.Range(position, position); // Simple range

                const symbol = new vscode.DocumentSymbol(
                    functionName,
                    'Function', // Detail text shown in the outline
                    vscode.SymbolKind.Function,
                    document.lineAt(position.line).range, // The range of the entire line
                    document.lineAt(position.line).range // The range to select when clicking
                );

                symbols.push(symbol);
            }

            resolve(symbols);
        });
    }
}