import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { Location, Position } from 'vscode';
import { AutoLispExtProvideReferences } from "../../providers/referenceProvider";

suite("ReferenceProvider: Tests", function () {
	
	let singleDoc: ReadonlyDocument;
	let wrkspcDoc: ReadonlyDocument;

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const singleLispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/pdfMarkups.lsp");
			const workspaceFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/modelspace utilities.lsp");
			singleDoc = ReadonlyDocument.open(singleLispFileTest);
			wrkspcDoc = ReadonlyDocument.open(workspaceFileTest);
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});

	test("AutoLispExtProvideReferences() - known value type test #1", async function () {	
		try {
			const loc = new Position(91, 30);  // pos of a string
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("Found Locations for known invalid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known value type test #2", async function () {	
		try {
			const loc = new Position(89, 20);  // pos of a comment
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("Found Locations for known invalid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known value type test #3", async function () {	
		try {
			const loc = new Position(85, 87);  // pos of a number
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("Found Locations for known invalid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known native test", async function () {	
		try {
			const loc = new Position(29, 5);  // pos of 'foreach'
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut.length).to.equal(1);
		}
		catch (err) {
			assert.fail("Failed to get Locations for known valid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known localized test #1", async function () {	
		try {
			const loc = new Position(29 , 12);  // pos of 'rando'
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut.length).to.equal(2);
		}
		catch (err) {
			assert.fail("Failed to get Locations for known valid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known localized test #2", async function () {	
		try {
			const loc = new Position(43 , 20);  // pos of 'markups'
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut.length).to.equal(9);
		}
		catch (err) {
			assert.fail("Failed to get Locations for known valid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known localized only test", async function () {	
		try {
			const loc = new Position(71, 24);  // pos of 'ptf'
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut.length).to.equal(1);
		}
		catch (err) {
			assert.fail("Failed to get Locations for known valid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - known non-localized function name test", async function () {	
		try {
			const loc = new Position(114, 30);  // pos of 'collectMarkups'
			const sut = await AutoLispExtProvideReferences(singleDoc, loc);
			expect(sut.length).to.equal(2);
		}
		catch (err) {
			assert.fail("Failed to get Locations for known valid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - workspace known @Global test", async function () {	
		try {
			const loc = new Position(11, 11);  // pos of 'SetTextStyle'
			const sut = await AutoLispExtProvideReferences(wrkspcDoc, loc);
			// should appear in 3 documents
			expect(new Set(sut.map(x => x.uri.fsPath)).size).to.equal(3);
		}
		catch (err) {
			assert.fail("Failed to get workspace Locations for known valid Position/LispAtom");
		}
	});

	test("AutoLispExtProvideReferences() - workspace known Non-@Global test", async function () {	
		try {
			const loc = new Position(17, 11);  // pos of 'SetDimStyle'
			const sut = await AutoLispExtProvideReferences(wrkspcDoc, loc);
			// should appear in 1 document even though it is defined outside of this reference
			expect(new Set(sut.map(x => x.uri.fsPath)).size).to.equal(1);
		}
		catch (err) {
			assert.fail("Failed to get workspace Locations for known valid Position/LispAtom");
		}
	});


});