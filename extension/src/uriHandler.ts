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
    setDefaultAcadPid,
    acitiveDocHasValidLanguageId
} from './extension'

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
        vscode.window.showInformationMessage("Invalid call to AutoCAD Lisp Extension.");
        return;
    }

    setDefaultAcadPid(parseInt(pidStr));

    if(vscode.debug.activeDebugSession){
        vscode.window.showInformationMessage("Current debug session name:\r\n" + vscode.debug.activeDebugSession.name,
                    modalMsgOption);
        return;
    }

    if(vscode.window.activeTextEditor){
        if(acitiveDocHasValidLanguageId())
            vscode.window.showInformationMessage("Press F5 to debug.", modalMsgOption);
        else
            vscode.window.showInformationMessage("Open a LISP file and press F5 to debug.", modalMsgOption);
        
        return;
    }
 
    vscode.window.showInformationMessage("Press F5 to debug.", modalMsgOption);

    return;
   
}
