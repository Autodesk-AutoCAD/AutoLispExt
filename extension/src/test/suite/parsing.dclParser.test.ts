import * as path from 'path';
import { assert, expect } from 'chai';

import { getDocumentTileContainer } from '../../parsing/dclParser';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { DclTile } from '../../astObjects/dclTile';
import { DclAttribute } from '../../astObjects/dclAttribute';

const extRootPath = path.resolve(__dirname, '../../../');
const dclPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/dialog.dcl");


suite("Parsing: DCL Content", function () {	

	let doc: ReadonlyDocument;	
	suiteSetup(async () => {
		doc = ReadonlyDocument.open(dclPath); 
	});

	test("DclParser - getDocumentTileContainer()", function () {	
		try {
			const start = Date.now();
			const tile = getDocumentTileContainer(doc.fileContent);
			const stop = Date.now();
			const text = tile.asText();
			const conversion = Date.now();
			
			const diff1 = stop - start;
			const diff2 = conversion - stop;
			
			console.log(`\t\tDCL Parsing Time: ${diff1}ms`);
			console.log(`\t\tDCL Convert Back: ${diff2}ms`);

			expect(doc.documentContainer).to.equal(null);
			expect(doc.fileContent).to.equal(text);
		}
		catch (err) {
			assert.fail("The original parsed content did not convert back to the same text");
		}
	});

	test("DCL Root Container Contents", function () {	
		try {
			const tile = doc.documentDclContainer;
			expect(tile.length).to.equal(4);
			expect(tile.linefeed).to.equal('\r\n');
			expect(tile.atoms[0].line).to.equal(0);
			expect(tile.atoms[0].isBlockComment).to.equal(true);
			expect(tile.atoms[1].line).to.equal(3);
			expect(tile.atoms[1].isComment).to.equal(true);
			expect(tile.atoms[1].isBlockComment).to.equal(false);
			expect(tile.atoms[2].line).to.equal(5);
			expect(tile.atoms[2] instanceof DclTile).to.equal(true);
			expect(tile.atoms[3].line).to.equal(35);
			expect(tile.atoms[3] instanceof DclTile).to.equal(true);
			expect(tile.atoms[0].symbol.split('\n').length).to.equal(4);
		}
		catch (err) {
			assert.fail("The parsed content did not contain the expected root values");
		}
	});

	const good1 = 'myDCL : dialog {\n\tok_cancel;\n\t}';
	const good2 = 'myDCL : dialog {\n\t: button {\n\t\twidth = 100;\n\t\tlabel = "random";\n\t\t}\n\tok_cancel;\n\t}';
	const poor0 = 'myDCL : dialog {\n\tok_cancel;';
	const poor1 = 'myDCL : dialog {:button{} ok_cancel;';
	const poor2 = 'myDCL : dialog {\n\t: button {\n\t\twidth = 100;\n\t\tlabel = "random";\n\t\tok_cancel;\n\t}';
	const poor3 = 'myDCL : dialog {\n\t: button {\n\t\twidth = 100\t\t\tlabel = "random";\n\t\t}\n\tok_cancel;\n\t}';
	const poor4 = 'myDCL : dialog {\n\t: button {\n\t\twidth = 100;\n\t\tlabel "random";\n\t\t}\n\tok_cancel;';
	const poor5 = 'myDCL : dialog {\n\t: button {\n\t\t= 100;\n\t\tlabel = "random"\n\tok_cancel;\n\t}';

	// TODO: Add malformed syntax tests

	test("Malformed DCL Test #1", function () {	
		try {
			const sut1 = getDocumentTileContainer(good1);
			const sut2 = getDocumentTileContainer(poor0);
			const sut3 = getDocumentTileContainer(poor1);
			
			const baseline = sut1.flatten().length;
			expect(sut2.flatten().length).to.equal(baseline - 1);
			expect(sut2.atoms[0].asTile.atoms[4]).instanceOf(DclAttribute);

			expect(sut3.flatten().length).to.equal(10);
			expect(sut3.atoms[0].asTile.atoms[4]).instanceOf(DclTile);
			expect(sut3.atoms[0].asTile.atoms[5]).instanceOf(DclAttribute);
		}
		catch (err) {
			assert.fail("At least one test case parsed incorrectly or aggregated unexpectedly");
		}
	});


	test("Malformed DCL Test #2", function () {	
		try {
			const sut1 = getDocumentTileContainer(good2);
			const sut2 = getDocumentTileContainer(poor2);
			const sut3 = getDocumentTileContainer(poor3);
			const sut4 = getDocumentTileContainer(poor4);
			const sut5 = getDocumentTileContainer(poor5);
			
			const baseline = sut1.flatten().length; // should be 19
			expect(sut2.flatten().length).to.equal(baseline - 1);
			expect(sut2.atoms[0].asTile.atoms[4].asTile.atoms.filter(p => p instanceof DclAttribute).length).to.equal(3);

			expect(sut3.flatten().length).to.equal(baseline - 1);
			expect(sut3.atoms[0].asTile.atoms[4].asTile.atoms.filter(p => p instanceof DclAttribute).length).to.equal(1);
			
			expect(sut4.flatten().length).to.equal(baseline - 2);
			expect(sut4.atoms[0].asTile.atoms[4].asTile.atoms.filter(p => p instanceof DclAttribute).length).to.equal(2);

			expect(sut5.flatten().length).to.equal(baseline - 3);
			expect(sut5.atoms[0].asTile.atoms[4].asTile.atoms.filter(p => p instanceof DclAttribute).length).to.equal(3);
		}
		catch (err) {
			assert.fail("At least one test case parsed incorrectly or aggregated unexpectedly");
		}
	});

});