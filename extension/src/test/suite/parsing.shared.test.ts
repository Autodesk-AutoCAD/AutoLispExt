import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { endOfLineEnum2String, getEOL } from '../../parsing/shared';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { EndOfLine } from 'vscode';


suite("Parsing: Shared Tests", function () {

	let windowsDoc: ReadonlyDocument;
	let linuxDoc: ReadonlyDocument;

	suiteSetup(() => {
		try {			
			windowsDoc = ReadonlyDocument.createMemoryDocument('(defun someFunc ()\r\n\t(command ".line" pause pause)\r\n\t(princ)\r\n)', 'lsp');
			linuxDoc = ReadonlyDocument.createMemoryDocument('(defun someFunc ()\n\t(command ".line" pause pause)\n\t(princ)\n)', 'lsp');
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});




	test("getEOL() - Using windows CRLF", function () {	
		try {
			const sut = getEOL(windowsDoc);			
			expect(sut).to.equal('\r\n');
		}
		catch (err) {
			assert.fail("Expected CRLF, but got something else");
		}
	});

	test("getEOL() - Using Linux LF, but expect CRLF conversion", function () {	
		try {
			const sut = getEOL(linuxDoc);			
			expect(sut).to.equal('\r\n');
		}
		catch (err) {
			assert.fail("Expected LF, but got something else");
		}
	});



	test("endOfLineEnum2String() - forcing coverage of LF", function () {	
		try {
			// had to force this since our ReadOnlyDocument auto-converts to CRLF
			const sut = endOfLineEnum2String(EndOfLine.LF);
			expect(sut).to.equal('\n');
		}
		catch (err) {
			assert.fail("Expected CRLF, but got something else");
		}
	});

	test("endOfLineEnum2String() - forcing non windows & linux edge case", function () {	
		try {
			const sut = endOfLineEnum2String(5);
			expect(sut).to.equal('\r\n');
		}
		catch (err) {
			assert.fail("Expected CRLF, but got something else");
		}
	});


});