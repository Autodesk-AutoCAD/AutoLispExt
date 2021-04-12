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
	var fs = require("fs");
	var dataPath = path.resolve(__dirname, datafile);
	fs.readFileSync(dataPath, "utf8", function(err: Error, data: string) {        
		if (err === null && intoObject["loadFromJsonObject"]) {
			intoObject.loadFromJsonObject(JSON.parse(data));
		}
	});    
}	


function readDataFileByLine(datafile: string, action: (items: string[]) => void) {
	var fs = require("fs");
	var dataPath = path.resolve(__dirname, datafile);
	fs.readFileSync(dataPath, "utf8", function(err: Error, data: string) {
		if (err === null) {
			if (data.includes("\r\n")) {
				action(data.split("\r\n"));
			}
			else {
				action(data.split("\n"));
			}
		}
	});
}


function readDataFileByDelimiter(datafile: string, delimiter: string, action: (item: string) => void) {
	var fs = require("fs");
	var dataPath = path.resolve(__dirname, datafile);
	fs.readFileSync(dataPath, "utf8", function(err: Error, data: string) {
		var lineList = new Array<String>();
		if (err === null) {
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
		}
	});
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