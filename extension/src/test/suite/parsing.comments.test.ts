import * as path from 'path';
import { assert, expect } from 'chai';
import { Position } from 'vscode';
import { getBlockCommentParamNameRange, parseDocumentation } from '../../parsing/comments';
import { ReadonlyDocument } from '../../project/readOnlyDocument';

function memDoc(content: string): ReadonlyDocument {
	return ReadonlyDocument.createMemoryDocument(content, 'autolisp');
}


suite("Parsing: Comments Tests", function () {	
	
	let roDoc: ReadonlyDocument;

	suiteSetup(() => {
		const extRootPath = path.resolve(__dirname, '../../../');
		const commentsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/comments.lsp");
		roDoc = ReadonlyDocument.open(commentsFileTest);
	});



	
	test("Comment Extraction Test", function () {
		let failMessage = "Failed parse prior to testing any results";
		try { 
			const positions = [
				new Position(0 , 5 ),
				new Position(6 , 14),
				new Position(9 , 12), // bad input test, returns empty object
				new Position(20, 12),
				new Position(31, 25),
				new Position(41, 11)
			];
			const accumulator = {};
			for (const pos of positions) {
				const atom = roDoc.documentContainer.getAtomFromPos(pos);
				const lspDoc = parseDocumentation(atom);
				Object.keys(lspDoc).forEach(k => {
					if (!accumulator[k]) {
						accumulator[k] = [];
					}
					if (k === 'params') {
						accumulator[k].push(...lspDoc[k]);
					} else {
						accumulator[k].push(lspDoc[k]);
					}
				});
			}	
			
			failMessage = "Incorrect parsed comment field block quantities";
			expect(accumulator['params'].length).to.equal(6);
			expect(accumulator['description'].length).to.equal(5);
			expect(accumulator['returns'].length).to.equal(4);
			expect(accumulator['remarks'].length).to.equal(1);

			failMessage = "Failed to properly migrate param variable name";
			let paramNames = accumulator['params'].map(p => p.name);
			expect(paramNames).to.not.have.members(['Param']);
		}
		catch (err) {
			assert.fail(failMessage);
		}
	});




	test("getBlockCommentParamNameRange() using valid request", function () {
		const start = new Position(6, 9);
		const close = new Position(6, 10);
		const sut = getBlockCommentParamNameRange(roDoc.documentContainer.atoms[1], 'y');
		expect(sut.start).to.deep.equal(start);
		expect(sut.end).to.deep.equal(close);
	});

	test("getBlockCommentParamNameRange() using invalid request", function () {
		const sut = getBlockCommentParamNameRange(roDoc.documentContainer.atoms[1], 'none');
		expect(sut).to.equal(null);
	});

	test("getBlockCommentParamNameRange() using invalid LispAtom", function () {
		const sut = getBlockCommentParamNameRange(roDoc.documentContainer.atoms[0], 'any');
		expect(sut).to.equal(null);
	});


	test("@Example tag with inline description and fenced code block", function () {
		const src = ';|\n    @Example How to use it\n    ```lisp\n    (f 2)\n    ```\n|;';
		const doc = parseDocumentation(memDoc(src).documentContainer.atoms[0]);
		expect(doc.examples).to.not.be.undefined;
		expect(doc.examples.length).to.equal(1);
		expect(doc.examples[0].value).to.include('How to use it');
		expect(doc.examples[0].value).to.include('```lisp');
		expect(doc.examples[0].value).to.include('(f 2)');
	});

	test("@Example tag with no inline description", function () {
		const src = ';|\n    @Example\n    ```lisp\n    (hello)\n    ```\n|;';
		const doc = parseDocumentation(memDoc(src).documentContainer.atoms[0]);
		expect(doc.examples).to.not.be.undefined;
		expect(doc.examples.length).to.equal(1);
		expect(doc.examples[0].value).to.include('```lisp');
		expect(doc.examples[0].value).to.include('(hello)');
	});

	test("Multiple @Example tags", function () {
		const src = ';|\n    @Example First example\n    ```lisp\n    (f 1)\n    ```\n    @Example Second example\n    ```lisp\n    (f 2)\n    ```\n|;';
		const doc = parseDocumentation(memDoc(src).documentContainer.atoms[0]);
		expect(doc.examples).to.not.be.undefined;
		expect(doc.examples.length).to.equal(2);
		expect(doc.examples[0].value).to.include('First example');
		expect(doc.examples[1].value).to.include('Second example');
	});

	test("@Example alongside @Param, @Returns, @Remarks", function () {
		const src = ';|\n    A test function\n    @Param x int: the input\n    @Returns int\n    @Remarks some notes\n    @Example usage\n    ```lisp\n    (myfn 5)\n    ```\n|;';
		const doc = parseDocumentation(memDoc(src).documentContainer.atoms[0]);
		expect(doc.description.value).to.include('A test function');
		expect(doc.params.length).to.equal(1);
		expect(doc.returns.value).to.include('int');
		expect(doc.remarks.value).to.include('some notes');
		expect(doc.examples.length).to.equal(1);
		expect(doc.examples[0].value).to.include('usage');
		expect(doc.examples[0].value).to.include('(myfn 5)');
	});

	test("@Example one-liner with no code block", function () {
		const src = ';|\n    @Example call it like `(f 2)`\n|;';
		const doc = parseDocumentation(memDoc(src).documentContainer.atoms[0]);
		expect(doc.examples).to.not.be.undefined;
		expect(doc.examples.length).to.equal(1);
		expect(doc.examples[0].value).to.equal('call it like `(f 2)`');
	});

	test("@Example with @ inside code fence is not treated as a tag", function () {
		const src = ';|\n    @Example code with at-sign\n    ```lisp\n    @somevar\n    ```\n|;';
		const doc = parseDocumentation(memDoc(src).documentContainer.atoms[0]);
		expect(doc.examples.length).to.equal(1);
		expect(doc.examples[0].value).to.include('@somevar');
	});


});