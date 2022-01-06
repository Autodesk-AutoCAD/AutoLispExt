import { assert, expect } from 'chai';
import { DclAtom } from '../../astObjects/dclAtom';

suite("AST Objects: DCL Atom", function () {	

	const mock0 = new DclAtom(19, 0, '/*\r\nHappy\r\n*/', 0);
	const mock1 = new DclAtom(20, 21, 'new', 2022);
	const mock2 = new DclAtom(20, 21, '"new"', 2022);
	const mock3 = new DclAtom(20, 22, '// year', 1);
	const mock4 = new DclAtom(20, 22, '// year', 1);


	// Note: DclTile tests indirectly, but properly cover range, contains & getAtomFromPosition testing


	test("DclAtom.isComment Property", function () {	
		try {
			expect(mock0.isComment).to.equal(true);
			expect(mock1.isComment).to.equal(false);
			expect(mock2.isComment).to.equal(false);
			expect(mock3.isComment).to.equal(true);
			expect(mock4.isComment).to.equal(true);
		}
		catch (err) {
			assert.fail("Mocks configured to be true or false returned opposite value");
		}
	});

	test("DclAtom.isBlockComment Property", function () {	
		try {
			expect(mock0.isBlockComment).to.equal(true);
			expect(mock1.isBlockComment).to.equal(false);
			expect(mock2.isBlockComment).to.equal(false);
			expect(mock3.isBlockComment).to.equal(false);
			expect(mock4.isBlockComment).to.equal(false);
		}
		catch (err) {
			assert.fail("Mocks configured to be true or false returned opposite value");
		}
	});

	test("DclAtom.isString Property", function () {	
		try {
			expect(mock0.isString).to.equal(false);
			expect(mock1.isString).to.equal(false);
			expect(mock2.isString).to.equal(true);
			expect(mock3.isString).to.equal(false);
			expect(mock4.isString).to.equal(false);
		}
		catch (err) {
			assert.fail("Mocks configured to be true or false returned opposite value");
		}
	});

	test("DclAtom.equal()", function () {	
		try {
			expect(mock0.equal(mock1)).to.equal(false);
			expect(mock1.equal(mock2)).to.equal(false);
			expect(mock2.equal(mock3)).to.equal(false);
			expect(mock3.equal(mock4)).to.equal(true);
		}
		catch (err) {
			assert.fail("Mocks configured to be true or false returned opposite value");
		}
	});

});
