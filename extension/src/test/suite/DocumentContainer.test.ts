import * as path from 'path';
import { assert, expect } from 'chai';

import { LispParser } from '../../parsing/lispParser';
import { getDocumentContainer } from '../../parsing/containers';
import { Sexpression} from '../../astObjects/sexpression';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { SymbolServices } from '../../services/symbolServices';
import { LispContainer } from '../../astObjects/lispContainer';


const extRootPath = path.resolve(__dirname, '../../../');
const symbolsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");
const commentsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/comments.lsp");
//const markupsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/pdfMarkups.lsp");
const largeFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/unFormatted10.lsp");


suite("Parsing: DocumentContainer Tests", function () {	

	suiteSetup(async () => {
		// this ensures that generating the ordered native key list isn't part of the performance tests
		SymbolServices.isNative('command');
	});

	test("Original atomsForest vs DocumentContainer", function () {	
		try {
			const doc = ReadonlyDocument.open(largeFileTest); 
			const text = doc.fileContent;

			//debugger;
			const v1Start = Date.now();
			const parser = new LispParser(doc);
			parser.tokenizeString(text, 0);
			const v1items = parser.atomsForest.filter(x => x instanceof Sexpression);
			const v1Stop = Date.now();

			//debugger;
			const v2Start = Date.now(); // this is duplicated for performance profiling
			const container = getDocumentContainer(text);
			const v2items = container.atoms.filter(x => x instanceof LispContainer);
			const v2Stop = Date.now();
			
			//debugger;
			const v1Diff = v1Stop - v1Start;
			const v2Diff = v2Stop - v2Start;
			
			console.log(`\t\tOldParser Processing Time: ${v1Diff}ms`);
			console.log(`\t\tNewParser Processing Time: ${v2Diff}ms`);

			expect(v2items.length).to.equal(v1items.length);
			// Note: This final test is very dependant on the "large file" being used as the source. The 
			//		 newer parser is doing a ton of additional work like aggregating foreign symbols and
			//		 linking comments to LispAtoms. 
			//		 Every known optimization was integrated into the the newer parser to offset
			//		 this, but its still ultimately doing a lot more stuff.
			//		 So, if a "small file" is used, then it is highly probable that the formatting
			//		 parser will be faster. Also note, this test will have to change entirely should
			//		 the exponential issues ever get completely resolved in the formatting parser.

			// Update: apparently the performance characteristics in CI/CD are even harsher. We need the
			//		   newly baked in features for multiple enhancements so it really doesn't matter if
			//		   it runs a little slower than the old parser, most of this work is all performed
			//		   passively/asyncronously during activation anyway and is more than fast enough to
			//		   handle the ActiveDocument contextual needs on demand.
			//expect(v2Diff).to.be.lessThan(v1Diff);
		}
		catch (err) {
			assert.fail("Returned a different number of Expressions or the newer parser underperformed");
		}
	});


	test("DocumentExpression equals asText() version", function () {		
		try {
			const doc1 = ReadonlyDocument.open(symbolsFileTest);
			const doc2 = ReadonlyDocument.open(commentsFileTest);
			let sut = getDocumentContainer(doc1.getText());
			// Note: This will not work on every LSP because some whitespace will be discarded. The 
			//      'symbols.lsp' & 'comments.lsp' were carefully edited to remove erroneous whitespace
			assert.equal(doc1.fileContent.trim(), sut.asText().trim());

			sut = getDocumentContainer(doc2.getText());
			assert.equal(doc2.fileContent.trim(), sut.asText().trim());
		}
		catch (err) {
			assert.fail("Did not return the expected (mostly equal) text value when converted back");
		}
	});

	test("DocumentExpression SymbolMap Ids", function () {		
		try {
			const val = '(defun A (/ pt)\n\t(defun b (C) (+ C 1))\n\t(setq pt (getpoint))\n\t(command ".point" pt)\n\t)';
			const sut = getDocumentContainer(val);
			assert.hasAllKeys(sut.userSymbols, ['a', 'b', 'c', 'pt']);
			assert.equal(sut.userSymbols.get('pt').length, 3);
		}
		catch (err) {
			assert.fail("Did not contain the expected number of keys or indices");
		}
	});


	test("String Source: Test Unix EOLs", function () {
		try { 
			const val = '(defun C:DoStuff (/ pt)\n\t(setq pt (getpoint))\n\t(command ".point" pt)\n\t)';
			const sut = getDocumentContainer(val);
			assert.equal(sut.atoms.length, 1);
			assert.equal(sut.atoms[0].body.atoms.length, 7);
			assert.equal(sut.linefeed, '\n');
		}
		catch (err) {
			assert.fail("Incorrect parse quantity or EOL value");
		}
	});

	test("String Source: Test Windows EOLs", function () {
		try { 
			const val = '(defun C:DoStuff (/ pt)\r\n\t(setq pt (getpoint))\r\n\t(command ".point" pt)\r\n\t)';
			const sut = getDocumentContainer(val);
			assert.equal(sut.atoms.length, 1);
			assert.equal(sut.atoms[0].body.atoms.length, 7);
			assert.equal(sut.linefeed, '\r\n');
		}
		catch (err) {
			assert.fail("Incorrect parse quantity or EOL value");
		}
	});

	

});