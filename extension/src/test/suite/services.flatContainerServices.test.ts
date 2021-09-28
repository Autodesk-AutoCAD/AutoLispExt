import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { FlatContainerServices } from '../../services/flatContainerServices';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { LispAtom } from '../../format/sexpression';


suite("Analysis Support: FlatContainerServices Tests", function () {
	
	let roDoc: ReadonlyDocument;
	let flatView: Array<LispAtom>;

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");
			roDoc = ReadonlyDocument.open(lispFileTest);
			flatView = roDoc.documentContainer.flatten();	
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});

	
	test("isPossibleFunctionReference() - Known good function references", function () {	
		try {
			const sut1 = FlatContainerServices.isPossibleFunctionReference(flatView, flatView[42]);
			const sut2 = FlatContainerServices.isPossibleFunctionReference(flatView, flatView[58]);
			expect(sut1).to.equal(true);
			expect(sut2).to.equal(true);
		}
		catch (err) {
			assert.fail("Known value returned unexpected False result");
		}
	});

	test("isPossibleFunctionReference() - Known bad function references", function () {	
		try {
			const sut1 = FlatContainerServices.isPossibleFunctionReference(flatView, flatView[72]);
			const sut2 = FlatContainerServices.isPossibleFunctionReference(flatView, flatView[79]);
			const sut3 = FlatContainerServices.isPossibleFunctionReference(flatView, flatView[95]);
			expect(sut1).to.equal(false);
			expect(sut2).to.equal(false);
			expect(sut3).to.equal(false);
		}
		catch (err) {
			assert.fail("Known value returned unexpected True result");
		}
	});

	test("verifyAtomIsDefunAndGlobalized() - Valid global defun from Inline Comment", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsDefunAndGlobalized(flatView, flatView[42]);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("Known value returned unexpected False result");
		}
	});

	test("verifyAtomIsDefunAndGlobalized() - Valid global defun from Block Comment", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsDefunAndGlobalized(flatView, flatView[32]);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("Known value returned unexpected False result");
		}
	});

	test("verifyAtomIsDefunAndGlobalized() - Is defun but not globalized", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsDefunAndGlobalized(flatView, flatView[53]);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("Known value returned unexpected True result");
		}
	});

	test("verifyAtomIsDefunAndGlobalized() - Invalid non-defun scope", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsDefunAndGlobalized(flatView, flatView[75]);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("Known value returned unexpected True result");
		}
	});




	test("verifyAtomIsSetqAndGlobalized() - Valid setq & global by Block Comment", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsSetqAndGlobalized(flatView, flatView[67]);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("Known value returned unexpected False result");
		}
	});

	test("verifyAtomIsSetqAndGlobalized() - Valid setq & global by Inline Comment", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsSetqAndGlobalized(flatView, flatView[72]);
			expect(result).to.equal(true);
		}
		catch (err) {
			assert.fail("Known value returned unexpected False result");
		}
	});
	
	test("verifyAtomIsSetqAndGlobalized() - Invalid global, but is setq scope", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsSetqAndGlobalized(flatView, flatView[75]);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("Known value returned unexpected True result");
		}
	});

	test("verifyAtomIsSetqAndGlobalized() - Invalid global and non-setq scope", function () {	
		try {
			const result = FlatContainerServices.verifyAtomIsSetqAndGlobalized(flatView, flatView[78]);
			expect(result).to.equal(false);
		}
		catch (err) {
			assert.fail("Known value returned unexpected True result");
		}
	});


});