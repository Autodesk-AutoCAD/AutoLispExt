import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { Position } from 'vscode';
import { AutoLispExtProvideDefinition } from "../../providers/gotoProvider";

suite("GotoProvider: Tests", function () {
	
	let wrkspcDoc: ReadonlyDocument;

	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const workspaceFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/modelspace utilities.lsp");
			wrkspcDoc = ReadonlyDocument.open(workspaceFileTest);
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});



	
	test("AutoLispExtProvideDefinition() - known native test", async function () {	
		try {
			const pos = new Position(22, 58); // target: princ
			const sut = await AutoLispExtProvideDefinition(wrkspcDoc, pos);
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("Result should have been null, but returned a value instead");
		}
	});

	test("AutoLispExtProvideDefinition() - known primitive test", async function () {	
		try {
			const pos = new Position(31, 23); // target: 2000
			const sut = await AutoLispExtProvideDefinition(wrkspcDoc, pos);
			expect(sut).to.equal(null);
		}
		catch (err) {
			assert.fail("Result should have been null, but returned a value instead");
		}
	});


	

	test("AutoLispExtProvideDefinition() - known non-native same-source test #1", async function () {	
		try {
			const pos = new Position(32, 10); // target: LookBusy
			const sut = (await AutoLispExtProvideDefinition(wrkspcDoc, pos))[0];
			expect(sut.range.start.line).to.equal(36);
			expect(sut.range.start.character).to.equal(7);
			expect(sut.uri.fsPath.endsWith('modelspace utilities.lsp')).to.equal(true);
		}
		catch (err) {
			assert.fail("Failed to get expected same-source scope from known LispAtom");
		}
	});

	test("AutoLispExtProvideDefinition() - known non-native same-source test #2", async function () {	
		try {
			const pos = new Position(48, 22); // target: actvDoc (localized)
			const sut = (await AutoLispExtProvideDefinition(wrkspcDoc, pos))[0];
			expect(sut.range.start.line).to.equal(36);
			expect(sut.range.start.character).to.equal(17);
			expect(sut.uri.fsPath.endsWith('modelspace utilities.lsp')).to.equal(true);
		}
		catch (err) {
			assert.fail("Failed to get expected same-source scope from known LispAtom");
		}
	});

	test("AutoLispExtProvideDefinition() - known non-native same-source test #3", async function () {	
		try {
			const pos = new Position(32, 15); // target: actvDoc (non-localized)
			const sut = (await AutoLispExtProvideDefinition(wrkspcDoc, pos))[0];
			expect(sut.range.start.line).to.equal(29);
			expect(sut.range.start.character).to.equal(8);
			expect(sut.uri.fsPath.endsWith('modelspace utilities.lsp')).to.equal(true);
		}
		catch (err) {
			assert.fail("Failed to get expected same-source scope from known LispAtom");
		}
	});




	test("AutoLispExtProvideDefinition() - known non-native external test #1", async function () {	
		try {
			const pos = new Position(25, 20); // target: LoadGlobalVariables
			const sut = (await AutoLispExtProvideDefinition(wrkspcDoc, pos))[0];
			expect(sut.range.start.line).to.equal(13);
			expect(sut.range.start.character).to.equal(7);
			expect(sut.uri.fsPath.endsWith('standards.lsp')).to.equal(true);
		}
		catch (err) {
			assert.fail("Failed to get expected external-source scope from known LispAtom");
		}
	});

	test("AutoLispExtProvideDefinition() - known non-native external test #2", async function () {	
		try {
			const pos = new Position(25, 20); // target: GlobalsAreLoaded
			const sut = (await AutoLispExtProvideDefinition(wrkspcDoc, pos))[0];
			expect(sut.range.start.line).to.equal(13);
			expect(sut.range.start.character).to.equal(7);
			expect(sut.uri.fsPath.endsWith('standards.lsp')).to.equal(true);
		}
		catch (err) {
			assert.fail("Failed to get expected external-source scope from known LispAtom");
		}
	});

	test("AutoLispExtProvideDefinition() - known non-native external test #3", async function () {	
		try {
			const pos = new Position(17, 20); // target: sfc:style3
			const sut = (await AutoLispExtProvideDefinition(wrkspcDoc, pos))[0];
			expect(sut.range.start.line).to.equal(20);
			expect(sut.range.start.character).to.equal(10);
			expect(sut.uri.fsPath.endsWith('standards.lsp')).to.equal(true);
		}
		catch (err) {
			assert.fail("Failed to get expected external-source scope from known LispAtom");
		}
	});


});