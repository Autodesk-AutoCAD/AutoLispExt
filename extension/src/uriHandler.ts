//
'use strict';

import * as vscode from 'vscode';
import { activeDocHasValidLanguageId } from './utils';
import { setDefaultAcadPid } from "./debug";
import { AutoLispExt } from './extension';

function getUrlParams(queryString) {
    let hashes = queryString.split('&')
    return hashes.reduce((params, hash) => {
        let [key, val] = hash.split('=')
        return Object.assign(params, { [key]: decodeURIComponent(val) })
    }, {})
}

const modalMsgOption = { modal: true };
export function onUriRequested(uri: vscode.Uri) {
    let qs = getUrlParams(uri.query);

    let pidStr = qs["pid"];
    if (pidStr === undefined) {
        let msg = AutoLispExt.localize("autolispext.urihandler.invaid", "Invalid call to AutoCAD AutoLISP Extension.");
        vscode.window.showInformationMessage(msg);
        return;
    }

    setDefaultAcadPid(parseInt(pidStr));

    if (vscode.debug.activeDebugSession) {
        let msg = AutoLispExt.localize("autolispext.urihandler.activeddebugcfg", "Current debug configuration: ");
        vscode.window.showInformationMessage(msg + vscode.debug.activeDebugSession.name,
            modalMsgOption);
        return;
    }

    if (vscode.window.activeTextEditor) {
        if (activeDocHasValidLanguageId()) {
            let msg = AutoLispExt.localize("autolispext.urihandler.debug.start",
                "From the menu bar, click Run > Start Debugging to debug the current AutoLISP source file.");
            vscode.window.showInformationMessage(msg, modalMsgOption);
        }
        else {
            let msg = AutoLispExt.localize("autolispext.urihandler.debug.openfile",
                "Open an AutoLISP source file and click Run > Start Debugging from the menu bar to debug the file.");
            vscode.window.showInformationMessage(msg, modalMsgOption);
        }

        return;
    }

    let msg = AutoLispExt.localize("autolispext.urihandler.debug.openfile",
        "Open an AutoLISP source file and click Run > Start Debugging from the menu bar to debug the file.");
    vscode.window.showInformationMessage(msg, modalMsgOption);

    return;

}
