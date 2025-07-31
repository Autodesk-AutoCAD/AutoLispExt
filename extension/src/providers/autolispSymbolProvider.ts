import * as vscode from 'vscode';

export class AutoLispDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        
        return new Promise((resolve, reject) => {
            const symbols: vscode.DocumentSymbol[] = [];
            
            const text = document.getText();
            let match;

            // A simple regex to just capture the function name
            const functionRegex = /^\s*\(\s*defun\s+([^\s\(\)]+)/gim;

            while ((match = functionRegex.exec(text)) !== null) {
                const functionName = match[1];
                
                // --- Code to calculate the precise range of defun ---
                const functionNameIndex = match[0].lastIndexOf(functionName);
                const startPosition = document.positionAt(match.index + functionNameIndex);
                const endPosition = document.positionAt(match.index + functionNameIndex + functionName.length);
                const selectionRange = new vscode.Range(startPosition, endPosition);

                let symbolKind: vscode.SymbolKind;
                let detailText: string;

                if (functionName.toUpperCase().startsWith('C:')) {
                    symbolKind = vscode.SymbolKind.Module;
                    detailText = 'Executable Function';
                } 
                else if (functionName.startsWith('#')) {
                    symbolKind = vscode.SymbolKind.Key;
                    detailText = 'Test Function';
                } 
                else {
                    symbolKind = vscode.SymbolKind.Function;
                    detailText = 'Function';
                }

                const fullLineRange = document.lineAt(startPosition.line).range;

                const symbol = new vscode.DocumentSymbol(
                    functionName,
                    detailText,
                    symbolKind,
                    fullLineRange,    // The range for folding is the whole line
                    selectionRange    // The range for selection is just the name
                );

                symbols.push(symbol);
            }
            resolve(symbols);
        });
    }
}