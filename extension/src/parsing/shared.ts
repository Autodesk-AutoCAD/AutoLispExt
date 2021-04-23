import * as vscode from 'vscode';

export function getEOL(document: vscode.TextDocument): string {
	return endOfLineEnum2String(document.eol);
}

export function endOfLineEnum2String(eolEnum: vscode.EndOfLine): string {
    switch (eolEnum) {
        case vscode.EndOfLine.LF:
            return "\n";

        case vscode.EndOfLine.CRLF:
            return "\r\n";

        default:
            console.log("Unexpected eol\n");
            return "\r\n";
    }
}