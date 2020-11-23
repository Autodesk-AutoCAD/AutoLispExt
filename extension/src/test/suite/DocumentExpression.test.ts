import * as path from 'path';
import { LispParser } from '../../format/parser';
import { Sexpression } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

var assert = require('chai').assert;
let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");


suite("LispParser.DocumentExpression Tests", function () {	
	test("Original atomsForest vs new version", function () {		
		try {
			const doc = ReadonlyDocument.open(project_path); 						
			const v1Start = Date.now();
			const v1items = doc.atomsForest.filter(x => x instanceof Sexpression);
			const v1Stop = Date.now();
			const dex = LispParser.getDocumentSexpression(doc);
			const v2items = dex.atoms.filter(x => x instanceof Sexpression);
			const v2Stop = Date.now();
			const v1Diff = v1Stop - v1Start;
			const v2Diff = v2Stop - v1Stop;
			assert.isTrue(v2Diff <= v1Diff);
			assert.equal(v2items.length, v1items.length);
			
		}
		catch (err) {
			assert.fail("Each version returned a different number of Sexpressions");
		}
	});


	test("String Source: Test Unix EOLs", function () {
		try { 
			const val = '(defun C:DoStuff (/ pt)\n\t(setq pt (getpoint))\n\t(command ".point" pt)\n\t)';
			const dex = LispParser.getDocumentSexpression(val);
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
			const dex = LispParser.getDocumentSexpression(val);
			assert.equal(dex.atoms.length, 7);
			assert.equal(dex.linefeed, '\r\n');
		}
		catch (err) {
			assert.fail("Incorrect parse quantity or EOL value");
		}
	});

});


