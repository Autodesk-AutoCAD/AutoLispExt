import * as vscode from 'vscode';
import * as Net from 'net';
import * as os from 'os';


import { pickProcess } from './process/acadPicker';
import { calculateABSPathForDAP } from './platform';
import { existsSync } from 'fs';
import { ProcessPathCache } from './process/processCache';
import { DiagnosticsCtrl } from './diagnosticsCtrl';

let strNoADPerr: string = "doesn’t exist. Verify that the file exists in the same folder as that for the product specified in the launch.json file.";
let strNoACADerr: string = "doesn’t exist. Verify and correct the folder path to the product executable.";
let acadPid2Attach = -1;

let attachCfgName = 'AutoLISP Debug: Attach';
let attachCfgType = 'attachlisp';
let attachCfgRequest = 'attach';

export function setDefaultAcadPid(pid: number) {
    acadPid2Attach = pid;
}
function need2AddDefaultConfig(config: vscode.DebugConfiguration) : Boolean
{
	if(config.type) return false;
	if(config.request) return false;
	if(config.name) return false;

	return true;
}

export function registerLispDebugProviders(context: vscode.ExtensionContext)
{
	//-----------------------------------------------------------
	//4. debug adapter
	//-----------------------------------------------------------
	//this command is used for launch debug calculating DebugAdapter path and arguments
	context.subscriptions.push(vscode.commands.registerCommand("extension.lispLaunchAdapterExecutableCommand", async () => {

		let lispadapterpath = ProcessPathCache.globalLispAdapterPath;
		let productStartCommand = ProcessPathCache.globalProductPath;
		let productStartParameter = ProcessPathCache.globalParameter;
		return {
			command: lispadapterpath,
			args:["--", productStartCommand, productStartParameter]
		};
	}));
	context.subscriptions.push(vscode.commands.registerCommand("extension.lispAttachAdapterExecutableCommand", async () => {
		let lispadapterpath = ProcessPathCache.globalLispAdapterPath;
		return {
			command: lispadapterpath,
			args: []
		};
	}));

	// register a configuration provider for 'lisp' launch debug type
	const launchProvider = new LispLaunchConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('launchlisp', launchProvider));
	context.subscriptions.push(launchProvider);

	//register a configuration provider for 'lisp' attach debug type
	const attachProvider = new LispAttachConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider(attachCfgType, attachProvider));
	context.subscriptions.push(attachProvider);

	//register attach failed message
	context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
		console.log(event);
        if (event.session && (event.session.type === "launchlisp" || event.session.type === attachCfgType)) {
			if (event.event === "runtimeerror") {
				// handle runtime diagnostics errors
				DiagnosticsCtrl.addDocumentDiagnostics(event.body.file, event.body.message, event.body.startline, event.body.startcol, event.body.endline, event.body.endcol);
			} 
			else if (event.event === "clearcache") {
				setDefaultAcadPid(-1);
			}
			else if (event.event === "acadnosupport") {
				vscode.window.showErrorMessage("This instance of AutoCAD doesn’t support debugging AutoLISP files, use a release later than AutoCAD 2020.");
			}
		}
    }));
}

class LispLaunchConfigurationProvider implements vscode.DebugConfigurationProvider {

	private _server?: Net.Server;

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
		console.log(config);
		
		// if launch.json is missing or empty
		if (need2AddDefaultConfig(config)) {
			config.type = 'launchlisp';
			config.name = 'AutoLISP Debug: Launch';
			config.request = 'launch';
		}

        if (vscode.window.activeTextEditor)
            config.program = vscode.window.activeTextEditor.document.fileName;

        if (config["type"] === "launchlisp") {
			// 1. get acad and adapter path
			//2. get acadRoot path
			//2.1 get acadRoot path from launch.json
			let productPath = "";
			if (config["attributes"])
				productPath = config["attributes"]["path"] ? config["attributes"]["path"] : "";

			if (!productPath) {
				vscode.window.showInformationMessage("Specify the absolute path to the product with the Path attribute of the launch.json file.");
				let platform = os.type();
				if(platform === 'Windows_NT'){
					productPath = await vscode.window.showInputBox({placeHolder: "Specify the absolute path for the product. For example, C://Program Files//Autodesk//AutoCAD//acad.exe."});
				}
				else if(platform === 'Darwin'){
					productPath = await vscode.window.showInputBox({placeHolder: "Specify the absolute path for the product. For example, /Applications/Autodesk/AutoCAD.app/Contents/MacOS/AutoCAD."});
				}
				else{
					productPath = await vscode.window.showInputBox({placeHolder: "Specify the absolute path for the product."});
				}
			}
			//3. get acad startup params
			if (!existsSync(productPath)) {
				if (!productPath || productPath.length == 0)
					vscode.window.showErrorMessage("AutoCAD " + strNoACADerr);
				else
					vscode.window.showErrorMessage(productPath + " " + strNoACADerr);
				ProcessPathCache.globalProductPath = "";
				return undefined;
			} else {
				let params = "";
				if (config["attributes"])
					params = config["attributes"]["params"] ? config["attributes"]["params"] : "";
				ProcessPathCache.globalParameter = params;
			}
			//4. get debug adapter path
			let lispadapterpath = calculateABSPathForDAP(productPath);
			if (!existsSync(lispadapterpath)) {
				vscode.window.showErrorMessage(lispadapterpath + " " + strNoADPerr);
				ProcessPathCache.globalProductPath = "";
				return undefined;
			}
			ProcessPathCache.globalLispAdapterPath = lispadapterpath;
			ProcessPathCache.globalProductPath = productPath;
		}
		return config;
	}

	dispose() {
		if (this._server) {
			this._server.close();
		}
	}
}

class LispAttachConfigurationProvider implements vscode.DebugConfigurationProvider {

	private _server?: Net.Server;

	async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {

		// if launch.json is missing or empty
       if (need2AddDefaultConfig(config)) {
                config.type = attachCfgType;
                config.name = attachCfgName;
                config.request = attachCfgRequest;
        }

        if (vscode.window.activeTextEditor)
            config.program = vscode.window.activeTextEditor.document.fileName;

        if (config && config.attributes && config.attributes.process){
            ProcessPathCache.globalAcadNameInUserAttachConfig = config.attributes.process;
        }

		ProcessPathCache.clearProductProcessPathArr();
        let processId = await pickProcess(false, acadPid2Attach);
		if (!processId) {
			return vscode.window.showInformationMessage("No process for which to attach could be found.").then(_ => {
				return undefined;	// abort attach
			});
		}
		ProcessPathCache.chooseProductPathByPid(parseInt(processId));
		let lispadapterpath = calculateABSPathForDAP(ProcessPathCache.globalProductPath);
		if (!existsSync(lispadapterpath)) {
			vscode.window.showErrorMessage(lispadapterpath + " " + strNoADPerr);
			ProcessPathCache.globalProductPath = "";
			return undefined;
		}
		ProcessPathCache.globalLispAdapterPath = lispadapterpath;
		config.processId = processId;

        return config;
	}

	dispose() {
		if (this._server) {
			this._server.close();
		}
	}
}