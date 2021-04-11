
import * as vscode from 'vscode';
import { ReadonlyDocument } from "./project/readOnlyDocument";
import { AutoLispExt } from './extension';
import { ProjectTreeProvider  } from "./project/projectTree";
import * as fs from	'fs-extra';
import { glob } from 'glob';


enum Origins {
	OPENED,
	WSPACE,
	PROJECT
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
	
	// The _delayedGlobEvent variable holds a function to be ran after a duration and having a value compensates for filewatcher actions firing
	// multiple times before and after the internal contents have actually changed. The updateExcludes() function nulls this value on completion
	private _delayedGlobEvent = null;
	private _excludes: Array<string> = [];

	get ExcludedFiles(): Array<string> {
		// spread the array to make sure outside influences can't actually change its values.
		return [...this._excludes];
	}
	
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
			const key = this.documentConsumeOrValidate(vscode.window.activeTextEditor.document, Origins.OPENED);			
			return this._cached.get(key)?.internal;
		} else {
			return null;
		}		
	}
	
	get ActiveTextDocument(): vscode.TextDocument { 
		return vscode.window.activeTextEditor?.document;
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
				result.push(this.normalizePath(x.filePath));
			});
		}
		return result;
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
	
	// This function is called once on startup, but again by relevant workspace events using the bind(this) to maintain proper context
	private updateExcludes() {
		this._excludes = [];
		const wsExcludes = AutoLispExt.Resources.getWorkspaceExcludeGlobs();
		wsExcludes.forEach(entry => {
			if (entry.excluded) {
				glob(entry.glob, { cwd: entry.root, nocase: true, realpath: true }, (err, mlst) => {
					if (!err) {
						this._excludes.push(...mlst.map(p => this.normalizePath(p)));
					}
				});
			}
		});
		// Nulling this value informs the bind(this) workspace events they are allowed to queue up the event again.
		this._delayedGlobEvent = null;
	}

	private normalizePath(path: string): string {
		return path.replace(/\//g, '\\');
	}

	private tryUpdateInternal(sources: DocumentSources){
		if (sources.native && (!sources.internal || !sources.internal.equal(sources.native))) {
			sources.internal = ReadonlyDocument.getMemoryDocument(sources.native);
		}
	}

	private pathConsumeOrValidate(path: string, flag: Origins): string {
		const key = this.normalizePath(path);		
		if (fs.existsSync(key) && this.getSelectorType(key) === DocumentManager.Selectors.lsp) {
			if (this._cached.has(key) === false) {
				const sources = DocumentSources.create(flag, ReadonlyDocument.open(key));
				this._cached.set(key, sources);
			} else {
				const sources = this._cached.get(key);				
				this.tryUpdateInternal(sources);
				sources.flags.add(flag);
			}
			return key;
		} else {
			return '';
		}
	}

	private documentConsumeOrValidate(doc: vscode.TextDocument, flag: Origins, key?: string): string {
		if (!key){
			key = this.normalizePath(doc.fileName);
		}
		if (this.getSelectorType(key) === DocumentManager.Selectors.lsp){
			if (this._cached.has(key) === false) {
				const sources = DocumentSources.create(flag, doc);
				this._cached.set(key, sources);
			} else {
				const sources = this._cached.get(key);
				sources.native = doc;
				this.tryUpdateInternal(sources);
				sources.flags.add(flag);
			}
			return key;
		} else {
			return '';
		}
	}

	getDocument(nDoc: vscode.TextDocument): ReadonlyDocument {
		const key = this.documentConsumeOrValidate(nDoc, Origins.OPENED);			
		return this._cached.get(key)?.internal;
	}	

	// Gets an array of PRJ ReadonlyDocument references, but verifies the content is based on a vscode.TextDocument's when available
	private getProjectDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		if (ProjectTreeProvider.hasProjectOpened()) {
			this.projectKeys.forEach(key => {
				this.pathConsumeOrValidate(key, Origins.PROJECT);
				if (this._cached.has(key)){
					result.push(this._cached.get(key).internal);
				}
			});
		}
		return result;
	}

	// Gets an array of ReadonlyDocument references representing Origins.OPENED, but verifies the content is based on the native vscode.TextDocument
	// When the internal & native documents match in content the existing version is returned, but will be regenerated if they are not
	private getOpenedAsReadonlyDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		this.cacheKeys.forEach(key => {
			const sources = this._cached.get(key);
			if (sources.native && sources.flags.has(Origins.OPENED)){
				this.tryUpdateInternal(sources);
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
				this.tryUpdateInternal(sources);
				if (!sources.internal) {
					sources.internal = ReadonlyDocument.open(key);
				}
				result.push(sources.internal);
			}
		});
		return result;
	}

	// Creates the FileSystemWatcher's & builds a workspace blueprint
	private initialize(): void {
		this._watchers.forEach(w => {
			w.dispose();
		});
		this._watchers.length = 0;
		
		// load current workspace file.exclude & search.exclude settings glob targets
		this.updateExcludes();

		// Grab the opened document (if available) and add it as our first known opened document
		//		It is important to start tracking this early because we can't actually see what is opened by VSCode during its internal workspace reload.
		//		Our first opportunity to capture these previously opened documents is when they are activated. **Unavoidable Technical Debt that needs future resolution**
		if (vscode.window.activeTextEditor && this.getSelectorType(vscode.window.activeTextEditor.document.fileName) === DocumentManager.Selectors.lsp) {
			this.documentConsumeOrValidate(vscode.window.activeTextEditor.document, Origins.OPENED);
		}

		// This builds the '_workspace' *.LSP Memory Document placeholder set
		// 		This feature does make the "fair assumption" that AutoCAD machines have plenty of memory to be holding all this information
		// 		The impact of creating read-only documents was stress tested with a root workspace folder containing 10mb of *.LSP files
		//		and the memory footprint from just the ReadonlyDocument's increased the memory (sustained) by less than 50mb		
		vscode.workspace.findFiles("**").then((items: vscode.Uri[]) => {
			items.forEach((fileUri: vscode.Uri) => {	
				this.pathConsumeOrValidate(fileUri.fsPath, Origins.WSPACE);
			});
		});


		if (ProjectTreeProvider.hasProjectOpened()) {
			this.projectKeys.forEach(key => {
				this.pathConsumeOrValidate(key, Origins.PROJECT);
			});
		}
		
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
				const key = this.normalizePath(e.fsPath);
				const prjs = this.projectKeys;
				if (this._cached.has(key)){
					const sources = this._cached.get(key);
					if (prjs.includes(key) || sources.flags.has(Origins.OPENED)){
						this._cached.delete(key);
					} else {
						sources.flags.delete(Origins.WSPACE);
					}	
				}
			}));
		
	
			AutoLispExt.Subscriptions.push(watcher.onDidCreate((e: vscode.Uri) => {
				const key = this.normalizePath(e.fsPath);
				this.pathConsumeOrValidate(key, Origins.WSPACE);
				// New files require the file.exclude & search.exclude settings to be re-evaluated
				if (this._delayedGlobEvent === null) {	
					this._delayedGlobEvent = this.updateExcludes;				
					setTimeout(this._delayedGlobEvent.bind(this), 3000);
				}
			}));
	
			AutoLispExt.Subscriptions.push(watcher.onDidChange((e: vscode.Uri) => {
				const key = this.normalizePath(e.fsPath);
				this.pathConsumeOrValidate(key, Origins.WSPACE);
				if (e.fsPath.toUpperCase().endsWith('SETTINGS.JSON') && this._delayedGlobEvent === null) {	
					this._delayedGlobEvent = this.updateExcludes;				
					setTimeout(this._delayedGlobEvent.bind(this), 3000);
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

		/////////////////////// The extension appears to reset after every workspace change and this wasn't doing anything ///////////////////////
		// AutoLispExt.Subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async (e: vscode.WorkspaceFoldersChangeEvent) => {
		// 	this.initialize();
		// }));
		
		// Create FileSystemWatcher's & build the workspace blueprint
		this.initialize();

		AutoLispExt.Subscriptions.push(vscode.workspace.onDidCloseTextDocument((e: vscode.TextDocument) => {
			const source = this._cached.get(this.normalizePath(e.fileName));
			source?.flags.delete(Origins.OPENED);
		}));
	
		AutoLispExt.Subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
			this.documentConsumeOrValidate(e, Origins.OPENED);
		}));

		// Note: if the file is already opened and deleted through the workspace, it is deleted AND closed.
		AutoLispExt.Subscriptions.push(vscode.workspace.onDidDeleteFiles((e: vscode.FileDeleteEvent) => {
			e.files.forEach(file => {
				const key = this.normalizePath(file.fsPath);
				if (this._cached.has(key)) {
					this._cached.delete(key);
				}
			});
		}));
	} // End of DocumentManger Constructor
}


export namespace DocumentManager{
	export enum Selectors {
		lsp = "autolisp",
		dcl = "autolispdcl",
		prj = "autolispprj"
	}
}