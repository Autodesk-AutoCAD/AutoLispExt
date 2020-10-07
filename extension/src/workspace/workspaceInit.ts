import * as vscode from 'vscode';
import { AutolispGoToProvider } from "./gotoProvider";
import { ReadonlyDocument } from "../project/readOnlyDocument";
import * as fs from 'fs';


// This variable represents un-opened *.LSP documents that we need to collect information from
export const workspaceDocuments: Map<string, ReadonlyDocument> = new Map();
export const activeDocuments: Map<string, vscode.TextDocument> = new Map();
const docSelector = [ 'autolisp', 'lisp'];
// How bad is it for me to store this context? I saw some other extensions doing this and vscode.extensions.getExtension() doesn't create a vscode.ExtensionContext
let ctx: vscode.ExtensionContext; 
let watcher: vscode.FileSystemWatcher;
let gotoProvider: AutolispGoToProvider = new AutolispGoToProvider();


// Entry point invoked by extension.ts
export async function registerWorkspaceProviders(context: vscode.ExtensionContext) {
	ctx = context;	

	// Register GoToProvider	
	context.subscriptions.push(vscode.languages.registerDefinitionProvider(docSelector,  gotoProvider));

	
	// Presumably, these objects are persisted until closed and this exported 'activeDocuments' variable will provide the context of what is opened
	// that the 'vscode.workspace.textDocuments' namespace does not (currently) provide. It possibly does in vsix form, but not while debugging.
	// Note, until a document previously opened in a prior session is actually activated, there is no way to know the document is technically open.
	if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document &&
		vscode.window.activeTextEditor.document.fileName.toUpperCase().slice(-4) === ".LSP") {
		activeDocuments.set(vscode.window.activeTextEditor.document.uri.fsPath, vscode.window.activeTextEditor.document);
	}


	// This builds the 'workspaceDocuments' *.LSP Memory Document Set
	// This feature does make the fair assumption that an AutoCAD machine has plenty of memory
	// However, this was stress tested with a root workspace folder containing 10mb of *.LSP files and the memory footprint increased less than 50mb
	vscode.workspace.findFiles("**").then((items: vscode.Uri[]) =>{
		const activeDoc: string = [...activeDocuments.keys()][0];
		items.forEach((fileitem: vscode.Uri) => {			
			if (activeDoc !== fileitem.fsPath && fileitem.fsPath.toUpperCase().slice(-4) === ".LSP"){
				workspaceDocuments.set(fileitem.fsPath, ReadonlyDocument.open(fileitem.fsPath));
			}
		});
	});
	
	
	// Adds a closing *.LSP document to the workspaceDocuments<ReadonlyDocument> Map and removes it from the activeDocuments<vscode.textDocument> Map
	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((e: vscode.TextDocument) => {
		if (e.fileName.toUpperCase().slice(-4) === ".LSP") {
			if (activeDocuments.has(e.uri.fsPath) === true) {
				activeDocuments.delete(e.uri.fsPath);
			}
			workspaceDocuments.set(e.uri.fsPath, ReadonlyDocument.open(e.uri.fsPath));
		}
		cleanMemoryDocuments();
	}));


	// remove a newly opened *.LSP from the workspaceDocuments<ReadonlyDocument> Map because those will likely be updated and we prefer
	// the 'vscode.textDocument' reference instead
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((e: vscode.TextDocument) => {
		if (e.fileName.toUpperCase().slice(-4) === ".LSP") {
			if (workspaceDocuments.has(e.uri.fsPath) === true) {
				workspaceDocuments.delete(e.uri.fsPath);
			}
			activeDocuments.set(e.uri.fsPath, e);			
		}
		cleanMemoryDocuments();
	}));
	

	// Shuffles an old Document reference within its currently location and removes the old reference or adds it if they changed the extension to *.LSP
	context.subscriptions.push(vscode.workspace.onDidRenameFiles((e: vscode.FileRenameEvent) => {
		e.files.forEach((fileitem: {oldUri: vscode.Uri, newUri: vscode.Uri}) => {
			let handled = false;
			if (activeDocuments.has(fileitem.oldUri.fsPath) === true) {
				activeDocuments.set(fileitem.newUri.fsPath, activeDocuments.get(fileitem.oldUri.fsPath));
				activeDocuments.delete(fileitem.oldUri.fsPath);
				handled = true;
			}			
			if (workspaceDocuments.has(fileitem.oldUri.fsPath) === true) {
				workspaceDocuments.set(fileitem.newUri.fsPath, workspaceDocuments.get(fileitem.oldUri.fsPath));
				workspaceDocuments.delete(fileitem.oldUri.fsPath);
				handled = true;
			}
			if (handled === false && fileitem.newUri.fsPath.toUpperCase().slice(-4) === ".LSP"){
				workspaceDocuments.set(fileitem.newUri.fsPath, ReadonlyDocument.open(fileitem.newUri.fsPath));
			}
		});
		cleanMemoryDocuments();
	}));


	// Reset and repopulate the Document Map's
	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders((e: vscode.WorkspaceFoldersChangeEvent) => {
		activeDocuments.clear();
		workspaceDocuments.clear();
		
		if (watcher){
			watcher.dispose();		
		}
		
		if (vscode.workspace.name) {
			if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document &&
				vscode.window.activeTextEditor.document.fileName.toUpperCase().slice(-4) === ".LSP"){
				activeDocuments.set(vscode.window.activeTextEditor.document.uri.fsPath, vscode.window.activeTextEditor.document);
			}
	
			vscode.workspace.findFiles("**").then((items: vscode.Uri[]) => {
				const activeDoc: string = [...activeDocuments.keys()][0];
				items.forEach((fileitem: vscode.Uri) => {			
					if (activeDoc !== fileitem.fsPath && fileitem.fsPath.toUpperCase().slice(-4) === ".LSP") {
						workspaceDocuments.set(fileitem.fsPath, ReadonlyDocument.open(fileitem.fsPath));
					}
				});
			});
			setupFileSystemWatcher();		
		}
	}));


	// Needed FileSystemWatcher because the workspace events don't cover FileSystem operations outside of the Workspace Interface
	if (vscode.workspace.name){
		setupFileSystemWatcher();		
	}	
}



// Neccessary to get notifications about non-workspace file additions, removals and renames. 
function setupFileSystemWatcher(){
	if (watcher){
		watcher.dispose();		
	}

	const pattern = new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], "**");
	watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

	ctx.subscriptions.push(watcher.onDidDelete((e: vscode.Uri) => {		
		if (activeDocuments.has(e.fsPath) === true) {
			activeDocuments.delete(e.fsPath);
		}
		if (workspaceDocuments.has(e.fsPath) === true) {
			workspaceDocuments.delete(e.fsPath);
		}		
	}));

	ctx.subscriptions.push(watcher.onDidCreate((e: vscode.Uri) => {
		if (e.fsPath.toUpperCase().slice(-4) === ".LSP"){
			if (workspaceDocuments.has(e.fsPath) === false) {
				workspaceDocuments.set(e.fsPath, ReadonlyDocument.open(e.fsPath));
			}
			cleanMemoryDocuments();
		}
	}));
}


export function cleanMemoryDocuments() {	
	let keys = [...activeDocuments.keys()];
	keys.forEach(k => {
		if (workspaceDocuments.has(k) === true) {
			workspaceDocuments.delete(k);
		}
		if (fs.existsSync(k) === false) {
			activeDocuments.delete(k);
		}
	});
	keys = [...workspaceDocuments.keys()];
	keys.forEach(k => {
		if (fs.existsSync(k) === false) {
			workspaceDocuments.delete(k);
		}
	});
}