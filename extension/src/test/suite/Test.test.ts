import * as path from 'path';
import * as chai from 'chai';

import { Position, Range } from 'vscode';
import { LispParser } from '../../format/parser';
import { Sexpression, LispContainer } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { readFile,readFileSync } from 'fs';

// var assert = require('chai').assert;
let assert = chai.assert;
let lispFileTest = path.join(__dirname + "/../../../test_case/pdfMarkups.lsp");
console.log('lispFileTest is ' + lispFileTest);

suite("LispParser.DocumentContainer Tests", function () {	
	test("empty test to run", function () {	
		try {
			// let doc = readFileSync(lispFileTest,'utf8')
			// console.log("Asynchronous read: " + doc.toString());
			
			const doc = ReadonlyDocument.open(lispFileTest); 
			console.log('file is opened');
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

			// readFile(lispFileTest, function (err, data) {
			// 	if (err) {
			// 		return console.error(err);
			// 	}
				
			// });
		}
		catch (err) {
			assert.fail("Test Failed!");
		}
	});



});