import * as path from 'path';

import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { Position, Uri } from 'vscode';
//import { ILispFragment } from '../../format/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { RootSymbolMapHost, SymbolManager } from '../../symbols';
import { TDD, AutoLispExtPrepareRename, AutoLispExtProvideRenameEdits } from '../../providers/renameProvider';
import { AutoLispExt } from '../../extension';
//import { SharedAtomic } from '../../providers/providerShared';

let docSymbols: RootSymbolMapHost;

suite("RenameProvider: Tests", function () {	
	let roDoc: ReadonlyDocument;
	let good: Position;
	let bad: Position;
	let native: Position;
	let outlier: Position;
	let localized: Position;
	let globalDefun: Position;
	let localArg: Position;
	//let atom: ILispFragment;

	suiteSetup(() => {
		const extRootPath = path.resolve(__dirname, '../../../');
		const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/standards.lsp");
		roDoc = AutoLispExt.Documents.tryGetDocument(lispFileTest);
		good = new Position(24, 21);
		bad = new Position(1, 0);
		native = new Position(51, 22);
		outlier = new Position(64, 14);
		localized = new Position(54, 20);
		globalDefun = new Position(36, 14);
		localArg = new Position(50, 24);
	});




	test("Testing: AutoLispExtPrepareRename() Valid Atom", function () {	
		try {
			const prepResult = AutoLispExtPrepareRename(roDoc, good);
			expect(prepResult.range.start.line).to.equal(24);
			expect(prepResult.range.end.line).to.equal(24);
			expect(prepResult.range.start.character).to.equal(10);
			expect(prepResult.range.end.character).to.equal(26);
			expect(prepResult.placeholder).to.equal('GlobalsAreLoaded');
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtPrepareRename() Invalid Atom", function () {	
		try {
			expect(AutoLispExtPrepareRename(roDoc, bad)).to.equal(null);
		}
		catch (err) {
			assert.fail("The known bad position did not error");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() Un-Hosted Atom", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, outlier, 'anything');
			expect(sut.entries().length).to.equal(1);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() Localized Atom", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, localized, 'activeDOC');
			expect(sut.entries().length).to.equal(1);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() Exported Defun", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, globalDefun, 'otherFunc');
			expect(sut.entries().length).to.equal(3);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() Documented Local Argument", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, localArg, 'dim');
			expect(sut.entries().length).to.equal(1);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() bad user input", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, good, 'a b c');
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() bad user target", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, native, 'whatever');
			expect(sut.entries().length).to.equal(1);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits() good user input", async function () {	
		try {
			const sut = await AutoLispExtProvideRenameEdits(roDoc, good, 'anything');			
			expect(sut.size).to.equal(2);
			expect(sut['_edits'].length).to.equal(4);
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});

	test("Testing: AutoLispExtProvideRenameEdits()", async function () {	
		try {
			const prepResult = await AutoLispExtProvideRenameEdits(roDoc, good, 'Autoquad');
			prepResult.entries().forEach(item => {
				const uri: Uri = item[0];
				item[1].forEach(edit => {
					expect(edit.newText).to.equal('Autoquad');
				});
			});
		}
		catch (err) {
			assert.fail("The known position failed to produced results or results other than expected");
		}
	});







	test("Testing: getRenameTargetsFromParentScope()", function () {	
		try {
			docSymbols = SymbolManager.getSymbolMap(roDoc);
			const targets = TDD.getRenameTargetsFromParentScope(roDoc, docSymbols, 'globalsareloaded');
			expect(targets.length).to.equal(3);
		}
		catch (err) {
			assert.fail("The test global symbol query produced no results or an unexpected quantity");
		}
	});


	test("Testing: getTargetSymbolReference() with bad inputs", function () {	
		try {
			docSymbols = SymbolManager.getSymbolMap(roDoc);
			const sut = TDD.getTargetSymbolReference(docSymbols, 'missing', -1);
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("The test symbol values failed to produce expected results");
		}
	});

	test("Testing: hasGlobalizer() with unused key name", function () {	
		try {
			const sut = TDD.hasGlobalizer([roDoc], 'missing');
			expect(sut).to.equal(false);
		}
		catch (err) {
			assert.fail("The test symbol values failed to produce expected results");
		}
	});

	
	// TDD.hasGlobalizer
	
	test("Testing: isValidInput()", function () {	
		try {
			expect(TDD.isValidInput('space test')).to.equal(false);
			expect(TDD.isValidInput('"stringTest"')).to.equal(false);
			expect(TDD.isValidInput('1.25')).to.equal(false);
			expect(TDD.isValidInput('ok45')).to.equal(true);
		}
		catch (err) {
			assert.fail("The test symbol values failed to produce expected results");
		}
	});

	// TDD.normalizeUserProvidedValue
	// TDD.populateEdits
	// TDD.populateEditsFromDocumentList
	// TDD.provideRenameEditsWorker
	


	


}).afterAll(() => {
	// removes parent/child bidirectional references
	if (docSymbols.isValid) {
		docSymbols.dispose();
	}
});