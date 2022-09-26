import * as path from 'path';
import { assert, expect } from 'chai';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { DclTile } from '../../astObjects/dclTile';
import { IDclContainer, IDclFragment } from '../../astObjects/dclInterfaces';
import { Position } from 'vscode';
import { DclAttribute } from '../../astObjects/dclAttribute';
import { DclAtom } from '../../astObjects/dclAtom';

suite("AST Objects: DCL Tile", function () {	

	let doc: ReadonlyDocument;	
	suiteSetup(async () => {
		const extRootPath = path.resolve(__dirname, '../../../');
		const dclPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/dialog.dcl");
		doc = ReadonlyDocument.open(dclPath); 
	});


	// Note: these tests indirectly, but also properly cover range, contains, length, firstAtom & lastAtom


	test("DclTile.flatten() Quantities", function () {	
		try {
			const sut = doc.documentDclContainer;
			expect(sut.atoms[2].asTile.flatten().length).to.equal(237);
			expect(sut.atoms[3].asTile.flatten().length).to.equal(77);
			expect(sut.flatten().length).to.equal(316);
		}
		catch (err) {
			assert.fail("The root or an immediate Tile did not flatten to expected quantities");
		}
	});


	test("DclTile.getAtomFromPosition()", function () {
		try {
			const sut = (line: number, column: number): string => {
				return doc.documentDclContainer.getAtomFromPosition(new Position(line, column)).symbol;
			   };

			expect(sut(0, 0)).to.equal('/*\r\nthis is a block\r\ncomment\r\n*/');
			expect(sut(3, 10)).to.equal('// line comment on block tail');
			expect(sut(5, 16)).to.equal('dialog');
			expect(sut(7, 16)).to.equal('"Random Choices Box"');
			expect(sut(12, 35)).to.equal('key');
			expect(sut(31, 16)).to.equal('//boxed row');
		}
		catch (err) {
			assert.fail("A known atom position did not return the expected string value");
		}
	});



	test("DclTile.getParentFrom() TilesOnly == True", function () {
		try {
			const sut = (getLine: number, getColumn: number, expectLine: number, expectColumn: number): boolean => {
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), true);
				return frag === null ? false : frag.line === expectLine && frag.column === expectColumn;
			   };
			expect(sut(4, 0, 0, 0)).to.equal(true); // expect DocumentContainer
			expect(sut(3, 22, 0, 0)).to.equal(true);
			expect(sut(31, 16, 5, 0)).to.equal(true);
			expect(sut(22, 22, 22, 16)).to.equal(true);
			expect(sut(21, 12, 21, 12)).to.equal(true);
			expect(sut(38, 40, 37, 4)).to.equal(true);
			expect(sut(42, 50, 42, 8)).to.equal(true);
		}
		catch (err) {
			assert.fail("A known atom position did not return the expected parent position");
		}
	});
	
	test("DclTile.getParentFrom() TilesOnly == False", function () {
		try {
			const sut = (getLine: number, getColumn: number, expectLine: number, expectColumn: number): boolean => {
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), false);
				return frag === null ? false : frag.line === expectLine && frag.column === expectColumn;
			   };
			expect(sut(4, 0, 0, 0)).to.equal(true);  // expect DocumentContainer
			expect(sut(3, 22, 0, 0)).to.equal(true);
			expect(sut(31, 16, 5, 0)).to.equal(true);
			expect(sut(22, 22, 22, 16)).to.equal(true);
			expect(sut(21, 12, 21, 12)).to.equal(true);
			expect(sut(38, 40, 38, 8)).to.equal(true);
			expect(sut(42, 50, 42, 38)).to.equal(true);
		}
		catch (err) {
			assert.fail("A known atom position did not return the expected parent position");
		}
	});


	test("DclTile.firstNonComment Property", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclFragment => {
				// comments cannot exist in tiles, so results should always be atom 0 when getParentFrom(false) returns an attribute
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
				const container: DclTile|DclAttribute = frag.asAttribute ?? frag.asTile;
				const result = container.firstNonComment;
				return result;
			   };
			expect(sut(0, 1, true)).to.equal(null); // Root should be null since it only contains comments & containers
			expect(sut(6, 12, true).symbol).to.equal('ALE_Dialog1');
			expect(sut(17, 45, true).symbol).to.equal(':');
			expect(sut(36, 22, true).symbol).to.equal('ALE_Dialog2');
			expect(sut(36, 7, false).symbol).to.equal('label');
			expect(sut(42, 30, false).symbol).to.equal('key');
			expect(sut(43, 23, false).symbol).to.equal('width');
		}
		catch (err) {
			assert.fail("The expected container and/or string was not return by the test method");
		}
	});

	test("DclTile.openBracketAtom Property", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclFragment => {
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
				const result = frag.asTile.openBracketAtom;
				return result;
			   };
			expect(sut(0, 1, true)).to.equal(null); // Root should be null since it only contains comments & containers
			expect(sut(6, 12, true).symbol).to.equal('{');
			expect(sut(17, 45, true).symbol).to.equal('{');
			expect(sut(36, 22, true).symbol).to.equal('{');
		}
		catch (err) {
			assert.fail("The expected container and/or string was not return by the test method");
		}
	});

	test("DclTile.closeBracketAtom Property", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclFragment => {
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
				const result = frag.asTile.closeBracketAtom;
				return result;
			   };
			expect(sut(0, 1, true)).to.equal(null); // Root should be null since it only contains comments & containers
			expect(sut(6, 12, true).symbol).to.equal('}');
			expect(sut(17, 45, true).symbol).to.equal('}');
			expect(sut(36, 22, true).symbol).to.equal('}');
		}
		catch (err) {
			assert.fail("The expected container and/or string was not return by the test method");
		}
	});


	test("DclTile.dialogNameAtom Property", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclFragment => {
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
				const result = frag.asTile.dialogNameAtom;
				return result;
			   };
			expect(sut(0, 1, true)).to.equal(null); // Root should be null since it only contains comments & containers
			expect(sut(6, 12, true).symbol).to.equal('ALE_Dialog1');
			expect(sut(17, 45, true)).to.equal(null);
			expect(sut(36, 22, true).symbol).to.equal('ALE_Dialog2');
		}
		catch (err) {
			assert.fail("The expected container and/or string was not return by the test method");
		}
	});
	
	test("DclTile.tileTypeAtom Property", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclFragment => {
				const frag = doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
				const result = frag.asTile.tileTypeAtom;
				return result;
			   };
			expect(sut(0, 1, true)).to.equal(null); // Root should be null since it only contains comments & containers
			expect(sut(6, 12, true).symbol).to.equal('dialog');
			expect(sut(17, 45, true).symbol).to.equal('toggle');
			expect(sut(36, 22, true).symbol).to.equal('dialog');
			expect(sut(39, 27, true).symbol).to.equal('edit_box');
		}
		catch (err) {
			assert.fail("The expected container and/or string was not return by the test method");
		}
	});
	
	
	test("DclTile Misc IDclFragment Obligations", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclContainer => {
				return doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
			   };
			const tile1 = sut(6, 12, true);
			const tile2 = sut(17, 45, true);
			expect(tile1.isComment).to.equal(false);
			expect(tile1.isBlockComment).to.equal(false);
			expect(tile1.isString).to.equal(false);
			expect(tile2.isComment).to.equal(false);
			expect(tile2.isBlockComment).to.equal(false);
			expect(tile2.isString).to.equal(false);
		}
		catch (err) {
			assert.fail("The expected container and/or value was not return by the test method");
		}
	});

	test("DclTile.equal()", function () {
		try {
			const sut = (getLine: number, getColumn: number, getTile: boolean): IDclContainer => {
				return doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), getTile);
			   };
			const realTile = sut(18, 20, true);
			let realIndex = realTile.firstAtom.flatIndex;
			const mockTile = new DclTile('\r\n', [
				new DclAtom(18, 16, ':', realIndex),
				new DclAtom(18, 18, 'spacer', ++realIndex),
				new DclAtom(18, 25, '{', ++realIndex),
				new DclAttribute([
					new DclAtom(18, 27, 'width', ++realIndex),
					new DclAtom(18, 33, '=', ++realIndex),
					new DclAtom(18, 35, '2', ++realIndex),
					new DclAtom(18, 36, ';', ++realIndex)
				]),
				new DclAtom(18, 38, '}', ++realIndex)
			]);

			expect(realTile.equal(mockTile)).to.equal(true);
			(mockTile.atoms[1] as any)['symbol'] = 'spacex';
			expect(realTile.equal(mockTile)).to.equal(false);
		}
		catch (err) {
			assert.fail("The mock failed to equal or continued to equal the known tile before or after alterations");
		}
	});

	

});