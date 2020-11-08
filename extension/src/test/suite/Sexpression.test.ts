import * as path from 'path';
import { Position } from 'vscode';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

var assert = require('chai').assert;
let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");
let pos: Position = new Position(100, 100);

suite("ReadonlyDocument.findExpressions() Tests", function () {
	let found = 0;
	let doc: ReadonlyDocument = ReadonlyDocument.open(project_path);
	try {
		const items = doc.findExpressions(/^DEFUN$|^FOREACH$/i, true);

		test("Count of Defun & Foreach", function () {
			try {
				assert.equal(items.length, 13);
			}
			catch (err) {
				assert.fail("Invalid quantity, has the LSP changed?");
			}
		});

		items.forEach((exp, i) => {
			if (exp.contains(pos)){				
				test("Sexpression.getRange()", function () {
					try {
						const txt = doc.getText(exp.getRange());									
						assert.equal(txt.length, 6033);
					}
					catch (err) {
						assert.fail("Invalid range from Sexpression");
					}
				});

				test("Sexpression.nextKeyIndex()", function () {
					try {
						const first = exp.nextKeyIndex(0);
						const second = exp.nextKeyIndex(first);
						assert.equal(exp.atoms[second].symbol, "DumpPidMarkups");
					}
					catch (err) {
						assert.fail("Found Sexpression sub-atom did not match expectation");
					}
				});

				test("Sexpression.findChildren()", function () {
					try {
						assert.notEqual(exp.findChildren(/VL-FILENAME-BASE/i, false).length, 0);
					}
					catch (err) {
						assert.fail("Failed to find expected Sexpression child");
					}
				});
			}
			found = i;
		});	
		
	} catch (error) {
		assert.fail("Failed to navigate the ReadonlyDocument.atomsForest");
	}

});
