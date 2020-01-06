// $NoKeywords: $
//
//  Copyright 2019 Autodesk, Inc.  All rights reserved.
//
//  Use of this software is subject to the terms of the Autodesk license 
//  agreement provided at the time of installation or download, or which 
//  otherwise accompanies this software in either electronic or hard copy form.   
//
// uriHandler.ts
//
'use strict';

import * as vscode from 'vscode';

import {
    acitiveDocHasValidLanguageId
} from './utils'
import {setDefaultAcadPid } from "./debug"

function getUrlParams(queryString) {
    let hashes = queryString.split('&')
    return hashes.reduce((params, hash) => {
        let [key, val] = hash.split('=')
        return Object.assign(params, { [key]: decodeURIComponent(val) })
    }, {})
}

const modalMsgOption = { modal: true};
export function onUriRequested(uri: vscode.Uri) {
    let qs = getUrlParams(uri.query);
    
    let pidStr = qs["pid"];
    if(pidStr === undefined) {
        vscode.window.showInformationMessage("Invalid call to AutoCAD AutoLISP Extension.");
        return;
    }

    setDefaultAcadPid(parseInt(pidStr));

    if(vscode.debug.activeDebugSession){
        vscode.window.showInformationMessage("Current debug configuration: " + vscode.debug.activeDebugSession.name,
                    modalMsgOption);
        return;
    }

    if(vscode.window.activeTextEditor){
        if(acitiveDocHasValidLanguageId())
            vscode.window.showInformationMessage("From the menu bar, click Debug > Start Debugging to debug the current AutoLISP source file.", modalMsgOption);
        else
            vscode.window.showInformationMessage("Open an AutoLISP source file and click Debug > Start Debugging from the menu bar to debug the file.", modalMsgOption);
        
        return;
    }
 
    vscode.window.showInformationMessage("Open an AutoLISP source file and click Debug > Start Debugging from the menu bar to debug the file.", modalMsgOption);

    return;
   
}
