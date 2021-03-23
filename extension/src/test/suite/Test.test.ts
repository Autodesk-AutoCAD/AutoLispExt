import * as path from 'path';
import * as chai from 'chai';

import { Position, Range } from 'vscode';
import { LispParser } from '../../format/parser';
import { Sexpression, LispContainer } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

// var assert = require('chai').assert;
let assert = chai.assert;
let lispFileTest = path.join(__dirname + "/../../../test_case/pdfMarkups.lsp");
console.log('lispFileTest is ' + lispFileTest);

suite("LispParser.DocumentContainer Tests", function () {	
	test("empty test to run", function () {	
		try {
			console.log('Test!');
		}
		catch (err) {
			assert.fail("Test Failed!");
		}
	});



});