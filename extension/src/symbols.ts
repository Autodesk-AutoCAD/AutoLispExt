import * as vscode from 'vscode';
import { ILispFragment, LispContainer } from './format/sexpression';
import { ReadonlyDocument } from './project/readOnlyDocument';
import { DocumentServices } from './services/documentServices';
import { SymbolServices } from './services/symbolServices';
import { LispContainerServices } from './services/lispContainerServices';


export namespace SymbolManager {
	
	// central repo for all symbol caches, the document manager was tied into
	// this data source, but is a separate data source we don't want to embed in
	// the ReadOnlyDocument or the already heavily bloated document manager.
	const _definedCache: Map<string, RootSymbolMapHost> = new Map();

	export function updateOrCreateSymbolMap(doc: ReadonlyDocument, forceUpdate: boolean): string {
		const key = DocumentServices.normalizeFilePath(doc.fileName);
		const active = vscode.window.activeTextEditor?.document?.fileName;
		const doUpdate = forceUpdate 
			  // If the requested symbol map does not exist, or does exists, but probably disposed
			  || !_definedCache.get(key)?.isValid
			  // If the requested symbol map represents the active document, then require accuracy
			  || (active && DocumentServices.normalizeFilePath(active) === key);
		if (doUpdate) {
			if (_definedCache.get(key)) {
				_definedCache.get(key).dispose();
			}
			_definedCache.set(key, new RootSymbolMapHost(key, doc.documentContainer));
		}
		return key;
	}

	export function invalidateSymbolMapCache(): number {
		try {
			_definedCache.forEach(root => {
				root.dispose();
			});
			return [..._definedCache.keys()].length;	
		} finally {
			_definedCache.clear();	
		}
	}

	export function getSymbolMap(doc: ReadonlyDocument, forceUpdate: boolean = false): RootSymbolMapHost {
		const key = updateOrCreateSymbolMap(doc, forceUpdate);
		return _definedCache.get(key);
	}
}







export interface ISymbolBase extends vscode.Disposable {
	readonly filePath: string;
	readonly hasId: boolean;
	readonly parent: ISymbolHost|null;
	readonly range: vscode.Range;
	readonly id?: string;
	readonly asHost?: AnonymousSymbolHost;
	readonly asReference?: NamedSymbolReference;
	equal(obj: ISymbolBase): boolean;
}

export interface ISymbolReference extends ISymbolBase {
	readonly id: string;	
	readonly flatIndex: number;
	readonly isLocalization: boolean;
	readonly isDefinition: boolean;
	findLocalizingParent(): ISymbolHost;
}

export interface ISymbolHost extends ISymbolBase {
	readonly items: Array<ISymbolBase>;
	readonly named: ISymbolReference|null;
	readonly isValid: boolean;
	collectAllSymbols(allSymbols?: Map<string, Array<ISymbolReference>>): Map<string, Array<ISymbolReference>>;
	findLocalizingParent(key: string): ISymbolHost;
}













class NamedSymbolReference implements ISymbolReference {
	id: string;
	flatIndex: number;	
	filePath: string;
	parent: ISymbolHost;
	range: vscode.Range;
	isLocalization: boolean;
	isDefinition: boolean;

	get hasId() { return true; }
	get asHost() { return null; }
	get asReference() { return this; }

	constructor(owner: ISymbolHost, fsPath: string, atom: ILispFragment) {
		this.id = atom.symbol.toLowerCase();
		this.flatIndex = atom.flatIndex;
		this.range = atom.getRange();
		this.filePath = fsPath;
		this.parent = owner;
		this.isLocalization = false;
		this.isDefinition = false;
	}

	withLocalFlag(): NamedSymbolReference {
		this.isLocalization = true;
		return this;
	}
	
	withDefunFlag(): NamedSymbolReference {
		this.isDefinition = true;
		return this;
	}

	dispose(): void {
		delete this.range;
		delete this.parent;
	}

	equal(obj: ISymbolBase): boolean {
		if (obj instanceof NamedSymbolReference) {
			return this.filePath === obj.filePath && this.flatIndex === obj.flatIndex;
		}
		return false;
	}


	findLocalizingParent(): ISymbolHost {		
		return this.parent.findLocalizingParent(this.id);
	}
}















const localizers = ['defun', 'defun-q', 'lambda', 'foreach', 'vlax-for'];
class AnonymousSymbolHost implements ISymbolHost {
	filePath: string;
	parent: ISymbolHost;
	range: vscode.Range;
	items: Array<ISymbolBase>;
	named: ISymbolReference;
	private _disposed: boolean;
	get hasId() { return false; }
	get asHost() { return this; }
	get asReference() { return null; }
	get isValid() { return !this._disposed; }
	
	
	constructor(owner: ISymbolHost, fsPath: string, source: LispContainer, isProcessedBySubClass = false) {
		this._disposed = false;
		this.items = [];
		this.parent = owner;
		this.filePath = fsPath;
		this.named = null;
		this.range = source.getRange();		
		if (isProcessedBySubClass) {
			return;
		}
		const header = source.getNthKeyAtom(1);
		this.processLocalizationHeader(header);
		this.aggregateContainer(source, header);
	}

