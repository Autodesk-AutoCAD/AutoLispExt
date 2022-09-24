import * as path from 'path';
import { assert, expect } from 'chai';
import { Position, CompletionContext } from "vscode";
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { invokeCompletionProviderDcl } from "../../completion/completionProviderDcl";
import { CompletionItemDcl, Kinds } from "../../completion/completionItemDcl";
import { AutoLispExt } from '../../context';


const extRootPath = path.resolve(__dirname, '../../../');
const symbolsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");
const commentsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/comments.lsp");
//const markupsFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/pdfMarkups.lsp");
const largeFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/unFormatted10.lsp");


// NOTE: Just because these tests return results and pass, manual testing is still required. VSCode can be given
//		 whatever we want and still choose to kick them out from the users perspective under various conditions.

suite("Parsing: DocumentContainer Tests", function () {	

	let doc: ReadonlyDocument;
	suiteSetup(async () => {
		const extRootPath = path.resolve(__dirname, '../../../');
		const dclPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/dialog.dcl");
		doc = ReadonlyDocument.open(dclPath); 
	});



	test("No Atom Expect Filtered Attributes & All Tiles", function () {
		try {
			const skip = ['width', 'children_alignment'];
			const expectTile = Array.from(AutoLispExt.WebHelpLibrary.dclTiles.keys());
			const expectAtts = AutoLispExt.WebHelpLibrary.dclTiles.get('column').attributes;
						
			const pos = new Position(11, 60);
			const sut = invokeCompletionProviderDcl(doc, pos, null, false);

			sut.forEach(suggestion => {
				const pass = skip.includes(suggestion.label.toString())
						  || expectTile.includes(suggestion.label.toString())
						  || expectAtts.includes(suggestion.label.toString());
				if (!pass) {
					debugger;
				}
				assert.isTrue(pass);
			});
		}
		catch (err) {
			assert.fail("Failed to receive expected suggestions");
		}
	});




});