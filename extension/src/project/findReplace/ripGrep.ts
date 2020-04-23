import { rgPath } from 'vscode-ripgrep'
import * as execa from "execa";

export async function runRg(keyword: string, file2Search: string): Promise<string> {
    let commandArgs: string[] = [
        keyword,
        file2Search,
        "--column",
        "--line-number",
        "--color",
        "never",
		"--no-heading"
	];
	
	return execa(
		rgPath,
		commandArgs
	);
}