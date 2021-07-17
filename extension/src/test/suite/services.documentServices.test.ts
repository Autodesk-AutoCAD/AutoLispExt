import * as path from 'path';
import * as vscode from 'vscode';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { DocumentServices } from '../../services/documentServices';
import { OpenProjectFile } from '../../project/openProject';
import { ProjectTreeProvider } from '../../project/projectTree';
import { ReadonlyDocument } from '../../project/readOnlyDocument';


suite("Analysis Support: DocumentServices Tests", function () {
	
	let roDoc: ReadonlyDocument;
	let projUri: vscode.Uri;

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");
			roDoc = ReadonlyDocument.open(lispFileTest);
			
			const projectPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/assorted.prj");
			projUri = vscode.Uri.file(projectPath);
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});

	suiteTeardown(() => {
		ProjectTreeProvider.instance().updateData(null);
	});




	test("normalizePath() - should matched expected normalized output", function () {	
		try {
			const testPath = 'C:\\test\\folder\\and\\File.lsp';
			const output = DocumentServices.normalizeFilePath(testPath);			
			expect(output).to.equal('C:/test/folder/and/File.lsp');
		}
		catch (err) {
			assert.fail("Path normalizer function did not return expected normalized path");
		}
	});




	test("findAllDocumentsWithSymbolKey() - expect at least 1 ReadOnlyDocument", function () {	
		try {			
			const sut = DocumentServices.findAllDocumentsWithCustomSymbolKey('a');
			expect(sut.length).to.be.at.least(1);
		}
		catch (err) {
			assert.fail("Invalid quantity of found documents within the Project, Editor & Workspace");
		}
	});
	
	test("findAllDocumentsWithSymbolKey() - expect 0 documents returned", function () {	
		try {
			const rootNode = OpenProjectFile(projUri);	
			ProjectTreeProvider.instance().updateData(rootNode);
			const output = DocumentServices.findAllDocumentsWithCustomSymbolKey('command');
			expect(output.length).to.equal(0);
		}
		catch (err) {
			assert.fail("Invalid quantity of found documents within the Project, Editor & Workspace");
		}
	});




	test("hasUnverifiedGlobalizers() - Expect true using symbols.lsp", function () {	
		try {
			const sut = DocumentServices.hasUnverifiedGlobalizers(roDoc);
			expect(sut).to.equal(true);
		}
		catch (err) {
			assert.fail("Should not return false in source with known/valid @Global comments");
		}
	});

	test("hasUnverifiedGlobalizers() - Expect false using a dynamic lsp", function () {	
		try {
			const malformed = '(defun doStuff()\n(command "line" pause pause)\n(princ))\n;some comment\n(princ)\n32)';
			const memDoc = ReadonlyDocument.createMemoryDocument(malformed, 'lsp');
			const sut = DocumentServices.hasUnverifiedGlobalizers(memDoc);
			expect(sut).to.equal(false);
		}
		catch (err) {
			assert.fail("Should not return true in source without any @Global comments");
		}
	});




	test("hasGlobalizedTargetKey() - GV:Field0 has an @Global, but is also localized", function () {	
		try {
			const sut = DocumentServices.hasGlobalizedTargetKey(roDoc, 'gv:field0');
			expect(sut).to.equal(false);
		}
		catch (err) {
			assert.fail("Invalid quantity of found documents within the Project, Editor & Workspace");
		}
	});

	test("hasGlobalizedTargetKey() - GV:Field1 has an @Global and is not localized", function () {	
		try {			
			const output = DocumentServices.hasGlobalizedTargetKey(roDoc, 'gv:field1');
			expect(output).to.equal(true);
		}
		catch (err) {
			assert.fail("Invalid quantity of found documents within the Project, Editor & Workspace");
		}
	});

	test("hasGlobalizedTargetKey() - target key does not exist", function () {	
		try {			
			const output = DocumentServices.hasGlobalizedTargetKey(roDoc, 'anyRandomName');
			expect(output).to.equal(false);
		}
		catch (err) {
			assert.fail("Should not return true with the provided non-existent key");
		}
	});


});