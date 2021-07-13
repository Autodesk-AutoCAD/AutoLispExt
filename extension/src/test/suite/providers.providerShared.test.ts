import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { FlatContainerServices } from '../../services/flatContainerServices';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { LispAtom } from '../../format/sexpression';
import { SearchHandlers, SharedAtomic } from "../../providers/providerShared";
import { Position } from 'vscode';


suite("Analyzer Support: FlatContainerServices Tests", function () {
	
	let roDoc: ReadonlyDocument;
	let location1: Position = new Position(29 , 5 );
	let location2: Position = new Position(29 , 12);
	let location3: Position = new Position(43 , 20);
	let location4: Position = new Position(71 , 24);
	let location5: Position = new Position(114, 30);

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/pdfMarkups.lsp");
			roDoc = ReadonlyDocument.open(lispFileTest);
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});


	test("Path 1: getSelectionScopeOfWork() && getNonPrimitiveAtomFromPosition()", function () {	
		let msg:string;
		try {
			msg = "Could not locate known non-primitive LispAtom";
			const sut1 = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, location1);
			expect(sut1.symbol).to.equal('foreach');

			msg = "Failed to get scope of work from known LispAtom";
			const sut2 = SearchHandlers.getSelectionScopeOfWork(roDoc, location1, sut1.symbol);
			expect(sut2.isFunction).to.equal(true);
			expect(sut2.parentContainer.line).to.equal(29);
		}
		catch (err) {
			assert.fail(msg);
		}
	});

	test("Path 2: getSelectionScopeOfWork() && getNonPrimitiveAtomFromPosition()", function () {	
		let msg:string;
		try {
			msg = "Could not locate known non-primitive LispAtom";
			const sut1 = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, location2);
			expect(sut1.symbol).to.equal('rando');

			msg = "Failed to get scope of work from known LispAtom";
			const sut2 = SearchHandlers.getSelectionScopeOfWork(roDoc, location2, sut1.symbol);
			expect(sut2.isFunction).to.equal(false);
			expect(sut2.parentContainer.line).to.equal(29);
		}
		catch (err) {
			assert.fail(msg);
		}
	});

	test("Path 3: getSelectionScopeOfWork() && getNonPrimitiveAtomFromPosition()", function () {	
		let msg:string;
		try {
			msg = "Could not locate known non-primitive LispAtom";
			const sut1 = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, location3);
			expect(sut1.symbol).to.equal('markups');

			msg = "Failed to get scope of work from known LispAtom";
			const sut2 = SearchHandlers.getSelectionScopeOfWork(roDoc, location3, sut1.symbol);
			expect(sut2.isFunction).to.equal(false);

			// Technical Debt:
			// This is technically doing what it was designed to do, but I don't agree with it now that the renameProvider
			// introduced some better tooling. A subsequent PR needs to update the gotoProvider using the better tooling
			// and the getSelectionScopeOfWork() will either change drastically or simply go away during that process.			
			expect(sut2.parentContainer.line).to.equal(35);
		}
		catch (err) {
			assert.fail(msg);
		}
	});

	test("Path 4: getSelectionScopeOfWork() && getNonPrimitiveAtomFromPosition()", function () {	
		let msg:string;
		try {
			msg = "Could not locate known non-primitive LispAtom";
			const sut1 = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, location4);
			expect(sut1.symbol).to.equal('pth');

			msg = "Failed to get scope of work from known LispAtom";
			const sut2 = SearchHandlers.getSelectionScopeOfWork(roDoc, location4, sut1.symbol);
			expect(sut2.isFunction).to.equal(false);
			// Technical Debt:
			// This is technically doing what it was designed to do, but I don't agree with it now that the renameProvider
			// introduced some better tooling. A subsequent PR needs to update the gotoProvider using the better tooling
			// and the getSelectionScopeOfWork() will either change drastically or simply go away during that process.			
			expect(sut2.parentContainer.line).to.equal(35);
		}
		catch (err) {
			assert.fail(msg);
		}
	});

	test("Path 5: getSelectionScopeOfWork() && getNonPrimitiveAtomFromPosition()", function () {	
		let msg:string;
		try {
			msg = "Could not locate known non-primitive LispAtom";
			const sut1 = SharedAtomic.getNonPrimitiveAtomFromPosition(roDoc, location5);
			expect(sut1.symbol).to.equal('collectMarkups');

			msg = "Failed to get scope of work from known LispAtom";
			const sut2 = SearchHandlers.getSelectionScopeOfWork(roDoc, location5, sut1.symbol);
			expect(sut2.isFunction).to.equal(true);
			expect(sut2.parentContainer.line).to.equal(35);
		}
		catch (err) {
			assert.fail(msg);
		}
	});


});