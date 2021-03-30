import * as chai from 'chai';
import * as chaiFiles from 'chai-files';
import { Position } from 'vscode';
import { LispAtom } from '../../format/sexpression';
import { LispFormatter } from '../../format/formatter';
import { TextDocument } from 'vscode';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import * as fs from 'fs'
import * as path from 'path';

// let prettydiff = require("prettydiff");

chai.use(chaiFiles);
let testDir = path.join(__dirname + "/../../../extension/src/test");
let expect = chai.expect;
let assert = chai.assert;
let file = chaiFiles.file;
let dir = chaiFiles.dir;

suite("LispFormatter Tests", function () {	
	test("Lisp Formatter Test case 1", function () {
		try {
			let unformat_file1 = path.join(testDir + "/SourceFile/unFormatted1.lsp");
			let formatedOutputFile1 = path.join(testDir + "/OutputFile/formatedOutputFile1.lsp");
			let formatedBasefile1 = path.join(testDir + "/Baseline/formatedBasefile1.lsp");
			const doc = ReadonlyDocument.open(unformat_file1); 						
			let fmt = LispFormatter.format(doc, null);
			fs.writeFile(formatedOutputFile1, fmt, err => {
					if (err) {
						console.error('Failed to write file: ', err);
					} 
					try {
						expect(file(formatedOutputFile1)).to.equal(file(formatedBasefile1));
					} catch (err) {
						assert.fail("The lisp format test case 1 failed");
					}
				});
		}
		catch (err) {
			assert.fail("The lisp format test case 1 failed");
		}
	});

	test("Lisp Formatter Test case 2", function () {
		try {
			let unformat_file2 = path.join(testDir + "/SourceFile/unFormatted2.lsp");
			let formatedOutputFile2 = path.join(testDir + "/OutputFile/formatedOutputFile2.lsp");
			let formatedBasefile2 = path.join(testDir + "/Baseline/formatedBasefile2.lsp");
			const doc = ReadonlyDocument.open(unformat_file2); 						
			let fmt = LispFormatter.format(doc, null);
			fs.writeFile(formatedOutputFile2, fmt, err => {
					if (err) {
						console.error('Failed to write file: ', err);
					} 
					try {
						expect(file(formatedOutputFile2)).to.equal(file(formatedBasefile2));
					} catch (err) {
						assert.fail("The lisp format test case 2 failed");
					}
				});
		}
		catch (err) {
			assert.fail("The lisp format test case 2 failed");
		}
	});

	test("Lisp Formatter Test case 3", function () {
		try {
			let unformat_file3 = path.join(testDir + "/SourceFile/unFormatted3.lsp");
			let formatedOutputFile3 = path.join(testDir + "/OutputFile/formatedOutputFile3.lsp");
			let formatedBasefile3 = path.join(testDir + "/Baseline/formatedBasefile3.lsp");
			const doc = ReadonlyDocument.open(unformat_file3); 						
			let fmt = LispFormatter.format(doc, null);
			fs.writeFile(formatedOutputFile3, fmt, err => {
					if (err) {
						console.error('Failed to write file: ', err);
					} 
					try{
						expect(file(formatedOutputFile3)).to.equal(file(formatedBasefile3));
					}
					catch (err) {
						assert.fail("The lisp format test case 3 failed");
					}
				});
		}
		catch (err) {
			assert.fail("The lisp format test case 3 failed");
		}
	});

});
