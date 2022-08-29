import * as path from 'path';
import { assert, expect } from 'chai';
import { Position } from 'vscode';
import { getBlockCommentParamNameRange, parseDocumentation } from '../../parsing/comments';
import { ReadonlyDocument } from '../../project/readOnlyDocument';


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


});