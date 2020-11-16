
import * as vscode from 'vscode';
import { ReadonlyDocument } from "./project/readOnlyDocument";
import { AutoLispExt } from './extension';
import { ProjectTreeProvider  } from "./project/projectTree";


enum Origins {
	OPENED = 'O',
	WSPACE = 'W',
	PROJECT = 'P'
}


interface DocumentSources {
	native: vscode.TextDocument;
	internal: ReadonlyDocument;
	flags: Set<Origins>;
}


namespace DocumentSources{
	export function create(source: Origins, path: string): DocumentSources;
	export function create(source: Origins, nDoc: vscode.TextDocument): DocumentSources;
	export function create(source: Origins, iDoc: ReadonlyDocument): DocumentSources;
	export function create(source: Origins, context: vscode.TextDocument|ReadonlyDocument|string): DocumentSources {
		if (context instanceof ReadonlyDocument) {
			return { native: null, internal: context, flags: new Set([source]) };
		} else if (typeof(context) === 'string') {
			return { native: null, internal: ReadonlyDocument.open(context), flags: new Set([source]) };
		} else {
			return { native: context, internal: ReadonlyDocument.getMemoryDocument(context), flags: new Set([source]) };
		}
	}
}

export class DocumentManager{	
	private _cached: Map<string, DocumentSources> = new Map();
	private _watchers: vscode.FileSystemWatcher[] = [];
	