	dispose(): void {
		if (!this._disposed) {
			if (this.named) {
				this.named.dispose();
				delete this.named;
			}

			this.items.forEach(item => {
				item.dispose();
			});			
			this.items.length = 0;
			
			delete this.range;
			delete this.parent;
			
			this._disposed = true;
		}
	}

	equal(obj: ISymbolBase): boolean {
		if (obj instanceof AnonymousSymbolHost) {
			return this.filePath === obj.filePath && this.range.isEqual(obj.range);
		}
		return false;
	}

	protected processLocalizationHeader(source: ILispFragment) {
		if (source instanceof LispContainer) {
			// Is defun, defun-q or lambda
			source.atoms.forEach(item => {
				if (!item.isPrimitive() && !SymbolServices.isNative(item.symbol.toLowerCase())) {
					this.items.push(new NamedSymbolReference(this, this.filePath, item).withLocalFlag());
				}
			});
		} else if (!source.isPrimitive() && !SymbolServices.isNative(source.symbol.toLowerCase())) {
			// Is foreach or vlax-for
			this.items.push(new NamedSymbolReference(this, this.filePath, source).withLocalFlag());
		}
		// else somebody probably used 'nil' for the localization area and which is valid in some scenarios
	}

	protected aggregateContainer(source: LispContainer, after?: ILispFragment) : void {
		let doWork = after === undefined;
		source.atoms.forEach(item => {
			if (!doWork) {
				doWork = item.line === after.line && item.column === after.column;
			} else if (item instanceof LispContainer) {				
				const name = LispContainerServices.getLispContainerTypeName(item);
				if (name === localizers[0] || name === localizers[1]) { 
					// Is defun or defun-q
					this.items.push(new NamedSymbolHost(this, this.filePath, item));
				} else if (localizers.includes(name)) {
					// Is lambda, foreach or vlax-for
					this.items.push(new AnonymousSymbolHost(this, this.filePath, item));
				} else {
					// non localizing LispContainer
					this.aggregateContainer(item);
				}
			} else if (!item.isPrimitive() && !SymbolServices.isNative(item.symbol.toLowerCase())) {
				this.items.push(new NamedSymbolReference(this, this.filePath, item));
			}
		});
	}

	collectAllSymbols(allSymbols?: Map<string, Array<ISymbolReference>>): Map<string, Array<ISymbolReference>> {
		let isRequestRoot = false;
		if (allSymbols === undefined) {
			allSymbols = new Map();
			isRequestRoot = true;
		}
		this.items.forEach(sym => {
			if (sym instanceof NamedSymbolHost) {
				if (allSymbols.has(sym.id)) {
					allSymbols.get(sym.id).push(sym.named);
				} else {
					allSymbols.set(sym.id, [sym.named]);
				}
			}
			if (sym.asHost) {
				sym.asHost.collectAllSymbols(allSymbols);
			} else if (sym.asReference) {
				if (allSymbols.has(sym.id)) {
					allSymbols.get(sym.id).push(sym.asReference);
				} else {
					allSymbols.set(sym.id, [sym.asReference]);
				}
			}
		});
		if (isRequestRoot) {
			return allSymbols;
		} else {
			return;
		}
	}

	findLocalizingParent(key: string): ISymbolHost {
		for (let i = 0; i < this.items.length; i++) {
			const symbol = this.items[i];
			if (symbol.id === key && symbol.asReference?.isLocalization) {
				return this;
			}
		}
		return this.parent?.findLocalizingParent(key);
	}
}


class NamedSymbolHost extends AnonymousSymbolHost {	
	get hasId() { return true; }
	get id() { return this.named.id; }
	
	constructor(owner: ISymbolHost, fsPath: string, source: LispContainer) {
		super(owner, fsPath, source, true);
		this.named = new NamedSymbolReference(this, fsPath, source.getNthKeyAtom(1)).withDefunFlag();
		const header = source.getNthKeyAtom(2);
		this.processLocalizationHeader(header);
		this.aggregateContainer(source, header);
	}
}


export class RootSymbolMapHost extends AnonymousSymbolHost {
	constructor(fsPath: string, source: LispContainer) {
		super(null, fsPath, source, true);
		this.aggregateContainer(source);
	}

	findLocalizingParent(key: string): ISymbolHost {
		return this;
	}
}


