import * as path from 'path';
import * as fs from 'fs';
import { WebHelpLibrary } from "./help/openWebHelp";
import * as vscode from 'vscode';

export let internalLispFuncs: Array<string> = [];
export let internalDclKeys: Array<string> = [];
export let winOnlyListFuncPrefix: Array<string> = [];
export let allCmdsAndSysvars: Array<string> = [];
export let webHelpContainer: WebHelpLibrary = new WebHelpLibrary();

export function loadAllResources(){
	 readDataFileByLine("../extension/data/alllispkeys.txt", (items) => { internalLispFuncs = items; });
	 readDataFileByLine("../extension/data/alldclkeys.txt", (items) => { internalDclKeys = items; });
	 readDataFileByLine("../extension/data/winonlylispkeys_prefix.txt", (items) => { winOnlyListFuncPrefix = items; });
	 readDataFileByDelimiter("../extension/data/cmdAndVarsList.txt", ",", (item) => {
		let isLispCmds = item.startsWith("C:") || item.startsWith("c:");
		if (!isLispCmds && allCmdsAndSysvars.indexOf(item) < 0){
			allCmdsAndSysvars.push(item);
		}
	});
	readJsonDataFile("./help/webHelpAbstraction.json", webHelpContainer);
}	


export interface IJsonLoadable {
	loadFromJsonObject(data: object): void;
}


function readJsonDataFile(datafile: string, intoObject: IJsonLoadable): void {
	var dataPath = path.resolve(__dirname, datafile);
	fs.readFile(dataPath, "utf8", function(err: Error, data: string) {        
		if (err === null && intoObject["loadFromJsonObject"]) {
			intoObject.loadFromJsonObject(JSON.parse(data));
		}
	});    
}	


function readDataFileByLine(datafile: string,action: (items: string[]) => void) {
	var dataPath = path.resolve(__dirname, datafile);
	try {
		var data = fs.readFileSync(dataPath,{encoding:'utf8', flag:'r'});
		if (data.includes("\r\n")) {
			action(data.split("\r\n"));
		}
		else {
			action(data.split("\n"));
		}
	} catch (error) {
		console.log(error);
	}
}


function readDataFileByDelimiter(datafile: string, delimiter: string, action: (item: string) => void) {
	var dataPath = path.resolve(__dirname, datafile);
	try {
		var data = fs.readFileSync(dataPath,{encoding:'utf8', flag:'r'});
		var lineList: Array<String>;
			if (data.includes("\r\n")) {
				lineList = data.split("\r\n");
			}
			else {
				lineList = data.split("\n");
			}

			lineList.forEach(line => {
				var items = line.split(delimiter);
				var item = items[0];
				item = item.trim();
				if (item.length > 0){
					action(item);
				}
			});
	} catch (error) {
		console.log(error);
	}
}



export function getExtensionSettingString(settingName: string): string {
    let settingGroup = vscode.workspace.getConfiguration('autolispext');
    if (!settingGroup) {
        return null;
	}

    let setting = settingGroup.get(settingName);
    if (!setting) {
        return null;
	}

    return setting.toString().trim();
}

export function getExtensionSettingBoolean(settingName: string): boolean {
    let settingGroup = vscode.workspace.getConfiguration('autolispext');
    if (!settingGroup) {
        return null;
	}

    let setting = settingGroup.get(settingName);
    if (!setting) {
        return null;
	}

    return setting === true;
}

interface WorkspaceExclude {
	root: string;
	glob: string;
	excluded: boolean;
}

export function getWorkspaceExcludeGlobs(): Array<WorkspaceExclude> {
	const result : Array<WorkspaceExclude> = [];
	const wsFolders = vscode.workspace.workspaceFolders;
	wsFolders?.forEach(entry => {
		const rootPath = entry.uri.path.substring(1);
		const fileExcludes = vscode.workspace.getConfiguration('files.exclude', entry.uri);
		Object.keys(fileExcludes).forEach(key => {
			if (typeof(fileExcludes[key]) === 'boolean') {
				result.push({ root: rootPath, glob: key, excluded: fileExcludes[key] });
			}
		});
		const searchExcludes = vscode.workspace.getConfiguration('search.exclude', entry.uri);
		Object.keys(searchExcludes).forEach(key => {
			if (typeof(searchExcludes[key]) === 'boolean') {
				result.push({ root: rootPath, glob: key, excluded: searchExcludes[key] });
			}
		});
	});
	return result;
}
