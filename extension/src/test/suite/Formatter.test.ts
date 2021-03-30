import * as chai from 'chai';
import * as chaiFiles from 'chai-files';
import { LispFormatter } from '../../format/formatter';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import * as fs from 'fs'
import * as path from 'path';
import * as vscode from 'vscode';
import { after } from 'mocha';
// let prettydiff = require("prettydiff");

chai.use(chaiFiles);
let testDir = path.join(__dirname + "/../../../extension/src/test");
let expect = chai.expect;
let assert = chai.assert;
let file = chaiFiles.file;
let dir = chaiFiles.dir;

describe("LispFormatter Tests", function () {
	after(() => {
		console.log('All tests done!');
	  });
	beforeEach(() => {
		this.timeout(10000);
	})
	it("Lisp Formatter Test case 1", function () {
		console.log("case 1 started ...");

		try {
		let unformat_file1 = path.join(testDir + "/SourceFile/unFormatted1.lsp");
		let formatedOutputFile1 = path.join(testDir + "/OutputFile/formatedOutputFile1.lsp");
		let formatedBasefile1 = path.join(testDir + "/Baseline/formatedBasefile1.lsp");
		console.log("before format...");
		const doc = ReadonlyDocument.open(unformat_file1);
		let fmt = LispFormatter.format(doc, null);
		console.log("after format...");
		console.log("fmt is : " + fmt);
		// fs.writeFileSync(formatedOutputFile1, fmt);
		// expect(file(formatedOutputFile1)).to.equal(file(formatedBasefile1));

		if(fs.existsSync(formatedOutputFile1))
		fs.rmSync(formatedOutputFile1);

		fs.writeFileSync(formatedOutputFile1, fmt);
		expect(file(formatedOutputFile1)).to.equal(file(formatedBasefile1));

		
		// fs.writeFile(formatedOutputFile1, fmt, (err) => {
		// 	if (err) {
		// 		console.error('Failed to write file: ', err);
		// 	}
		// 	// try {
		// 		expect(file(formatedOutputFile1)).to.equal(file(formatedBasefile1));
		// 		console.log("case 1 finisihed");
		// 	// } catch (er) {
		// 	// 	console.log("test case 1 error: " +  er.message);
		// 	// 	assert.fail("The lisp format test case 1 failed");
		// 	// }

		// });
		}
		catch (err) {
			assert.fail("The lisp format test case 1 failed");
		}
	});

	xit("Lisp Formatter Test case 2", function () {
		console.log("case 2 started...");
		try {
		let unformat_file2 = path.join(testDir + "/SourceFile/unFormatted2.lsp");
		let formatedOutputFile2 = path.join(testDir + "/OutputFile/formatedOutputFile2.lsp");
		let formatedBasefile2 = path.join(testDir + "/Baseline/formatedBasefile2.lsp");
		const doc = ReadonlyDocument.open(unformat_file2);
		let fmt = LispFormatter.format(doc, null);
		fs.writeFile(formatedOutputFile2, fmt, (err) => {
			if (err) {
				console.error('Failed to write file: ', err);
			}
			// try {
				expect(file(formatedOutputFile2)).to.equal(file(formatedBasefile2));
			// } catch (er) {
			// 	console.log("test case 2 error: " +  er.message);
			// 	assert.fail("The lisp format test case 2 failed");
			// }
		});
		}
		catch (err) {
			assert.fail("The lisp format test case 2 failed");
		}
	});

	it.skip("Lisp Formatter Test case 3", function () {
		// try {
		let unformat_file3 = path.join(testDir + "/SourceFile/unFormatted3.lsp");
		let formatedOutputFile3 = path.join(testDir + "/OutputFile/formatedOutputFile3.lsp");
		let formatedBasefile3 = path.join(testDir + "/Baseline/formatedBasefile3.lsp");
		const doc = ReadonlyDocument.open(unformat_file3);
		let fmt = LispFormatter.format(doc, null);
		fs.writeFile(formatedOutputFile3, fmt, (err) => {
			if (err) {
				console.error('Failed to write file: ', err);
			}
			try {
				expect(file(formatedOutputFile3)).to.equal(file(formatedBasefile3));
			}
			catch (er) {
				assert.fail("The lisp format test case 3 failed");
			}
		});
		// }
		// catch (err) {
		// 	assert.fail("The lisp format test case 3 failed");
		// }
	});

});
