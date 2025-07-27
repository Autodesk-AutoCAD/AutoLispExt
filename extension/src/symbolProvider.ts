import * as vscode from 'vscode';

export class AutoLispDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
        
        return new Promise((resolve, reject) => {
            const symbols: vscode.DocumentSymbol[] = [];
            
            // Regex to find AutoLISP function definitions, e.g., (defun C:MYCOMMAND ... )
            // This regex captures the function name.
            // Captures the optional '#' in group 1 and the function name in group 2
            const functionRegex = /^\s*\(\s*defun\s+(#)?([a-zA-Z0-9_:-]+)/gim;

            const text = document.getText();
            let match;
            while ((match = functionRegex.exec(text)) !== null) {
                const isTestFunction = match[1]; // Check if '#' exists
                let functionName = match[2];
                
                // Default to a normal function icon
                let symbolKind = vscode.SymbolKind.Function; 

                if (isTestFunction) {
                    // Prepend the '#' back to the name for display
                    functionName = '#' + functionName; 
                    // Use a different icon (e.g., a key icon) for test functions
                    symbolKind = vscode.SymbolKind.Key; 
                }

                const position = document.positionAt(match.index);

                const symbol = new vscode.DocumentSymbol(
                    functionName,
                    isTestFunction ? 'Test Function' : 'Function', // Custom detail text
                    symbolKind,
                    document.lineAt(position.line).range,
                    document.lineAt(position.line).range
                );

                symbols.push(symbol);
            }
            resolve(symbols);
        });
    }
}