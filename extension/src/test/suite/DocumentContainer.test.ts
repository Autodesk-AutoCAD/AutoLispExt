import * as path from 'path';
import { Position, Range } from 'vscode';
import { LispParser } from '../../format/parser';
import { Sexpression, LispContainer } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

var assert = require('chai').assert;
let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");

suite("LispParser.DocumentContainer Tests", function () {	
	test("Original atomsForest vs DocumentContainer", function () {	
		try {
			const doc = ReadonlyDocument.open(project_path); 						
			const v1Start = Date.now();
			const parser = new LispParser(doc);
			parser.tokenizeString(doc.getText(), 0);
			const v1items = parser.atomsForest.filter(x => x instanceof Sexpression);
			const v1Stop = Date.now();
			const dex = LispParser.getDocumentContainer(doc.fileContent);			
			const v2items = dex.atoms.filter(x => x instanceof LispContainer);
			const v2Stop = Date.now();			
			const v1Diff = v1Stop - v1Start;
			const v2Diff = v2Stop - v1Stop;
			console.log(`\t\tNewParser Processing Time: ${v2Diff}ms`);
			console.log(`\t\tOldParser Processing Time: ${v1Diff}ms`);
			assert.isTrue(v2Diff <= v1Diff || v1Diff - v2Diff <= 1);
			assert.equal(v2items.length, v1items.length);
		}
		catch (err) {
			assert.fail("Each version returned a different number of Expressions");
		}
	});


	test("DocumentExpression using index", function () {		
		try {
			const expectation = '(= (length retList) 1)';
			const doc = ReadonlyDocument.open(project_path); 						
			const start = Date.now();
			const iex = LispParser.getDocumentContainer(doc.getText(), 6847);
			const stop = Date.now();
			const diff = stop - start;
			const r = new Range(iex.line, iex.column, iex.atoms.slice(-1)[0].line, iex.atoms.slice(-1)[0].column + 1);
			assert.equal(doc.getText(r), expectation);
		}
		catch (err) {
			assert.fail("Did not return the expected '(= (length retList) 1)' result");
		}
	});

	test("DocumentExpression using vscode.Position", function () {		
		try {
			const expectation = '(= (length retList) 1)';
			const doc = ReadonlyDocument.open(project_path);
			const start = Date.now();
			const pex = LispParser.getDocumentContainer(doc, new Position(151,29));
			const stop = Date.now();
			const diff = stop - start;
			const r = new Range(pex.line, pex.column, pex.atoms.slice(-1)[0].line, pex.atoms.slice(-1)[0].column + 1);
			assert.equal(doc.getText(r), expectation);
		}
		catch (err) {
			assert.fail("Did not return the expected '(= (length retList) 1)' result");
		}
	});


	test("String Source: Test Unix EOLs", function () {
		try { 
			const val = '(defun C:DoStuff (/ pt)\n\t(setq pt (getpoint))\n\t(command ".point" pt)\n\t)';
			const dex = LispParser.getDocumentContainer(val, 0);
			assert.equal(dex.atoms.length, 7);
			assert.equal(dex.linefeed, '\n');
		}
		catch (err) {
			assert.fail("Incorrect parse quantity or EOL value");
		}
	});

	test("String Source: Test Windows EOLs", function () {
		try { 
			const val = '(defun C:DoStuff (/ pt)\r\n\t(setq pt (getpoint))\r\n\t(command ".point" pt)\r\n\t)';
			const dex = LispParser.getDocumentContainer(val, 0);
			assert.equal(dex.atoms.length, 7);
			assert.equal(dex.linefeed, '\r\n');
		}
		catch (err) {
			assert.fail("Incorrect parse quantity or EOL value");
		}
	});

});