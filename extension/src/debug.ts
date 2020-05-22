import * as vscode from 'vscode';
import * as Net from 'net';
import * as os from 'os';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

import { pickProcess } from './process/acadPicker';
import { calculateABSPathForDAP } from './platform';
import { existsSync } from 'fs';
import { ProcessPathCache } from './process/processCache';
import { DiagnosticsCtrl } from './diagnosticsCtrl';

let strNoADPerr: string = localize("autolispext.debug.nodap", "doesn’t exist. Verify that the file exists in the same folder as that for the product specified in the launch.json file.");
let strNoACADerr: string = localize("autolispext.debug.noacad", "doesn’t exist. Verify and correct the folder path to the product executable.");
let acadPid2Attach = -1;

let attachCfgName = 'AutoLISP Debug: Attach';
let attachCfgType = 'attachlisp';
let attachCfgRequest = 'attach';

export function setDefaultAcadPid(pid: number) {
    acadPid2Attach = pid;
}
function need2AddDefaultConfig(config: vscode.DebugConfiguration): Boolean {
    if (config.type) return false;
    if (config.request) return false;
    if (config.name) return false;

    return true;
}

const LAUNCH_PROC:string = 'debug.LaunchProgram';
const LAUNCH_PARM:string = 'debug.LaunchParameters';
const ATTACH_PROC:string = 'debug.AttachProcess';

export function registerLispDebugProviders(context: vscode.ExtensionContext) {
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
            args: ["--", productStartCommand, productStartParameter]
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
                let msg = localize("autolispext.debug.acad.nosupport",
                    "This instance of AutoCAD doesn’t support debugging AutoLISP files, use a release later than AutoCAD 2020.");
                vscode.window.showErrorMessage(msg);
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
            if (config["attributes"]) {
                productPath = config["attributes"]["path"] ? config["attributes"]["path"] : "";
            }

            if (!productPath) {
                let path = getExtensionSettingString(LAUNCH_PROC);
                if (path)
                    productPath = path;
            }

            if (!productPath) {
                let info = localize("autolispext.debug.launchjson.path",
                    "Specify the absolute path to the product with the Path attribute of the launch.json file.");
                vscode.window.showInformationMessage(info);
                let platform = os.type();
                if (platform === 'Windows_NT') {
                    let msg = localize("autolispext.debug.prod.path.win",
                        "Specify the absolute path for the product. For example, C://Program Files//Autodesk//AutoCAD//acad.exe.");
                    productPath = await vscode.window.showInputBox({ placeHolder: msg });
                    rememberLaunchPath(productPath);
                }
                else if (platform === 'Darwin') {
                    let msg = localize("autolispext.debug.prod.path.osx",
                        "Specify the absolute path for the product. For example, /Applications/Autodesk/AutoCAD.app/Contents/MacOS/AutoCAD.");
                    productPath = await vscode.window.showInputBox({ placeHolder: msg });
                    rememberLaunchPath(productPath);
                }
                else {
                    let msg = localize("autolispext.debug.prod.path.other", "Specify the absolute path for the product.");
                    productPath = await vscode.window.showInputBox({ placeHolder: msg });
                    rememberLaunchPath(productPath);
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
                if (config["attributes"]) {
                    params = config["attributes"]["params"] ? config["attributes"]["params"] : "";
                }
                else {
                    let text = getExtensionSettingString(LAUNCH_PARM);
                    if (text)
                        params = text;
                }
                ProcessPathCache.globalParameter = params;
            }
            //4. get debug adapter path
            let lispadapterpath = calculateABSPathForDAP(productPath);
            if (!existsSync(lispadapterpath)) {
                if (!lispadapterpath || lispadapterpath.length == 0)
                    lispadapterpath = "Debug Adapter";
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

        ProcessPathCache.globalAcadNameInUserAttachConfig = '';
        if (config && config.attributes && config.attributes.process) {
            ProcessPathCache.globalAcadNameInUserAttachConfig = config.attributes.process;
        }
        else {
            let name = getExtensionSettingString(ATTACH_PROC);
            if (name)
                ProcessPathCache.globalAcadNameInUserAttachConfig = name;
        }

        ProcessPathCache.clearProductProcessPathArr();
        let processId = await pickProcess(false, acadPid2Attach);
        if (!processId) {
            let msg = localize("autolispext.debug.noprocess.eror", "No process for which to attach could be found.");
            return vscode.window.showInformationMessage(msg).then(_ => {
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

function getExtensionSettingString(settingName: string): string {
    let settingGroup = vscode.workspace.getConfiguration('autolispext');
    if (!settingGroup)
        return null;

    let setting = settingGroup.get(settingName);
    if (!setting)
        return null;

    return setting.toString().trim();
}

function rememberLaunchPath(path: string) {
    if (existsSync(path) == false)
        return;

    let settingGroup = vscode.workspace.getConfiguration('autolispext');
    if (!settingGroup)
        return null;

    settingGroup.update(LAUNCH_PROC, path, true).then(
        () => {
            console.log("Launch path stored in extension setting");
        },
        (err) => {
            if(err)
                vscode.window.showErrorMessage(err.toString());
        });
}