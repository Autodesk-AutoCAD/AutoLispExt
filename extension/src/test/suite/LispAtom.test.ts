import * as chai from 'chai';
import { Position } from 'vscode';
import { LispAtom, LispContainer } from '../../format/sexpression';

const catom = new LispAtom(0, 0, '; I am a line comment');
const satom = new LispAtom(32, 5, 'vl-princ-to-string');
const matom = new LispAtom(83, 8, ';|this is a\r\n          |multiline test\r\n         |;');
const lparen = new LispAtom(4, 6, '(');
const rparen = new LispAtom(4, 6, ')');

suite("LispAtom Tests", function () {	
	test("LispAtom.isLispFragment() Test", function () {
		try {
			chai.assert.isTrue(satom.isLispFragment());
		}
		catch (err) {
			chai.assert.fail("This was not recocognized as a valid ILispFragment");
		}
	});


	test("IS LispAtom.equal() Test", function () {
		try {
			chai.assert.isTrue(satom.equal(satom));
		}
		catch (err) {
			chai.assert.fail("The same atom was used for both references, this should be true");
		}
	});
	test("NOT LispAtom.equal() Test", function () {
		try {
			chai.assert.isNotTrue(lparen.equal(rparen));
		}
		catch (err) {
			chai.assert.fail("These 2 atoms were nearly identical, but were different characters");
		}
	});


	test("LispAtom.getRange() Single-Line Test", function () {
		const r = satom.getRange();
		let start, end;	
		try {
			start = r.start.line === 32 && r.start.character === 5;
			end = r.end.line === 32 && r.end.character === 23;
			chai.assert.isTrue(start && end);
		}
		catch (err) {
			chai.assert.fail(`The start test was ${start} and the end test was ${end}`);
		}
	});
	test("LispAtom.getRange() Multi-Line Test", function () {
		const r = matom.getRange();
		let start, end;		
		try {
			start = r.start.line === 83 && r.start.character === 8;
			end = r.end.line === 85 && r.end.character === 11;
			chai.assert.isTrue(start && end);
		}
		catch (err) {
			chai.assert.fail(`The start test was ${start} and the end test was ${end}`);
		}
	});


	test("LispAtom.contains() Test", function () {		
		const fail = new Position(83, 4);
		const start = new Position(83, 8);
		const middle = new Position(84, 3);
		const end = new Position(85, 11);
		try {			
			chai.assert.isTrue(matom.contains(start));
			chai.assert.isTrue(matom.contains(middle));
			chai.assert.isTrue(matom.contains(end));
			chai.assert.isNotTrue(matom.contains(fail));
		}
		catch (err) {
			chai.assert.fail('At least 1 of 4 Positional tests failed the contains test');
		}
	});


	test("LispAtom.isComment() Test", function () {
		try {
			chai.assert.isTrue(catom.isComment());			
			chai.assert.isTrue(matom.isComment());	
			chai.assert.isNotTrue(satom.isComment());
		}
		catch (err) {
			chai.assert.fail('The test for IsComment() was checked both directions and one failed');
		}
	});
	test("LispAtom.isComment() & isLineComment() Test", function () {
		try {
			chai.assert.isTrue(catom.isLineComment());
			chai.assert.isNotTrue(matom.isLineComment());
			chai.assert.isNotTrue(satom.isLineComment());
		}
		catch (err) {
			chai.assert.fail('The test for isLineComment() was checked both directions and one failed');
		}
	});


	test("LispAtom.IsLeftParen() Test", function () {
		try {
			chai.assert.isTrue(lparen.isLeftParen());
			chai.assert.isNotTrue(rparen.isLeftParen());
		}
		catch (err) {
			chai.assert.fail('The test for isLeftParen() was checked both directions and one failed');
		}
	});
	test("LispAtom.IsRightParen() Test", function () {
		try {
			chai.assert.isTrue(rparen.isRightParen());
			chai.assert.isNotTrue(lparen.isRightParen());
		}
		catch (err) {
			chai.assert.fail('The test for isRightParen() was checked both directions and one failed');
		}
	});


	test("LispAtom.length() Test", function () {
		try {
			chai.assert.equal(satom.length(), 18);
			chai.assert.equal(lparen.length(), 1);
		}
		catch (err) {
			chai.assert.fail('The test for length() did not return the expected symbol string length');
		}
	});
		

	test("LispAtom.symbLine() Test", function () {
		try {
			chai.assert.equal(satom.symbLine(), 32);
			chai.assert.equal(matom.symbLine(), 85);
			chai.assert.equal(matom.symbLine(false), 83);
		}
		catch (err) {
			chai.assert.fail('The test for symbLine() did not return the expected line numbers');
		}
	});
	

});
