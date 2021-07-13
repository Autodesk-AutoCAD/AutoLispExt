import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { LispContainerServices } from '../../services/lispContainerServices';
import { ReadonlyDocument } from '../../project/readOnlyDocument';


suite("Analysis Support: LispContainerServices Tests", function () {

	let roDoc: ReadonlyDocument;

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");
			roDoc = ReadonlyDocument.open(lispFileTest);
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});




	test("getLispContainerTypeName() - valid container inputs", function () {	
		try {
			const defun = LispContainerServices.getLispContainerTypeName(roDoc.documentContainer.atoms[1]);
			const setq = LispContainerServices.getLispContainerTypeName(roDoc.documentContainer.atoms[7]);
			expect(defun).to.equal('defun');
			expect(setq).to.equal('setq');
		}
		catch (err) {
			assert.fail("Known LispContainers did not produce expected value results");
		}
	});

	test("getLispContainerTypeName() - primitive container input", function () {	
		try {
			const qList = LispContainerServices.getLispContainerTypeName(roDoc.documentContainer.atoms[11].body.atoms[3]);
			expect(qList).to.equal('*primitive*');
		}
		catch (err) {
			assert.fail("Known LispContainers did not produce expected value results");
		}
	});

	test("getLispContainerTypeName() - invalid container input", function () {	
		try {
			const unknown = LispContainerServices.getLispContainerTypeName(roDoc.documentContainer.atoms[11].body.atoms[6]);
			expect(unknown).to.equal('*invalid*');
		}
		catch (err) {
			assert.fail("Known invalid LispAtom input did not produce expected value results");
		}
	});

	test("getLispContainerTypeName() - invalid atomic input", function () {	
		try {
			const unknown = LispContainerServices.getLispContainerTypeName(roDoc.documentContainer.atoms[0]);
			expect(unknown).to.equal('*unknown*');
		}
		catch (err) {
			assert.fail("Known invalid LispAtom input did not produce expected value results");
		}
	});


});