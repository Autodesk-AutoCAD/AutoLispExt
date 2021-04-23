import * as vscode from "vscode";
import * as nls from "vscode-nls";
import * as Resources from "./resources";
import { Disposable } from 'vscode-languageclient';
import { DocumentManager } from './documents';


export class ContextManager{
	private _ctx: vscode.ExtensionContext;
	private _docManager: DocumentManager;
	
	
	get Context(): vscode.ExtensionContext { 
		return this._ctx; 
	}
	get Documents(): DocumentManager { 
		return this._docManager; 
	}
	get Selectors(): typeof DocumentManager.Selectors { 
		return DocumentManager.Selectors; 
	}
	get AllSelectors(): string[] { 
		return [DocumentManager.Selectors.lsp, DocumentManager.Selectors.dcl, DocumentManager.Selectors.prj]; 
	}
	get Subscriptions(): Disposable[] { 
		return this._ctx ? this._ctx.subscriptions : null; 
	}
	get ExtPath(): string { 
		return this._ctx ? this._ctx.extensionPath : ""; 
	}
	get Resources() { 
		return Resources; 
	}

	
	initialize(context: vscode.ExtensionContext): void {
		this._ctx = context;
		this._docManager = new DocumentManager();
	}
}