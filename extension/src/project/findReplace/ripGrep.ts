import { rgPath } from 'vscode-ripgrep'
import { SearchOption } from './options';

import * as execa from "execa";

export async function findInFile(searchOption: SearchOption, file2Search: string) {
    let commandArgs: string[] = [
        searchOption.keyword,
        file2Search,
        "--column",
        "--line-number",
        "--color",
        "never",
        "--no-heading"
    ];

    if (SearchOption.matchCase)
        commandArgs.push('--case-sensitive');
    else
        commandArgs.push('--ignore-case');

    if (SearchOption.matchWholeWord)
        commandArgs.push('--word-regexp');

    if (SearchOption.useRegularExpr)
        commandArgs.push('--no-fixed-strings');
    else
        commandArgs.push('--fixed-strings');

    return execa(
        rgPath,
        commandArgs
    );
}
