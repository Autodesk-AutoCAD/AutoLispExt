import * as vscode from 'vscode';


export class DiagnosticsCtrl {
    public static diagnostics: vscode.DiagnosticCollection = undefined;

    public static initDiagnostic() {
        if (this.diagnostics === undefined)
            this.diagnostics = vscode.languages.createDiagnosticCollection("diagnostics");
    }

    public static addDocumentDiagnostics(doc: string, mess: string, row_start: number, col_start: number, row_end: number, col_end: number): void {
        let doc_uri: vscode.Uri = vscode.Uri.file(doc);
        if (doc && doc_uri) {
            this.diagnostics.set(doc_uri, [{
                code: '',
                message: mess ? mess : "runtime error",
                range: new vscode.Range(new vscode.Position(row_start - 1, col_start), new vscode.Position(row_end - 1, col_end)),
                severity: vscode.DiagnosticSeverity.Error,
                source: ''
            }]);
        }
    }

    public static clearDocumentDiagnostics() {
        this.diagnostics.clear();
    }
}

export function registerDiagnosticHandler(context: vscode.ExtensionContext) {
    DiagnosticsCtrl.initDiagnostic();

    context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(e => {
        // clear the runtime diagnostics errors
        DiagnosticsCtrl.clearDocumentDiagnostics();
    }));
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(e => {
        // clear the runtime diagnostics errors
        DiagnosticsCtrl.clearDocumentDiagnostics();
    }));

    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(e => {
        // clear the runtime diagnostics errors
        DiagnosticsCtrl.clearDocumentDiagnostics();
    }));
}