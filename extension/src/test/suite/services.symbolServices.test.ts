import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { SymbolServices } from '../../services/symbolServices';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { IRootSymbolHost, SymbolManager } from '../../symbols';
import { LispAtom } from '../../format/sexpression';

let roDoc: ReadonlyDocument;
let symbolMap: IRootSymbolHost;
let flatView: Array<LispAtom>;

suite("Analysis Support: SymbolServices Tests", function () {
	

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");

			// roDoc - used on first test to check ReadOnlyDocument -> Flat Array conversion
			roDoc = ReadonlyDocument.open(lispFileTest);
			symbolMap = SymbolManager.getSymbolMap(roDoc);
			// flatView - used on all other tests because it is more efficient
			flatView = roDoc.documentContainer.flatten();
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});




	test("isNative() test on Known & Unknown symbols", function () {	
		try {
			expect(SymbolServices.isNative('command')).to.equal(true);
			expect(SymbolServices.isNative('COMMAND')).to.equal(false);
			expect(SymbolServices.isNative('xyz')).to.equal(false);
		}
		catch (err) {
			assert.fail("Values known to be or not be native AutoLisp symbols returned unexpected results");
		}
	});




	test("hasGlobalFlag() - Defun exported by multi-line block tag", function () {	
		try {
			const target = symbolMap.items[0].asHost.named;
			const result = SymbolServices.hasGlobalFlag(roDoc, target);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("A known @Global ISymbolReference should not have returned false");
		}
	});

	test("hasGlobalFlag() - Defun exported by single block tag", function () {	
		try {
			const target = symbolMap.items[1].asHost.named;
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("A known @Global ISymbolReference should not have returned false");
		}
	});

	test("hasGlobalFlag() - Defun exported by inline tag", function () {	
		try {
			const target = symbolMap.items[2].asHost.named;
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("A known @Global ISymbolReference should not have returned false");
		}
	});

	test("hasGlobalFlag() - Defun commented but not exported", function () {	
		try {
			const target = symbolMap.items[3].asHost.named;
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("A known non-@Global ISymbolReference should not have returned true");
		}
	});




	test("hasGlobalFlag() - Nested Setq tagged to export but localized", function () {	
		try {
			// this atom is technically localized by the defun, which nullifies the @Global comment.
			// However, this is not the point where the program understands that. The RenameProvider
			// will directly handle that level of due diligence verification for edge cases.
			const target = symbolMap.items[0].asHost.items[3];
			// npm run test ERROR
			const result = SymbolServices.hasGlobalFlag(flatView, target);			
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("A known @Global ISymbolReference should not have returned false");
		}
	});

	test("hasGlobalFlag() - Nested Setq exported inline and not localized", function () {	
		try {
			const target = symbolMap.items[0].asHost.items[4];
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("A known @Global ISymbolReference should not have returned false");
		}
	});

	test("hasGlobalFlag() - Nested Setq localized not export tagged", function () {	
		try {
			const target = symbolMap.items[0].asHost.items[5];
			// npm run test ERROR
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("A known non-@Global ISymbolReference should not have returned true");
		}
	});

	test("hasGlobalFlag() - Nested Setq not localized or export tagged", function () {	
		try {
			const target = symbolMap.items[0].asHost.items[6];
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("A known non-@Global ISymbolReference should not have returned true");
		}
	});

	test("hasGlobalFlag() - using SymbolHost as invalid argument", function () {	
		try {
			const target = symbolMap.items[0];
			const result = SymbolServices.hasGlobalFlag(flatView, target);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("A known invalid ISymbolReference should not have returned true");
		}
	});


}).afterAll(() => {
	// removes parent/child bidirectional references
	symbolMap.dispose();
});