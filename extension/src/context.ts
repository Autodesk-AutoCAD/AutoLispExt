import * as vscode from "vscode";
import * as resources from "./resources";
import { Disposable } from 'vscode-languageclient';
import { DocumentManager } from './documents';
import {DocumentServices} from "./services/documentServices";
import { WebHelpLibrarySingleton } from './help/documentationLibrary';

let _instance: ContextManager;

export class ContextManager{
	private _ctx: vscode.ExtensionContext;
	private _docManager: DocumentManager;
	private _init: boolean;
	private readonly _temp: Disposable[];

	private constructor() {
		this._init = false;
		this._temp = [];
	}

	static get Instance(): ContextManager {
		if (_instance) {
			return _instance;
		}
		return _instance = new ContextManager();
	}
	
	get Context(): vscode.ExtensionContext { 
		return this._ctx; 
	}
	get Documents(): DocumentManager { 
		return this._docManager;
	}
	get Selectors(): typeof DocumentServices.Selectors {
		return DocumentServices.Selectors;
	}
	get AllSelectors(): string[] { 
		return [DocumentServices.Selectors.LSP, DocumentServices.Selectors.DCL, DocumentServices.Selectors.PRJ];
	}
	get Subscriptions(): Disposable[] {
		if (this._temp.length > 0 && this._ctx){
			this._ctx.subscriptions.push(...this._temp);
			this._temp.length = 0;
		}
		return this._ctx ? this._ctx.subscriptions : this._temp;
	}
	get ExtPath(): string { 
		return this._ctx ? this._ctx.extensionPath : ""; 
	}
	get Resources() { 
		return resources;
	}
	get WebHelpLibrary() {
		return WebHelpLibrarySingleton.Instance;
	}

	
	initialize(context: vscode.ExtensionContext): void {
		if (!this._init) {
			this._ctx = context;
		}
		this._docManager = DocumentManager.Instance;
		if (!resources.isLoaded)
			resources.loadAllResources();
	}
}

export const AutoLispExt: ContextManager = ContextManager.Instance;