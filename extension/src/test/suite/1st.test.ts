import * as chai from 'chai';
import * as vscode from 'vscode';
import * as path from 'path';

var assert = require('chai').assert;

suite("Global Setup", function () {	
	test("Artificial Invoke of AutoLispExt", async function () {	
		try {
			this.timeout(10000);
			// For some reason, activating our extension from within a test is "better" than
			// activating it passively by using arguments to auto-open an LSP file. The side
			// effects of not doing it this way cause incomplete NYC code coverage.
			await vscode.extensions.getExtension('Autodesk.autolispext').activate();
			chai.assert(true);
		}
		catch (err) {
			assert.fail("Failed to activate extension");
		}
	});

	test("Initialize an Active Editor", async function () {	
		try {
			// Added this immediate file open invoke to give certain tests designed to scan
			// all possible ReadOnlyDocument context types full code coverage.
			const filePath = path.resolve(__dirname, '../../../', './extension/src/test/SourceFile/test_case/comments.lsp');
			const options = { 'preview': false, 'preserveFocus': true };
			await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath), options);
			chai.assert(true);			
		}
		catch (err) {
			assert.fail("Failed to open an active document editor");
		}
	});

});