import * as path from 'path';
import { assert, expect } from 'chai';
import { Position } from 'vscode';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { ContainerBuildContext, getDocumentContainer } from '../../parsing/containers';
import { ILispFragment } from '../../astObjects/ILispFragment';
import { primitiveRegex } from '../../astObjects/lispAtom';
import { LispContainer } from '../../astObjects/lispContainer';

suite("LispContainer Tests", function () {

	let roDoc: ReadonlyDocument;
	let frags: Array<ILispFragment>;
	
	let pos1: Position = new Position(98,  100); // based on line: "           downloadPdfs (cadr (NS:ACAD:ListBox "Select PDFs to Download" "Download Drawings" (acad_strlsort (mapcar 'car contractDrawings)) t)))"
	let pos2: Position = new Position(100, 100); // based on line: "     (setq downloadPath (caadr (NS:ACAD:DirPicker "Select Download Path" "Download files" GV:ProjPath)))""
	
	let container: LispContainer;
	let defunRef: LispContainer;
	let defunAlt: LispContainer;
	let exp1: LispContainer;
	let exp2: LispContainer;
	let parent1: LispContainer;
	let parent2: LispContainer;
	let setq1: LispContainer;


	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/pdfMarkups.lsp");
			roDoc = ReadonlyDocument.open(lispFileTest);
			container = getDocumentContainer(new ContainerBuildContext(roDoc)); // covers an specific branch
			defunRef = container.atoms[4].body;
			exp1 = container.getExpressionFromPos(pos1);
			exp2 = container.getExpressionFromPos(pos2);
			parent1 = container.getParentOfExpression(exp1);
			parent2 = container.getParentOfExpression(exp2);
			setq1 = container.atoms[2].body;
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});

	


	test("LispContainer.findChildren(Defun & Foreach) on whole document", function () {
		try {
			const items = container.findChildren(/^DEFUN$|^FOREACH$/i, true);
			defunAlt = items[6].body;
			assert.equal(items.length, 13);
		}
		catch (err) {
			assert.fail("Invalid quantity, has the LSP changed?");
		}
	});




	test("LispContainer.equal()", function () {
		try {
			assert.isTrue(defunAlt.equal(defunRef));
		}
		catch (err) {
			assert.fail("The Container extracted using findChildren() did not match the expected inline Container");
		}
	});




	test("LispContainer.size() Test", function () {
		try {
			assert.equal(defunRef.size(), 22);
		}
		catch (err) {
			assert.fail('The test for size() did not return the expected number of ILispFragments');
		}
	});




	test("LispContainer.length() Test", function () {
		try {
			const defunLast = container.atoms[5];
			assert.isTrue(defunLast instanceof LispContainer);
			assert.equal(defunLast.length(), 392);
		}
		catch (err) {
			assert.fail('The test for length() did not return the expected number of internal ILispFragments');
		}
	});




	test("LispContainer.symbLine() Test", function () {
		try {
			assert.equal(defunRef.symbLine(), 144);
			assert.equal(defunRef.symbLine(false), 35);
		}
		catch (err) {
			assert.fail('The test for symbLine() did not return the expected line numbers');
		}
	});




	test("LispContainer.getRange()", function () {
		try {
			let txt = roDoc.getText(defunRef.getRange());									
			assert.equal(txt.length, 6033);
			txt = roDoc.getText(defunRef.atoms[3].getRange());
			assert.equal(txt.length, 139);
		}
		catch (err) {
			assert.fail("The text returned using the getRange() did not match the expected length");
		}
	});




	test("LispContainer.contains()", function () {
		try {
			assert.isTrue(defunRef.contains(pos2));
			assert.isTrue(defunRef.contains(pos1));
		}
		catch (err) {
			assert.fail("A Position known to exist within the desired Defun LispContainer failed containment check");
		}
	});




	test("LispContainer.getAtomFromPos()", function () {
		try {
			assert.equal(defunRef.getAtomFromPos(pos2).symbol, 'GV:ProjPath');
			assert.equal(defunRef.getAtomFromPos(pos1).symbol, 'acad_strlsort');
			assert.equal(container.getAtomFromPos(new Position(0,0)).symbol, '; random sample file');
			assert.equal(container.getAtomFromPos(new Position(146,5)), null);
			assert.equal(container.getAtomFromPos(new Position(999,5)), null);
		}
		catch (err) {
			assert.fail("A known LispAtom value failed to be reported from a known Position");
		}
	});




	test("LispContainer.getExpressionFromPos()", function () {
		try {
			
			assert.equal(exp1.length(), 43);
			assert.equal(exp1.atoms[1].symbol, 'acad_strlsort');
			assert.equal(exp2.length(), 68);
			assert.equal(exp2.atoms[1].symbol, 'NS:ACAD:DirPicker');
		}
		catch (err) {
			assert.fail("At least one known LispFragment failed to be located at a known Position");
		}
	});




	test("LispContainer.getParentOfExpression()", function () {
		try {
			assert.equal(parent1.length(), 105);
			assert.equal(parent1.atoms[1].symbol, 'NS:ACAD:ListBox');
			assert.equal(parent2.length(), 75);
			assert.equal(parent2.atoms[1].symbol, 'caadr');
		}
		catch (err) {
			assert.fail("At least one known LispContainer failed to be located at a known Position");
		}
	});




	test("LispContainer.nextKeyIndex(forSetq=false)", function () {
		try {
			let itemNext = setq1.nextKeyIndex(0, false);
			assert.equal(itemNext, 1);
			itemNext = setq1.nextKeyIndex(itemNext, false);
			assert.equal(itemNext, 2);				
			itemNext = setq1.nextKeyIndex(itemNext, false);
			assert.equal(itemNext, 5);
			itemNext = setq1.nextKeyIndex(itemNext, false);
			assert.equal(itemNext, 6);
			itemNext = setq1.nextKeyIndex(itemNext, false);
			assert.equal(itemNext, 7);
			itemNext = setq1.nextKeyIndex(itemNext, false);
			assert.equal(itemNext, 8);
			itemNext = setq1.nextKeyIndex(itemNext, false);
			assert.equal(itemNext, -1);
		}
		catch (err) {
			assert.fail("Walking the first global SETQ did not produces the expected indices");
		}
	});

	test("LispContainer.nextKeyIndex(forSetq=true)", function () {
		try {
			let itemNext = setq1.nextKeyIndex(0, true);
			assert.equal(itemNext, 1);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, 2);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, 3);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, 5);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, 6);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, 7);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, 8);
			itemNext = setq1.nextKeyIndex(itemNext, true);
			assert.equal(itemNext, -1);
		}
		catch (err) {
			assert.fail("Walking the first global SETQ did not produces the expected indices");
		}
	});




	test("LispContainer.getNthKeyAtom()", function () {
		try {
			let item = setq1.getNthKeyAtom(0);
			assert.equal(item.symbol, 'setq');
			item = setq1.getNthKeyAtom(1);
			assert.equal(item.symbol, 'some');
			item = setq1.getNthKeyAtom(2);
			assert.equal(item.symbol, '"random"');
			item = setq1.getNthKeyAtom(3);
			assert.equal(item.symbol, 'global');
			item = setq1.getNthKeyAtom(4);
			assert.isTrue(item instanceof LispContainer);
			item = setq1.getNthKeyAtom(5);
			assert.equal(item.symbol, 'with');
			item = setq1.getNthKeyAtom(6);
			assert.isTrue(item instanceof LispContainer);
			assert.isNull(setq1.getNthKeyAtom(7));
		}
		catch (err) {
			assert.fail("Walking the first global SETQ did not produces the expected values");
		}
	});




	test("LispContainer.body", function () {
		try {
			frags = container.atoms[5].body.atoms;
			assert.equal(frags.length, 8);
		}
		catch (err) {
			assert.fail("The fragment quantity from the LispContainer were not as expected");
		}
	});




	test("LispContainer.flatten()", function () {
		try {
			const data = container.atoms.slice(-1)[0].body.atoms.slice(-1)[0];
			const sut = container.flatten();
			expect(sut.length).to.equal(data.flatIndex + 1);
		}
		catch (err) {
			assert.fail("The flatten function did not produce the expected quantity of LispAtoms");
		}
	});




	test("LispContainer.userSymbols & hasGlobalFlag Properties", function () {
		try {
			const data = container.flatten();
			const sut = data[container.userSymbols.get('some')[0]];
			expect(sut.hasGlobalFlag).to.equal(true);
		}
		catch (err) {
			assert.fail("the 'userSymbols' collection was missing a known global flag annotation");
		}
	});




	test("LispContainer basic Truthy functions", function () {
		try {
			const data = container.flatten();
			expect(data[12].isRightParen()).to.equal(true);
			expect(data[1].isLeftParen()).to.equal(true);
			expect(data[0].isComment()).to.equal(true);
			expect(data[0].isLineComment()).to.equal(true);
			expect(data[1].isLispFragment()).to.equal(true);
			expect(container.atoms[1].isLispFragment()).to.equal(true);
		}
		catch (err) {
			assert.fail("One of the common atom symbol value tests failed to recognize a scenario");
		}
	});




	test("LispContainer.isPrimitive()", function () {
		try {
			// sut is used against regex instead of function, but accomplishes the same level of possible
			const sut = ['\'', '.', '(', ')', 
					     '"Single Line"', '"Multi\r\nLine"', 
						 '; line comment', ';| multi-line\r\ncomment |;',
						 'T', 't', 'nil', 'NiL', 'NIL',
						 '123', '-123', '0.23', '-0.23', '3e-10', '-3e+10'
						];
			sut.forEach(value => {
				expect(primitiveRegex.test(value)).to.equal(true);
			});
			
			// continue test with some known atoms
			const data = container.flatten();
			expect(data[0].isPrimitive()).to.equal(true);
			expect(data[1].isPrimitive()).to.equal(true);
			expect(data[12].isPrimitive()).to.equal(true);
			expect(data[2].isPrimitive()).to.equal(false);
			expect(data[11].isPrimitive()).to.equal(false);
			// Also tests a known LispContainer
			expect(container.atoms[1].isPrimitive()).to.equal(false);
		}
		catch (err) {
			assert.fail("One of the primitive symbol value tests failed to recognize a known scenario");
		}
	});




	// this damages the definition of the defun references and must be run last
	test("LispContainer.addAtom()", function () {
		try {
			const count = defunRef.atoms.length;
			defunRef.addAtom(frags[0]);
			assert.equal(defunRef.atoms.length, count + 1);
			defunRef.addAtom(...frags.slice(1));
			assert.equal(defunRef.atoms.length, count + frags.length);
		}
		catch (err) {
			assert.fail("The count of ILispFragments did not match the expected quantity");
		}
	});


});
