import * as path from 'path';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';

import * as testing from '../../help/userDocumentation';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { ILispFragment, LispContainer } from '../../format/sexpression';

let prefixPath = __filename + "/../../../../extension/src/test/SourceFile/test_case/";
let lspFilePath = path.join(prefixPath + "pdfMarkups.lsp");



suite("Help: UserDocumentation Tests", function () {	
	const doc = ReadonlyDocument.open(lspFilePath);	
	const pos = new vscode.Position(150, 5);
	
	let def: LispContainer;
	let args: Array<ILispFragment>;
	let snip: vscode.SnippetString;
	suiteSetup(async () => {
		try {
			const parent = doc.atomsForest.find(p => p.contains(pos));
			def = await testing.getDefunAtPosition(parent, pos);	
			args = testing.getDefunArguments(def);
			snip = testing.generateDocumentationSnippet('\n', args);
		} catch (error) { 
			// No required reporting, these will fail in the context specific tests
		}
	  });
	
	
	test("getDefunAtPosition() Test", function () {
		try {			
			// tslint:disable-next-line:no-unused-expression
			chai.expect(def).to.exist;
		}
		catch (err) {
			chai.expect.fail("Failed to locate a defun at known position");
		}
	});


	test("getDefunArguments() @Returns Test", function () {
		try {
			chai.expect(args.length).to.equal(1);
		}
		catch (err) {
			chai.expect.fail("Defun was null or the number of arguments extracted were not equal to 1");
		}
	});


	test("Full WebHelpFunction.asMarkdown() Test", function () {
		try {
			chai.expect(snip.value.length).to.equal(64);
		}
		catch (err) {
			chai.expect.fail("The produced snippet did not contain the expected number of characters");
		}
	});


});