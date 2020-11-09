import * as path from 'path';
import { Position } from 'vscode';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

var assert = require('chai').assert;
let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");
let pos: Position = new Position(100, 100); // based on line: (setq downloadPath (caadr (NS:ACAD:DirPicker "Select Download Path" "Download files" GV:ProjPath)))

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
				
				test("Sexpression.getSexpressionFromPos()", function () {
					try {
						const sexp = exp.getSexpressionFromPos(pos);
						const txt = doc.getText(sexp.getRange());
						assert.equal(txt.length, 71);
					}
					catch (err) {
						assert.fail("Invalid quantity, has the LSP changed?");
					}
				});

				test("Sexpression.getParentSexpression()", function () {
					try {
						const sexp = exp.getSexpressionFromPos(pos);
						const par1 = exp.getParentOfSexpression(sexp);
						const par2 = exp.getParentOfSexpression(par1);
						const txt = doc.getText(par2.getRange());
						assert.equal(txt.length, 99);
					}
					catch (err) {
						assert.fail("Invalid quantity, has the LSP changed?");
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
