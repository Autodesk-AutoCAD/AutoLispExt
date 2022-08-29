import * as path from 'path';
import * as chai from 'chai';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';

import * as testing from '../../help/userDocumentation';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { ILispFragment } from '../../astObjects/ILispFragment';
import { LispContainer } from '../../astObjects/lispContainer';

let prefixPath = __filename + "/../../../../extension/src/test/SourceFile/test_case/";
let lspFilePath = path.join(prefixPath + "pdfMarkups.lsp");



suite("Help: UserDocumentation Tests", function () {	
	const doc = ReadonlyDocument.open(lspFilePath);	
	const pos1 = new vscode.Position(150, 5);
	const pos2 = new vscode.Position(35, 5);
	const pos3 = new vscode.Position(11, 10);
	const pos4 = new vscode.Position(0, 5);
	
	let def1: LispContainer;
	let def2: LispContainer;
	let def3: LispContainer;
	let def4: LispContainer;
	let args1: Array<ILispFragment>;	
	let args2: Array<ILispFragment>;
	let args3: Array<ILispFragment>;
	let snip1: vscode.SnippetString;
	let snip2: vscode.SnippetString;
	let snip3: vscode.SnippetString;
	suiteSetup(async () => {
		try {
			let parent = doc.atomsForest.find(p => p.contains(pos1));
			def1 = await testing.getDefunAtPosition(parent, pos1);	
			
			parent = doc.atomsForest.find(p => p.contains(pos2));
			def2 = await testing.getDefunAtPosition(parent, pos2);	

			parent = doc.atomsForest.find(p => p.contains(pos3));
			def3 = await testing.getDefunAtPosition(parent, pos3, 1);	

			parent = doc.atomsForest.find(p => p.contains(pos4));
			def4 = await testing.getDefunAtPosition(parent, pos4);	

			args1 = testing.getDefunArguments(def1);
			args2 = testing.getDefunArguments(def2);
			args3 = testing.getDefunArguments(def3);

			snip1 = testing.generateDocumentationSnippet('\n', args1);
			snip2 = testing.generateDocumentationSnippet('\n', args2);
			snip3 = testing.generateDocumentationSnippet('\n', args3);
		} catch (error) { 
			// No required reporting, these will fail in the context specific tests
		}
	  });
	
	
	test("getDefunAtPosition() Test", function () {
		try {			
			// tslint:disable-next-line:no-unused-expression
			chai.expect(def1).to.exist;
			// tslint:disable-next-line:no-unused-expression
			chai.expect(def2).to.exist;
			// tslint:disable-next-line:no-unused-expression
			chai.expect(def3).to.exist;
			// tslint:disable-next-line:no-unused-expression
			chai.expect(def4).to.not.exist;
		}
		catch (err) {
			chai.expect.fail("Failed to locate a defun at known position");
		}
	});


	test("getDefunArguments() @Returns Test", function () {
		try {
			chai.expect(args1.length).to.equal(1);
			chai.expect(args2.length).to.equal(0);
			chai.expect(args3.length).to.equal(0);
			chai.expect(testing.getDefunArguments(null).length).to.equal(0);
		}
		catch (err) {
			chai.expect.fail("Defun was null or the number of arguments extracted were not equal to 1");
		}
	});


	test("generateDocumentationSnippet() Test", function () {
		try {
			chai.expect(snip1.value.length).to.equal(64);
			chai.expect(snip2.value.length).to.equal(44);
			chai.expect(snip3.value.length).to.equal(44);
		}
		catch (err) {
			chai.expect.fail("The produced snippet did not contain the expected number of characters");
		}
	});


});