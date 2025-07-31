import * as vscode from 'vscode';

export class DclDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        return new Promise((resolve, reject) => {
            const symbols: vscode.DocumentSymbol[] = [];
            const parentStack: vscode.DocumentSymbol[] = [];

            // Regex to find DCL definitions like: my_dialog : dialog {
            const dclRegex = /^\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)/;

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const match = line.text.match(dclRegex);

                if (match) {
                    const name = match[1]; // e.g., my_dialog
                    const type = match[2]; // e.g., dialog
                    
                    const range = line.range;
                    const selectionRange = new vscode.Range(
                        new vscode.Position(i, line.text.indexOf(name)),
                        new vscode.Position(i, line.text.indexOf(name) + name.length)
                    );

                    const symbol = new vscode.DocumentSymbol(
                        name,
                        type, // Show the type (dialog, button, etc.) in the outline
                        vscode.SymbolKind.Object,
                        range,
                        selectionRange
                    );

                    const currentParent = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;

                    if (currentParent) {
                        currentParent.children.push(symbol);
                    } else {
                        symbols.push(symbol);
                    }
                    
                    // If the line has an opening brace, this is a new parent
                    if (line.text.includes('{')) {
                        parentStack.push(symbol);
                    }
                }

                // If the line has a closing brace, we exit the current parent's scope
                if (line.text.includes('}')) {
                    parentStack.pop();
                }
            }

            resolve(symbols);
        });
    }
}