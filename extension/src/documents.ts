
import * as vscode from 'vscode';
import { ReadonlyDocument } from "./project/readOnlyDocument";
import { AutoLispExt } from './extension';
import { ProjectTreeProvider  } from "./project/projectTree";


export class DocumentManager{	
	private _opened: Map<string, vscode.TextDocument> = new Map();
	private _workspace: Map<string, ReadonlyDocument> = new Map();
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
		return vscode.window.activeTextEditor ? ReadonlyDocument.getMemoryDocument(vscode.window.activeTextEditor.document) : undefined; 
	}
	
	get ActiveTextDocument(): vscode.TextDocument { 
		return vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document :  null; 
	}
	get OpenedTextDocuments(): vscode.TextDocument[] { 
		return [...this._opened.values()]; 
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

	// Gets an array of PRJ ReadonlyDocument references, but prefers vscode.TextDocument's as their source when available
	private getProjectDocuments(): ReadonlyDocument[] {
		if (ProjectTreeProvider.hasProjectOpened()) {
			return ProjectTreeProvider.instance().projectNode.sourceFiles.map(x => 
				this._opened.has(x.document.fileName) ? ReadonlyDocument.getMemoryDocument(this._opened.get(x.document.fileName)) : x.document
				);
		} else {
			return [];
		}
	}

	// Gets an array of ReadonlyDocument references representing the _opened Map, but uses the native vscode.TextDocument's as their data source to provide more accurate information
	private getOpenedAsReadonlyDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		this._opened.forEach(doc => {
			result.push(ReadonlyDocument.getMemoryDocument(doc));
		});
		return result;
	}

	// Gets a complete (data populated) set of ReadonlyDocuments representing the workspace, but it will prefer vscode.TextDocument data sources from the _opened Map when available
	private getWorkspaceDocuments(): ReadonlyDocument[] {
		const result: ReadonlyDocument[] = [];
		[...this._workspace.keys()].forEach(key => {
			if (this._opened.has(key)){
				result.push(ReadonlyDocument.getMemoryDocument(this._opened.get(key)));
			} else if (this._workspace.get(key) === null) {
				this._workspace.set(key, ReadonlyDocument.open(key));
				result.push(this._workspace.get(key) as ReadonlyDocument);
			} else {
				result.push(this._workspace.get(key));
			}
		});
		return result;
	}

	// Creates the FileSystemWatcher's & builds a workspace blueprint
	private initialize(): void {
		this._opened.clear();
		this._workspace.clear();
		this._watchers.forEach(w => {
			w.dispose();
		});
		this._watchers.length = 0;

		// Grab the opened document (if available) and add it as our first known opened document
		//		It is important to start tracking this early because we can't actually see what is opened by VSCode during its internal workspace reload.
		//		Our first opportunity to capture these previously opened documents is when they are activated. **Unavoidable Technical Debt that needs future resolution**
		if (vscode.window.activeTextEditor && this.getSelectorType(vscode.window.activeTextEditor.document.fileName) === DocumentManager.Selectors.lsp) {
			this._opened.set(vscode.window.activeTextEditor.document.uri.fsPath, vscode.window.activeTextEditor.document);
		}

		// This builds the '_workspace' *.LSP Memory Document placeholder set
		// 		This feature does make the "fair assumption" that AutoCAD machines have plenty of memory to be holding all this information
		// 		The impact of creating read-only documents was stress tested with a root workspace folder containing 10mb of *.LSP files
		//		and the memory footprint from the readonlyDocument's increased the memory (sustained) by less than 50mb		
		vscode.workspace.findFiles("**").then((items: vscode.Uri[]) => {
			items.forEach((fileUri: vscode.Uri) => {			
				if (this.getSelectorType(fileUri.fsPath) === DocumentManager.Selectors.lsp) {
					this._workspace.set(fileUri.fsPath, ReadonlyDocument.open(fileUri.fsPath));
				}
			});
		}).then(() => {
			AutoLispExt.Documents.WorkspaceDocuments.forEach(d => {
				// pre-caching the AtomsForest is a more significant memory jump because of its parent/child structure
				// However, on 10mb's of LSP's in the workspace, this is only about a 90mb sustained jump and adds a lot of performance
				// in other areas that makes this worth the cost to passively (non-blocking) pre-load the data.
				// Also note, generating the pre-atomsForest does cause a massive memory spike (500mb) until the workspace is fully loaded.
				d.updateAtomsForest();
			});
		}).then(() =>{
			let msg = AutoLispExt.localize("autolispext.workspace.fullyloaded", "Your workspace documents have fully loaded");
            vscode.window.showInformationMessage(msg);
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
				if (this._workspace.has(e.fsPath) === true) {
					this._workspace.delete(e.fsPath);
				}		
			}));
		
	
			AutoLispExt.Subscriptions.push(watcher.onDidCreate((e: vscode.Uri) => {
				if (this.getSelectorType(e.fsPath) === DocumentManager.Selectors.lsp) {
					if (this._workspace.has(e.fsPath) === false) {
						this._workspace.set(e.fsPath, null);
					}
				}
			}));
	
			AutoLispExt.Subscriptions.push(watcher.onDidChange((e: vscode.Uri) => {
				if (this._workspace.has(e.fsPath) === false) {
					this._workspace.set(e.fsPath, null);
				}
			}));

			this._watchers.push(watcher);
		});
	}

	constructor() {
		// **Event General Concepts**
		//		vscode.workspace.onDid() events are only concerned with maintaining the _opened Map
		//		FileSystemWatcher.onDid() events are only concerned with maintaining the _workspace Map
		//		The FSW Create/Change events arbitrarily add the fspath to the _workspace Map set to null. The insures that any underlying data changes will get reloaded at the next get() query.
		//		The ultimate goal of the _workspace Map is only to keep a complete set of fspath pointers to LSP files within the workspace.
		//			These pointers may not actually contain document content. If they've been queried since the last time they initialized or changed, then they have data, else they are null
		//			If they are null, then requesting the data will synchronously load/serve the contents as if it were there to begin with; this is expected to cause a single lag at the first occurrence
		//			As long as the FileSystemWatcher.OnDidChange doesn't fire on that fspath again, then they will persist data to be used for making GoTo & AutoCompletion extremely responsive
		
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
			if (this._opened.has(e.uri.fsPath) === true) {
				this._opened.delete(e.uri.fsPath);
			}
		}));
	
		AutoLispExt.Subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
			if (this.getSelectorType(e.fileName) === DocumentManager.Selectors.lsp) {
				this._opened.set(e.uri.fsPath, e);		
			}
		}));

		AutoLispExt.Subscriptions.push(vscode.workspace.onDidDeleteFiles((e: vscode.FileDeleteEvent) => {
			e.files.forEach(file => {
				if (this._opened.has(file.fsPath)) {
					this._opened.delete(file.fsPath);
				}
			});
		}));

		// This allows the system to hook back up in the desired way should the user add or remove a folder to the their workspace
		// If a user entirely closes and/or directly opens a different folder as their workspace, then our extensions essentially starts a new as if never activated
		AutoLispExt.Subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async (e: vscode.WorkspaceFoldersChangeEvent) => {			
			// backup the opened documents so their context can be persisted. These add/remove operations do not have the effect of closing open documents
			const openedBackup = [...this._opened.values()]; 
			// WorkspaceFoldersChangeEvent object tells us if it was added or removed, but it better to just reset all the events rather than make seemingly futile attempts to pick/choose
			this.initialize(); 
			// restore the _opened documents Map
			openedBackup.forEach(doc => { 
				if (!this._opened.has(doc.fileName)) {
					this._opened.set(doc.fileName, doc);
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