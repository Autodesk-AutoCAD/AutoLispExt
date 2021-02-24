import { debug } from 'console';
import * as path from 'path';
import { debuglog } from 'util';
import { Position, Range } from 'vscode';
import { LispParser } from '../../format/parser';
import { Sexpression } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';


var assert = require('chai').assert;
let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");


suite("LispParser.DocumentExpression Tests", function () {	
	test("Original atomsForest vs DocumentSexpression", function () {	
		try {
			const doc = ReadonlyDocument.open(project_path); 						
			const v1Start = Date.now();
			const v1items = doc.atomsForest.filter(x => x instanceof Sexpression);
			const v1Stop = Date.now();
			const dex = LispParser.getDocumentSexpression(doc.fileContent);			
			const v2items = dex.atoms.filter(x => x instanceof Sexpression);
			const v2Stop = Date.now();			
			const v1Diff = v1Stop - v1Start;
			const v2Diff = v2Stop - v1Stop;		
			assert.isTrue(v2Diff <= v1Diff || v1Diff - v2Diff <= 2);
			assert.equal(v2items.length, v1items.length);
		}
		catch (err) {
			assert.fail("Each version returned a different number of Sexpressions");
		}
	});


	test("DocumentSexpression using index", function () {		
		try {
			const expectation = '(= (length retList) 1)';
			const doc = ReadonlyDocument.open(project_path); 						
			// tried testing the tolkenize version, but it doesn't actually work for me. Gets stuck in an infinite loop.
				// const v1Start = Date.now();
				// const p = new LispParser(doc);
				// p.tokenizeString(doc.getText(), 310);
				// const v1items = p.atomsForest.filter(x => x instanceof Sexpression);
			const v1Stop = Date.now();
			const iex = LispParser.getDocumentSexpression(doc.getText(), 6847);
			const v2items = iex.atoms.filter(x => x instanceof Sexpression);
			const v2Stop = Date.now();									

				// const v1Diff = v1Stop - v1Start;
			const v2Diff = v2Stop - v1Stop;
				//assert.isTrue(v2Diff <= v1Diff);
				// assert.equal(v2items.length, v1items.length);

				// can't currently use the Sexpression getRange because there are ending character differences between my implementation and the atoms forest that need to be worked out.
			const r = new Range(iex.line, iex.column, iex.atoms.slice(-1)[0].line, iex.atoms.slice(-1)[0].column + 1);
			assert.equal(doc.getText(r), expectation);
		}
		catch (err) {
			assert.fail("Each version returned a different number of Sexpressions");
		}
	});

	test("DocumentSexpression using vscode.Position", function () {		
		try {
			const expectation = '(= (length retList) 1)';
			const doc = ReadonlyDocument.open(project_path);
			const v1Stop = Date.now();
			const pex = LispParser.getDocumentSexpression(doc, new Position(151,29));
			const v2Stop = Date.now();
			const v2Diff = v2Stop - v1Stop;
			// can't currently use the Sexpression getRange because there are ending character differences between my implementation and the atoms forest that need to be worked out.
			const r = new Range(pex.line, pex.column, pex.atoms.slice(-1)[0].line, pex.atoms.slice(-1)[0].column + 1);
			assert.equal(doc.getText(r), expectation);
		}
		catch (err) {
			assert.fail("Each version returned a different number of Sexpressions");
		}
	});


	test("String Source: Test Unix EOLs", function () {
		try { 
			const val = '(defun C:DoStuff (/ pt)\n\t(setq pt (getpoint))\n\t(command ".point" pt)\n\t)';
			const dex = LispParser.getDocumentSexpression(val, 0);
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
			const dex = LispParser.getDocumentSexpression(val, 0);
			assert.equal(dex.atoms.length, 7);
			assert.equal(dex.linefeed, '\r\n');
		}
		catch (err) {
			assert.fail("Incorrect parse quantity or EOL value");
		}
	});

});