	get OpenedDocuments(): ReadonlyDocument[] { 
		return this.getOpenedAsReadonlyDocuments(); 
	}
	get WorkspaceDocuments(): ReadonlyDocument[] { 
		return this.getWorkspaceDocuments(); 
	}
	get ProjectDocuments(): ReadonlyDocument[] { 
		return this.getProjectDocuments(); 
	}
	get ActiveDocument(): ReadonlyDocument { 
		if (vscode.window.activeTextEditor) {
			const key = vscode.window.activeTextEditor.document.fileName.replace(/\//g, '\\');
			if (this._cached.has(key)){
				const sources = this._cached.get(key);
				if (!sources.native) {
					sources.native = vscode.window.activeTextEditor.document;
					sources.flags.add(Origins.OPENED);
				}
				if (!sources.internal || !sources.internal.equal(sources.native)){
					sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
				}
				return sources.internal;
			} else {
				const sources = DocumentSources.create(Origins.OPENED, vscode.window.activeTextEditor.document);
				this._cached.set(key, sources);
				return sources.internal;
			}
		} else {
			return null;
		}		
	}
	
	get ActiveTextDocument(): vscode.TextDocument { 
		return vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document :  null; 
	}
	get OpenedTextDocuments(): vscode.TextDocument[] { 
		return [...this._cached.values()]
			   .filter(p => p.native && p.flags.has(Origins.OPENED))
			   .map(p => p.native); 
	}

	private get cacheKeys(): string [] {
		return [...this._cached.keys()];
	}
	private get projectKeys(): string[] {
		const result: string[] = [];
		if (ProjectTreeProvider.hasProjectOpened()){
			ProjectTreeProvider.instance().projectNode.sourceFiles.forEach(x => {
				result.push(x.filePath.replace(/\//g, '\\'));
			});
		}
		return result;
	}

	getDocument(nDoc: vscode.TextDocument) {
		const key = nDoc.fileName.replace(/\//g, '\\');
		if (this._cached.has(key)) {
			const sources = this._cached.get(key);
			sources.native = nDoc;
			if (!sources.internal || !sources.internal.equal(sources.native)){
				sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
			}
			return sources.internal;
		} else {
			this._cached.set(key, DocumentSources.create(Origins.OPENED, nDoc));
		}
	}

	// General purpose methods for identifying the scope of work for a given document type
	getSelectorType(fspath: string): string { 
		return DocumentManager.getSelectorType(fspath); 
	}
	public static getSelectorType(fspath: string): string {
		if (fspath) {
			const ext: string = fspath.toUpperCase().slice(-4);
			switch (ext) {
				case ".LSP": return DocumentManager.Selectors.lsp;
				case ".MNL": return DocumentManager.Selectors.lsp;
				case ".PRJ": return DocumentManager.Selectors.prj;
				case ".DCL": return DocumentManager.Selectors.dcl;
				default: return "";
			}
		} else {
			return "";
		}
	}

	// Gets an array of PRJ ReadonlyDocument references, but verifies the content is based on a vscode.TextDocument's when available
	private getProjectDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		if (ProjectTreeProvider.hasProjectOpened()) {
			this.projectKeys.forEach(key => {
				if (this._cached.has(key)){
					const sources = this._cached.get(key);
					sources.flags.add(Origins.PROJECT);
					if (sources.native && !sources.internal.equal(sources.native)){
						sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
					}
					result.push(sources.internal);
				} else {
					const sources = DocumentSources.create(Origins.PROJECT, key);
					this._cached.set(key, sources);
					result.push(sources.internal);
				}
			});
		}
		return result;
	}


	
	// Gets an array of ReadonlyDocument references representing Origins.OPENED, but verifies the content is based on the native vscode.TextDocument
	// When the internal & native documents match in content the existing version is returned, but will be regenerated if they are not
	private getOpenedAsReadonlyDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		[...this._cached.keys()].forEach(key => {
			const sources = this._cached.get(key);
			if (sources.native && sources.flags.has(Origins.OPENED)){
				if (!sources.internal || !sources.internal.equal(sources.native)){
					sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
				}
				result.push(sources.internal);
			}
		});
		return result;
	}

	// Gets a complete ReadonlyDocuments representing the workspace, but will update cached internal versions if it is out of sync with an available vscode.TextDocument
	private getWorkspaceDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		this.cacheKeys.forEach(key => {
			const sources = this._cached.get(key);
			if (sources.flags.has(Origins.WSPACE)) {
				if (sources.native && (!sources.internal || !sources.internal.equal(sources.native))){
					sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
				} else if (!sources.internal) {
					sources.internal = ReadonlyDocument.open(key);
				}
				result.push(sources.internal);
			}
		});
		return result;
	}

	// Creates the FileSystemWatcher's & builds a workspace blueprint
	private initialize(): void {
		const shouldExist: string[] = [];
		this._watchers.forEach(w => {
			w.dispose();
		});
		this._watchers.length = 0;

		// Grab the opened document (if available) and add it as our first known opened document
		//		It is important to start tracking this early because we can't actually see what is opened by VSCode during its internal workspace reload.
		//		Our first opportunity to capture these previously opened documents is when they are activated. **Unavoidable Technical Debt that needs future resolution**
		if (vscode.window.activeTextEditor && this.getSelectorType(vscode.window.activeTextEditor.document.fileName) === DocumentManager.Selectors.lsp) {
			const key = vscode.window.activeTextEditor.document.uri.fsPath.replace(/\//g, '\\');
			const nDoc = vscode.window.activeTextEditor.document;	
			shouldExist.push(key);		
			if (this._cached.has(key)){
				const sources = this._cached.get(key);
				sources.native = nDoc;
				sources.flags.add(Origins.OPENED);
				if (!sources.internal || !sources.internal.equal(nDoc)) {
					sources.internal = ReadonlyDocument.getMemoryDocument(nDoc);
				}
			} else {
				this._cached.set(key, DocumentSources.create(Origins.OPENED, nDoc));
			}
		}

		// This builds the '_workspace' *.LSP Memory Document placeholder set
		// 		This feature does make the "fair assumption" that AutoCAD machines have plenty of memory to be holding all this information
		// 		The impact of creating read-only documents was stress tested with a root workspace folder containing 10mb of *.LSP files
		//		and the memory footprint from just the ReadonlyDocument's increased the memory (sustained) by less than 50mb		
		vscode.workspace.findFiles("**").then((items: vscode.Uri[]) => {
			items.forEach((fileUri: vscode.Uri) => {	
				const key = fileUri.fsPath.replace(/\//g, '\\');		
				if (this.getSelectorType(key) === DocumentManager.Selectors.lsp) {
					shouldExist.push(key);
					if (this._cached.has(key)){
						const source = this._cached.get(key);
						source.flags.add(Origins.WSPACE);
					} else {
						this._cached.set(key, DocumentSources.create(Origins.WSPACE, key));
					}
				}
			});
		});


		if (ProjectTreeProvider.hasProjectOpened()) {
			this.projectKeys.forEach(key => {
				shouldExist.push(key);
				if (this._cached.has(key)){
					const sources = this._cached.get(key);
					sources.flags.add(Origins.PROJECT);
					if (sources.native && !sources.internal.equal(sources.native)){
						sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
					}
				} else {
					const sources = DocumentSources.create(Origins.PROJECT, key);
					this._cached.set(key, sources);
				}
			});
		}


		/////////////////////// The extension appears to reset after every workspace change and this probably isn't really doing anything ///////////////////////
		this.cacheKeys.filter(k => !shouldExist.includes(k)).forEach(obsolete => {
			if (this._cached.has(obsolete)) {
				const context = this._cached.get(obsolete);
				if (!(context.native && context.flags.has(Origins.OPENED))) {
					this._cached.delete(obsolete);	
				}
			}
		});
		
		
		if (vscode.workspace.workspaceFolders) {
			this.setupFileSystemWatchers();
		}
	}

	// integral to the initialize() function but separated for clarity
	private setupFileSystemWatchers(): void {
		vscode.workspace.workspaceFolders.forEach(folder => {
			const pattern = new vscode.RelativePattern(folder, "**");
			const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

			AutoLispExt.Subscriptions.push(watcher.onDidDelete((e: vscode.Uri) => {
				const key = e.fsPath.replace(/\//g, '\\');
				if (this._cached.has(key)){
					if (this._cached.get(key).flags.has(Origins.OPENED) === false){
						this._cached.delete(key);
					} else {
						this._cached.get(key).flags.delete(Origins.WSPACE);
					}	
				}
			}));
		
	
			AutoLispExt.Subscriptions.push(watcher.onDidCreate((e: vscode.Uri) => {
				const key = e.fsPath.replace(/\//g, '\\');
				if (this.getSelectorType(key) === DocumentManager.Selectors.lsp) { 
					if (this._cached.has(key)) {
						const source = this._cached.get(key);
						source.flags.add(Origins.WSPACE);
						if (source.native && source.native.fileName.replace(/\//g, '\\') === key
						   && (!source.internal || !source.internal.equal(source.native))) {
							source.internal = ReadonlyDocument.getMemoryDocument(source.native);
						} else {
							source.internal = ReadonlyDocument.open(key);
						}
					} else {
						this._cached.set(key, DocumentSources.create(Origins.WSPACE, key));
					}
				}
			}));
	
			AutoLispExt.Subscriptions.push(watcher.onDidChange((e: vscode.Uri) => {
				const key = e.fsPath.replace(/\//g, '\\');
				if (this.getSelectorType(key) === DocumentManager.Selectors.lsp) { 
					if (this._cached.has(key) === false) {
						const source = this._cached.get(key);
						source.flags.add(Origins.WSPACE);
						if (source.native && source.native.fileName.replace(/\//g, '\\') === key
						   && (!source.internal || !source.internal.equal(source.native))) {
							source.internal = ReadonlyDocument.getMemoryDocument(source.native);
						} else {
							source.internal = ReadonlyDocument.open(key);
						}
					} else {
						this._cached.set(key, DocumentSources.create(Origins.WSPACE, key));
					}
				}
			}));

			this._watchers.push(watcher);
		});
	}

	constructor() {
		// The following test analysis is out of date, but still excellent documentation for what/why/when something is firing. 
		// For context, the original configuration used separate _opened and _workspace Map()'s to track documents and now we are using
		// a single _cached Map() with a more complex object to track pairs of ReadonlyDocument's & vscode.TextDocument's with a set of contextual flags.

		// **Unused vscode.workspace.onDid() Event Documentation**
		// 		onDidChangeConfiguration		Not Used and not tested
		// 		onDidChangeTextDocument			Unnecessary because this can only relate to opened documents and we already cached the vscode.TextDocument reference during onDidOpenTextDocument
		// 		onDidCreateFiles				These will get captured by the workspace.onDidOpenTextDocument event
		// 		onDidRenameFiles				These are captured by the onDidOpenTextDocument/onDidCloseTextDocument and/or the FileSystemWatcher.onDidCreate/onDidDelete events
		// 		onDidSaveTextDocument			Unnecessary because this can only relate to opened documents and we already cached the vscode.TextDocument reference during onDidOpenTextDocument
		
		// **Behavioral Documentation**
		// Scenario 1: Opened (workspace or non-workspace) *.LSP document
		// workspace.onDidOpenTextDocument
		//		Collects the TextDocument reference and add it to the _opened Map

		// Scenario 2: Close (workspace or non-workspace) *.LSP document
		// workspace.onDidCloseTextDocument 
		//		Remove the TextDocument from the _opened Map
		// 		Removed _workspace maintenance from this operation to properly separate concerns. We could update the ReadonlyDocument, but that represents very minimal overhead to reload it
		//			Any save operations by the UI would have already nulled the _workspace reference to cause a regeneration of its data.
		// 			Should the document gets re-opened later we'll start using the TextDocument again anyway.

		// Scenario 3: Create or Add file in workspace from OS File Manager
		// FileSystemWatcher.OnDidCreate
		//		If it is an LSP file, then add the fspath to the _workspace Map initialized to null

		// Scenario 4: Create file from workspace UI
		// workspace.onDidOpenTextDocument -> FileSystemWatcher.onDidCreate
		//		If it was an LSP, then the onDidOpenTextDocument will add the vscode.TextDocument object to the _opened Map
		//		The onDidCreate events only goal is to creates or updates the _workspace Map entry for this fspath initialized to null

		// Scenario 5: Delete opened file from workspace UI
		// workspace.onDidCloseTextDocument -> workspace.onDidDeleteFiles -> FileSystemWatcher.onDidDelete
		// 		The onDidCloseTextDocument will handle removing the _opened reference
		//		For some reason the first onDidDelete is a Uri to the root folder of the workspace. This is passively ignored by our system since it isn't a document.
		//		The onDidDelete removes the OLD fspath from the _workspace Map

		// Scenario 6: Delete closed file from workspace UI
		// workspace.onDidDeleteFiles -> FileSystemWatcher.onDidDelete
		//		For some reason the first onDidDelete is a Uri to the root folder of the workspace. This is passively ignored by our system since it isn't a document.
		//		The onDidDeleteFiles event would verify the fspath doesn't exist in the _opened Map. 
		//		The onDidDelete event would remove any *.LSP items from the _workspace Map

		// Scenario 7: Delete opened file from OS File Manager
		// FileSystemWatcher.onDidDelete
		// 		The vscode.TextDocument reference would remain in the _opened until the user closes it. 
		//			If they later save it, then it will re-enter the _workspace through the onDidCreate
		//		The onDidDelete will go ahead and purge the reference from the _workspace as intended

		// Scenario 8: Delete closed file from OS File Manager
		// FileSystemWatcher.onDidDelete
		//		The onDidDelete will go ahead and purge the reference from the _workspace as intended

		// Scenario 9: Edit/Save workspace file from outside of VSCode
		// FileSystemWatcher.onDidChange
		//		The onDidChange will null the fspath in the _workspace Map. Which would later get dynamically populated with current data when queried.
		//		If this file was opened, then VSCode would have reloaded its TextDocument representation for us anyway **VERIFIED**

		// Scenario 10: Edit/Save an opened workspace file from inside VSCode
		// FileSystemWatcher.onDidChange
		//		We already have the internal TextDocument object stored in our _opened Map, so letting onDidChange null the fspath in the _workspace Map is fine.
		//		Already having the TextDocument reference is why we aren't bothering to hook up an event triggers on workspace.onDidSaveTextDocument/workspace.onDidChangeTextDocument		

		// Scenario 11: Renamed opened workspace file from workspace UI
		// workspace.onDidOpenTextDocument -> workspace.onDidCloseTextDocument [-> workspace.onDidRenameFiles] -> FileSystemWatcher.onDidCreate -> FileSystemWatcher.onDidDelete
		//		The onDidOpenTextDocument event will add the NEW TextDocument object to the _opened Map
		//		The onDidCloseTextDocument event will delete the OLD TextDocument object from the _opened Map and erroneously update the _workspace ReadonlyDocument from the TextDocument
		//		The workspace.onDidRenameFiles was removed because it was deemed to be unnecessary by the prior 2 event calls
		//		The onDidCreate sets the NEW fspath to null in the _workspace Map
		//		The onDidDelete removes the OLD fspath from the _workspace Map

		// Scenario 12: Renamed closed workspace file from workspace UI - workspace.rename, fswCreate, fsw.Delete(2x the first is _workspace directory root for some reason)
		// workspace.onDidRenameFiles -> FileSystemWatcher.onDidCreate -> FileSystemWatcher.onDidDelete -> FileSystemWatcher.onDidDelete
		//		The onDidCreate sets the NEW fspath to null in the _workspace Map
		//		For some reason the first onDidDelete is a Uri to the root folder of the workspace. This is passively ignored by our system since it isn't a document.
		//		The onDidDelete removes the OLD fspath from the _workspace Map

		// Scenario 13: Renamed closed workspace file from OS File Manager - fswCreate, fsw.Delete
		// FileSystemWatcher.onDidCreate -> FileSystemWatcher.onDidDelete
		//		The onDidCreate sets the NEW fspath to null in the _workspace Map
		//		The onDidDelete removes the OLD fspath from the _workspace Map

		// Scenario 14: SaveAs opened non-workspace file from VSCode
		// workspace.onDidOpenTextDocument -> workspace.onDidCloseTextDocument 
		//		The onDidOpenTextDocument event will add the NEW TextDocument object to the _opened Map
		//		The onDidCloseTextDocument event will delete the OLD TextDocument object from the _opened Map
		
		// Create FileSystemWatcher's & build the workspace blueprint
		this.initialize();

		AutoLispExt.Subscriptions.push(vscode.workspace.onDidCloseTextDocument((e: vscode.TextDocument) => {
			const source = this._cached.get(e.fileName.replace(/\//g, '\\'));
			source?.flags.delete(Origins.OPENED);
		}));
	
		AutoLispExt.Subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
			if (this.getSelectorType(e.fileName) === DocumentManager.Selectors.lsp) {
				const key = e.fileName.replace(/\//g, '\\');
				if (this._cached.has(key)) {
					const source = this._cached.get(key);
					source.native = e;
					source.flags.add(Origins.OPENED);
				} else {
					this._cached.set(key, DocumentSources.create(Origins.OPENED, e));
				}
			}
		}));

		// Note: if the file is already opened and deleted through the workspace, it is deleted AND closed.
		AutoLispExt.Subscriptions.push(vscode.workspace.onDidDeleteFiles((e: vscode.FileDeleteEvent) => {
			e.files.forEach(file => {
				const key = file.fsPath.replace(/\//g, '\\');
				if (this._cached.has(key)) {
					this._cached.delete(key);
				}
			});
		}));

		/////////////////////// The extension appears to reset after every workspace change and this probably didn't do anything ///////////////////////
		// AutoLispExt.Subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async (e: vscode.WorkspaceFoldersChangeEvent) => {
		// 	this.initialize();
		// }));
	} // End of DocumentManger Constructor
}


export namespace DocumentManager{
	export enum Selectors {
		lsp = "autolisp",
		dcl = "autolispdcl",
		prj = "autolispprj"
	}
}