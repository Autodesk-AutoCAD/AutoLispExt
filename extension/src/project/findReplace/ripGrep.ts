import { rgPath } from 'vscode-ripgrep'
import { SearchOption } from './options';

import * as os from 'os';
import * as execa from "execa";
import * as fs from 'fs';

export async function findInFile(searchOption: SearchOption, file2Search: string, encoding: string) {
    let commandArgs: string[] = [
        searchOption.keyword,
        file2Search,
        "--vimgrep",
        "--line-number",
        "--color",
        "never",
        "--no-heading",
        "--no-filename",
        "--encoding",
        encoding
    ];

    if (searchOption.keyword.startsWith('-')) {
        commandArgs.splice(0, 0, '-e');
    }

    if (SearchOption.activeInstance.matchCase)
        commandArgs.push('--case-sensitive');
    else
        commandArgs.push('--ignore-case');

    if (SearchOption.activeInstance.matchWholeWord)
        commandArgs.push('--word-regexp');

    if (SearchOption.activeInstance.useRegularExpr)
        commandArgs.push('--no-fixed-strings');
    else
        commandArgs.push('--fixed-strings');

    if (SearchOption.activeInstance.isReplace && (SearchOption.activeInstance.replacement != null)) {
        commandArgs.push('--replace');
        commandArgs.push(SearchOption.activeInstance.replacement);
    }

    if (process.platform === 'darwin') {
        return execa(getRgPathMac(), commandArgs);
    }

    return execa(rgPath, commandArgs);
}

function getRgPathMac(): string {
    return rgPath + '.app';
}

export function grantExePermission() {
    let platform = os.type();
    if (platform !== 'Darwin')
        return;

    let rgPathMac = getRgPathMac();
    try {
        fs.accessSync(rgPathMac, fs.constants.X_OK);
        return;
    }
    catch (err) {
        // it has no execute permisson;
    }

    try {
        fs.chmodSync(rgPathMac, '755');
        // it then becomes executable
    }
    catch (err) {
        console.log("failed to grant execute permission: " + err);
    }
}