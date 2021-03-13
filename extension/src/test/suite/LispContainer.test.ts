import * as path from 'path';
import * as chai from 'chai';
import { Position } from 'vscode';
import { ILispFragment, LispContainer } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { LispParser } from '../../format/parser';

let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");
let pos1: Position = new Position(98,  100); // based on line: "           downloadPdfs (cadr (NS:ACAD:ListBox "Select PDFs to Download" "Download Drawings" (acad_strlsort (mapcar 'car contractDrawings)) t)))"
let pos2: Position = new Position(100, 100); // based on line: "     (setq downloadPath (caadr (NS:ACAD:DirPicker "Select Download Path" "Download files" GV:ProjPath)))"

suite("LispContainer Tests", function () {
	try {
		const doc = ReadonlyDocument.open(project_path);
		const container = LispParser.getDocumentContainer(doc.getText());
		let defunRef: LispContainer = container.atoms[4] as LispContainer;
		let defunAlt: LispContainer;


		test("LispContainer.findChildren(Defun & Foreach) on whole document", function () {
			try {
				const items = container.findChildren(/^DEFUN$|^FOREACH$/i, true);
				defunAlt = items[6] as LispContainer;
				chai.assert.equal(items.length, 13);
			}
			catch (err) {
				chai.assert.fail("Invalid quantity, has the LSP changed?");
			}
		});
		

		test("LispContainer.equal()", function () {
			try {
				chai.assert.isTrue(defunAlt.equal(defunRef));
			}
			catch (err) {
				chai.assert.fail("The Container extracted using findChildren() did not match the expected inline Container");
			}
		});


		test("LispContainer.size() Test", function () {
			try {
				chai.assert.equal(defunRef.size(), 22);
			}
			catch (err) {
				chai.assert.fail('The test for size() did not return the expected number of ILispFragments');
			}
		});


		test("LispContainer.length() Test", function () {
			try {
				const defunLast = container.atoms[5];
				chai.assert.isTrue(defunLast instanceof LispContainer);
				chai.assert.equal(defunLast.length(), 392);
			}
			catch (err) {
				chai.assert.fail('The test for length() did not return the expected number of internal ILispFragments');
			}
		});


		test("LispContainer.symbLine() Test", function () {
			try {
				chai.assert.equal(defunRef.symbLine(), 144);
				chai.assert.equal(defunRef.symbLine(false), 35);
			}
			catch (err) {
				chai.assert.fail('The test for symbLine() did not return the expected line numbers');
			}
		});
		

		test("LispContainer.getRange()", function () {
			try {
				let txt = doc.getText(defunRef.getRange());									
				chai.assert.equal(txt.length, 6033);
				txt = doc.getText(defunRef.atoms[3].getRange());
				chai.assert.equal(txt.length, 139);
			}
			catch (err) {
				chai.assert.fail("The text returned using the getRange() did not match the expected length");
			}
		});


		test("LispContainer.contains()", function () {
			try {
				chai.assert.isTrue(defunRef.contains(pos2));
				chai.assert.isTrue(defunRef.contains(pos1));
			}
			catch (err) {
				chai.assert.fail("A Position known to exist within the desired Defun LispContainer failed containment check");
			}
		});


		test("LispContainer.getAtomFromPos()", function () {
			try {
				chai.assert.equal(defunRef.getAtomFromPos(pos2).symbol, 'GV:ProjPath');
				chai.assert.equal(defunRef.getAtomFromPos(pos1).symbol, 'acad_strlsort');
				chai.assert.equal(container.getAtomFromPos(new Position(0,0)).symbol, '; random sample file');
				chai.assert.equal(container.getAtomFromPos(new Position(147,5)), null);
			}
			catch (err) {
				chai.assert.fail("A known LispAtom value failed to be reported from a known Position");
			}
		});


		const exp1 = container.getExpressionFromPos(pos1);
		const exp2 = container.getExpressionFromPos(pos2);
		test("LispContainer.getExpressionFromPos()", function () {
			try {
				chai.assert.equal(exp1.length(), 43);
				chai.assert.equal(exp1.atoms[1].symbol, 'acad_strlsort');
				chai.assert.equal(exp2.length(), 68);
				chai.assert.equal(exp2.atoms[1].symbol, 'NS:ACAD:DirPicker');
			}
			catch (err) {
				chai.assert.fail("At least one known LispFragment failed to be located at a known Position");
			}
		});


		const parent1 = container.getParentOfExpression(exp1);
		const parent2 = container.getParentOfExpression(exp2);
		test("LispContainer.getParentOfExpression()", function () {
			try {
				chai.assert.equal(parent1.length(), 105);
				chai.assert.equal(parent1.atoms[1].symbol, 'NS:ACAD:ListBox');
				chai.assert.equal(parent2.length(), 75);
				chai.assert.equal(parent2.atoms[1].symbol, 'caadr');
			}
			catch (err) {
				chai.assert.fail("At least one known LispContainer failed to be located at a known Position");
			}
		});


		const setq1 = container.atoms[2] as LispContainer;
		test("LispContainer.nextKeyIndex(forSetq=false)", function () {
			try {
				let itemNext = setq1.nextKeyIndex(0, false);
				chai.assert.equal(itemNext, 1);
				itemNext = setq1.nextKeyIndex(itemNext, false);
				chai.assert.equal(itemNext, 2);				
				itemNext = setq1.nextKeyIndex(itemNext, false);
				chai.assert.equal(itemNext, 5);
				itemNext = setq1.nextKeyIndex(itemNext, false);
				chai.assert.equal(itemNext, 6);
				itemNext = setq1.nextKeyIndex(itemNext, false);
				chai.assert.equal(itemNext, 7);
				itemNext = setq1.nextKeyIndex(itemNext, false);
				chai.assert.equal(itemNext, 8);
				itemNext = setq1.nextKeyIndex(itemNext, false);
				chai.assert.equal(itemNext, -1);
			}
			catch (err) {
				chai.assert.fail("Walking the first global SETQ did not produces the expected indices");
			}
		});


		test("LispContainer.nextKeyIndex(forSetq=true)", function () {
			try {
				let itemNext = setq1.nextKeyIndex(0, true);
				chai.assert.equal(itemNext, 1);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, 2);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, 3);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, 5);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, 6);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, 7);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, 8);
				itemNext = setq1.nextKeyIndex(itemNext, true);
				chai.assert.equal(itemNext, -1);
			}
			catch (err) {
				chai.assert.fail("Walking the first global SETQ did not produces the expected indices");
			}
		});


		test("LispContainer.getNthKeyAtom()", function () {
			try {
				let item = setq1.getNthKeyAtom(0);
				chai.assert.equal(item.symbol, 'setq');
				item = setq1.getNthKeyAtom(1);
				chai.assert.equal(item.symbol, 'some');
				item = setq1.getNthKeyAtom(2);
				chai.assert.equal(item.symbol, '"random"');
				item = setq1.getNthKeyAtom(3);
				chai.assert.equal(item.symbol, 'global');
				item = setq1.getNthKeyAtom(4);
				chai.assert.isTrue(item instanceof LispContainer);
				item = setq1.getNthKeyAtom(5);
				chai.assert.equal(item.symbol, 'with');
				item = setq1.getNthKeyAtom(6);
				chai.assert.isTrue(item instanceof LispContainer);
				chai.assert.isNull(setq1.getNthKeyAtom(7));
			}
			catch (err) {
				chai.assert.fail("Walking the first global SETQ did not produces the expected values");
			}
		});
		

		let frags: Array<ILispFragment>;
		test("LispContainer.body", function () {
			try {
				frags = container.atoms[5].body.atoms;
				chai.assert.equal(frags.length, 8);
			}
			catch (err) {
				chai.assert.fail("The fragment quantity from the LispContainer were not as expected");
			}
		});


		// this damages the definition of the defun references and must be run last
		test("LispContainer.addAtom()", function () {
			try {
				const count = defunRef.atoms.length;
				defunRef.addAtom(frags[0]);
				chai.assert.equal(defunRef.atoms.length, count + 1);
				defunRef.addAtom(...frags.slice(1));
				chai.assert.equal(defunRef.atoms.length, count + frags.length);
			}
			catch (err) {
				chai.assert.fail("The count of ILispFragments did not match the expectated quantity");
			}
		});


	} catch (error) {
		chai.assert.fail("Failed to setup LispContainer Resources for testing");
	}


});
