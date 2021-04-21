import * as path from 'path';
import * as chai from 'chai';

import { Position, Range } from 'vscode';
import { LispParser } from '../../format/parser';
import { Sexpression, LispContainer } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

var assert = require('chai').assert;
let prefixpath = __filename + "/../../../../extension/src/test/SourceFile/test_case/";
let lispFileTest = path.join(prefixpath + "pdfMarkups.lsp");
let commentFileTest = path.join(prefixpath + "comments.lsp");

suite("LispParser.DocumentContainer Tests", function () {	
	test("Original atomsForest vs DocumentContainer", function () {	
		try {
			const doc = ReadonlyDocument.open(lispFileTest); 
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
			const doc = ReadonlyDocument.open(lispFileTest); 						
			const start = Date.now();
			const iex = LispParser.getDocumentContainer(doc.getText(), 6847);
			const stop = Date.now();
			const diff = stop - start;
			console.log(`\t\tNewParser Processing Time: ${diff}ms`);
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
			const doc = ReadonlyDocument.open(lispFileTest);
			const start = Date.now();
			const pex = LispParser.getDocumentContainer(doc, new Position(151,29));
			const stop = Date.now();
			const diff = stop - start;
			console.log(`\t\tNewParser Processing Time: ${diff}ms`);
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

	test("Comment Extraction Test", function () {
		try { 
			const positions = [
				new Position(0 , 5 ),
				new Position(6 , 14),
				new Position(20, 12),
				new Position(31, 25),
				new Position(41, 11)
			];
			const accumulator = {};
			const doc = ReadonlyDocument.open(commentFileTest); 
			const con = LispParser.getDocumentContainer(doc.fileContent);			
			for (const pos of positions) {
				const atom = con.getAtomFromPos(pos);
				const lsdoc = LispParser.parseDocumentation(atom);
				Object.keys(lsdoc).forEach(k => {
					if (!accumulator[k]) {
						accumulator[k] = [];
					}
					if (k === 'params') {
						accumulator[k].push(...lsdoc[k]);
					} else {
						accumulator[k].push(lsdoc[k]);
					}
				});
			}	
			let paramNames = accumulator['params'].map(p => p.name);
			chai.expect(accumulator['params'].length).to.equal(6);
			chai.expect(accumulator['description'].length).to.equal(5);
			chai.expect(accumulator['returns'].length).to.equal(4);
			chai.expect(accumulator['remarks'].length).to.equal(1);
			chai.expect(paramNames).to.not.have.members(['Param']);
		}
		catch (err) {
			assert.fail("Incorrect parsed comment field block quantities or didn't migrate param variable name");
		}
	});

});