import * as path from 'path';
import { assert, expect } from 'chai';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { IDclContainer, IDclFragment } from '../../astObjects/dclInterfaces';
import { Position } from 'vscode';
import { DclAttribute } from '../../astObjects/dclAttribute';
import { DclAtom } from '../../astObjects/dclAtom';

suite("AST Objects: DCL Attribute", function () {	

	let doc: ReadonlyDocument;	
	suiteSetup(async () => {
		const extRootPath = path.resolve(__dirname, '../../../');
		const dclPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/dialog.dcl");
		doc = ReadonlyDocument.open(dclPath); 
	});


	// Note: These tests in conjunction with DCL Tile Tests indirectly, but properly cover:
	//		 range, contains, length, firstAtom, lastAtom & getAtomFromPosition


	test("DclAttribute Misc IDclFragment Obligations", function () {
		try {
			const sut = (getLine: number, getColumn: number): IDclContainer => {
				return doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), false);
			   };
			const att1 = sut(7, 7);
			const att2 = sut(21, 21);
			const att3 = new DclAttribute([]);
			expect(att1.isComment).to.equal(false);
			expect(att1.isBlockComment).to.equal(false);
			expect(att1.isString).to.equal(false);
			expect(att2.isComment).to.equal(false);
			expect(att2.isBlockComment).to.equal(false);
			expect(att2.isString).to.equal(false);
			expect(att3.line).to.equal(-1);
			expect(att3.column).to.equal(-1);
		}
		catch (err) {
			assert.fail("The expected container and/or value was not return by the test method");
		}
	});

	test("DclAttribute.flatten() Quantities", function () {	
		try {
			const getAttFromPos = (getLine: number, getColumn: number): IDclContainer => {
				return doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), false);
			   };
			
			const sut1 = getAttFromPos(44, 30).flatten();
			expect(sut1.length).to.equal(4);
			expect(getAttFromPos(44, 56).flatten(sut1).length).to.equal(8);

			const sut2 = getAttFromPos(46, 8).flatten();
			expect(sut2.length).to.equal(2);
			expect(getAttFromPos(47, 8).flatten(sut2).length).to.equal(4);
		}
		catch (err) {
			assert.fail("The known attribute returned the wrong quantity of atoms");
		}
	});


	test("DclAttribute.equal()", function () {
		try {
			const sut = (getLine: number, getColumn: number): IDclContainer => {
				return doc.documentDclContainer.getParentFrom(new Position(getLine, getColumn), false);
			   };
			const realAtt = sut(18, 30);
			let realIndex = realAtt.firstAtom.flatIndex;
			const mockAtt = new DclAttribute([
				new DclAtom(18, 27, 'width', realIndex),
				new DclAtom(18, 33, '=', ++realIndex),
				new DclAtom(18, 35, '2', ++realIndex),
				new DclAtom(18, 36, ';', ++realIndex)
			]);

			expect(realAtt.equal(mockAtt)).to.equal(true);
			(mockAtt.atoms[0] as any)['symbol'] = 'Width';
			expect(realAtt.equal(mockAtt)).to.equal(false);
		}
		catch (err) {
			assert.fail("The mock failed to equal or continued to equal the known attribute before or after alterations");
		}
	});


	test("DclAttribute.getParentFrom() TilesOnly == False", function () {
		try {
			const sut = (getLine: number, getColumn: number, expectLine: number, expectColumn: number): boolean => {
				const pos = new Position(getLine, getColumn);
				let att = doc.documentDclContainer.getParentFrom(pos);
				if (att === null || att.asTile) {
					return false;
				}
				att = att.asAttribute.getParentFrom(pos);
				return att === null ? false : att.line === expectLine && att.column === expectColumn;
			   };
			expect(sut(4, 0, 0, 0)).to.equal(false);     // reject root block comment
			expect(sut(3, 22, 0, 0)).to.equal(false);    // reject root comment
			expect(sut(31, 16, 5, 0)).to.equal(false);   // reject tile atom
			expect(sut(22, 22, 22, 16)).to.equal(false); // reject tile atom
			expect(sut(21, 12, 21, 12)).to.equal(false); // reject tile atom
			expect(sut(38, 40, 38, 8)).to.equal(true);   // accept attribute atom
			expect(sut(42, 50, 42, 38)).to.equal(true);  // accept attribute atom
			expect(sut(46, 8, 46, 4)).to.equal(true);    // accept attribute atom
		}
		catch (err) {
			assert.fail("A known atom position did not return the expected parent position");
		}
	});


	test("DclAttribute.firstNonComment Property", function () {
		try {
			const sut1 = doc.documentDclContainer.getParentFrom(new Position(36, 7), false);
			const sut2 = doc.documentDclContainer.getParentFrom(new Position(42, 30), false);
			expect(sut1.firstNonComment.symbol).to.equal('label');
			expect(sut2.firstNonComment.symbol).to.equal('key');
			expect(new DclAttribute([]).firstNonComment).to.equal(null);
		}
		catch (err) {
			assert.fail("The expected container and/or string was not return by the test method");
		}
	});

	
	test("DclAttribute Positional Properties", function () {
		try {
			const sut1 = doc.documentDclContainer.getParentFrom(new Position(44, 30), false).asAttribute;
			const sut2 = doc.documentDclContainer.getParentFrom(new Position(46, 7), false).asAttribute;
			const sut3 = new DclAttribute([]);
			expect(sut1.key.symbol).to.equal('key');
			expect(sut2.key.symbol).to.equal('spacer');
			expect(sut3.key).to.equal(null);
			expect(sut1.delineator.symbol).to.equal('=');
			expect(sut2.delineator).to.equal(null);
			expect(sut1.value.symbol).to.equal('"btnOkay"');
			expect(sut2.value).to.equal(null);
			expect(sut1.lastAtom.symbol).to.equal(';');
			expect(sut2.lastAtom.symbol).to.equal(';');
		}
		catch (err) {
			assert.fail("The expected container and/or value was not returned");
		}
	});


	test("DclAttribute Positional Properties", function () {
		try {
			const mod = (item: IDclContainer, idx: number, value: string): void => {
				(item.atoms[idx] as any).symbol = value;
			   };
			const mock = new DclAttribute([
				new DclAtom(18, 27, 'width', 21),
				new DclAtom(18, 33, '=', 22),
				new DclAtom(18, 35, '180', 23),
				new DclAtom(18, 36, ';', 24)
			]);
			expect(mock.isWellFormed).to.equal(true);     // width = 180;
			mod(mock, 1, '*');
			expect(mock.isWellFormed).to.equal(false);    // width * 180;
			mod(mock, 1, '=');
			mod(mock, 0, '"width"');
			expect(mock.isWellFormed).to.equal(false);    // "width" = 180;
			mod(mock, 0, 'width');
			mock.atoms.pop();
			expect(mock.isWellFormed).to.equal(false);    // width = 180
			mock.atoms.pop();
			expect(mock.isWellFormed).to.equal(false);    // width =
			mod(mock, 1, ';');
			expect(mock.isWellFormed).to.equal(true);    // width ;
			mock.atoms.pop();
			expect(mock.isWellFormed).to.equal(false);    // width
			
		}
		catch (err) {
			assert.fail("The expected container and/or value was not returned");
		}
	});

	

	

});
