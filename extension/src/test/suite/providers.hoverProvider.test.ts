import * as path from 'path';
import * as vscode from "vscode";
import * as fs from 'fs';
import { assert, expect } from 'chai';
import { AutoLispExtProvideHover } from '../../providers/hoverProvider';
import { Annotation } from '../../help/documentationPresenter';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { DocumentServices } from '../../services/documentServices';
import { AutoLispExt } from '../../context';
import { SymbolManager } from "../../symbols";
import { parseDocumentation } from "../../parsing/comments";

const extRootPath = path.resolve(__dirname, '../../../');
const lspPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/modelspace utilities.lsp");
const dclPath = path.resolve(extRootPath, "./extension/src/test/SourceFile/renaming/dialog.dcl");
const mdDir = path.resolve(extRootPath, "./extension/src/test/BaselineMDs").replace(/\\/g, '/');

suite("Providers: Hover", function () {

    const regenBaselines = false; // Set true to update baselines, but new baselines must be manually reviewed for acceptable output
    const fileOps: fs.BaseEncodingOptions = { encoding:'utf8'};
    let lsp: ReadonlyDocument;
    let dcl: ReadonlyDocument;
    let mock: ReadonlyDocument;
    

    suiteSetup(async () => {
        lsp = ReadonlyDocument.open(lspPath);
        dcl = ReadonlyDocument.open(dclPath);
        const hasDupes = ';Dynamic Def1\r\n(defun dynamic (x y / z) t)\r\n;Dynamic Def2\r\n(defun dynamic (x y) t)\r\n;Dynamic Def3\r\n(defun dynamic (x) t)\r\n(dynamic x)';
        mock = ReadonlyDocument.createMemoryDocument(hasDupes, DocumentServices.Selectors.LSP);
    });

    test("Generate MD Baselines", function () {
        try {
            if (!regenBaselines){
                return; 
            }

            const user1 = AutoLispExtProvideHover(lsp, new vscode.Position(7,5));      // LoadGlobalVariables
            fs.writeFileSync(`${mdDir}/LoadGlobalVariables.md`, user1['contents'][0].value);
            const user2 = AutoLispExtProvideHover(lsp, new vscode.Position(10,10));    // C:CText
            fs.writeFileSync(`${mdDir}/CCText.md`, user2['contents'][0].value);
            const user3 = AutoLispExtProvideHover(lsp, new vscode.Position(11,11));    // settextstyle
            fs.writeFileSync(`${mdDir}/settextstyle.md`, user3['contents'][0].value);
            const user4 = AutoLispExtProvideHover(lsp, new vscode.Position(36,10));    // LookBusy - local undocumented
            fs.writeFileSync(`${mdDir}/LookBusy.md`, user4['contents'][0].value);
            const user5 = AutoLispExtProvideHover(lsp, new vscode.Position(17,7));     // expect null
            expect(user5).to.equal(null);
            
            
            const primitive1 = AutoLispExtProvideHover(lsp, new vscode.Position(18,18));    // expect null - string
            expect(primitive1).to.equal(null);
            const primitive2 = AutoLispExtProvideHover(lsp, new vscode.Position(31,23));    // expect null - number 
            expect(primitive2).to.equal(null);
            const primitive3 = AutoLispExtProvideHover(dcl, new vscode.Position(6,10));     // expect null - comment in Tile
            expect(primitive3).to.equal(null);
            const primitive4 = AutoLispExtProvideHover(dcl, new vscode.Position(12,50));    // expect null - string
            expect(primitive4).to.equal(null);
            const primitive5 = AutoLispExtProvideHover(dcl, new vscode.Position(3,5));      // expect null - comment global
            expect(primitive5).to.equal(null);


            const native1 = AutoLispExtProvideHover(lsp, new vscode.Position(12,8));   // command
            fs.writeFileSync(`${mdDir}/command.md`, native1['contents'][0].value);
            const native2 = AutoLispExtProvideHover(lsp, new vscode.Position(24,10));  // not
            fs.writeFileSync(`${mdDir}/not.md`, native2['contents'][0].value);
            const native3 = AutoLispExtProvideHover(lsp, new vscode.Position(39,10));  // setq
            fs.writeFileSync(`${mdDir}/setq.md`, native3['contents'][0].value);
            const native4 = AutoLispExtProvideHover(lsp, new vscode.Position(39,14));  // expect null
            expect(native4).to.equal(null);
            const native5 = AutoLispExtProvideHover(lsp, new vscode.Position(45,28));  // vla-get-layers
            fs.writeFileSync(`${mdDir}/vla-get-layers.md`, native5['contents'][0].value);
            const native6 = AutoLispExtProvideHover(lsp, new vscode.Position(54,5));   // vla-put-AttachmentPoint  (has Enums)
            fs.writeFileSync(`${mdDir}/vla-put-attachmentpoint.md`, native6['contents'][0].value);
            const native7 = AutoLispExtProvideHover(lsp, new vscode.Position(54,54));  // acAttachmentPointTopLeft (is Enum)
            fs.writeFileSync(`${mdDir}/acAttachmentPointTopLeft.md`, native7['contents'][0].value);
            const native8 = AutoLispExtProvideHover(lsp, new vscode.Position(55,25));  // vlax-3d-point (ambiguous function)
            fs.writeFileSync(`${mdDir}/vlax-3d-point-1.md`, native8['contents'][0].value);
            fs.writeFileSync(`${mdDir}/vlax-3d-point-2.md`, native8['contents'][1].value);


            const active = Annotation.asMarkdown(AutoLispExt.WebHelpLibrary.ambiguousFunctions.get('vlax-3d-point')[0], 1);
            fs.writeFileSync(`${mdDir}/vlax-3d-point-ACTIVE.md`, active.value);


            const tile1 = AutoLispExtProvideHover(dcl, new vscode.Position(5,17));     // dialog
            fs.writeFileSync(`${mdDir}/dialog.md`, tile1['contents'][0].value);
            const tile2 = AutoLispExtProvideHover(dcl, new vscode.Position(11,11));    // boxed_row
            fs.writeFileSync(`${mdDir}/boxed_row.md`, tile2['contents'][0].value);
            const tile3 = AutoLispExtProvideHover(dcl, new vscode.Position(44,15));    // button
            fs.writeFileSync(`${mdDir}/button.md`, tile3['contents'][0].value);
            const tile4 = AutoLispExtProvideHover(dcl, new vscode.Position(47,10));    // ok_cancel
            fs.writeFileSync(`${mdDir}/ok_cancel.md`, tile4['contents'][0].value);


            const att1 = AutoLispExtProvideHover(dcl, new vscode.Position(7,7));       // label
            fs.writeFileSync(`${mdDir}/label.md`, att1['contents'][0].value);
            const att2 = AutoLispExtProvideHover(dcl, new vscode.Position(11,40));     // children_alignment (has Enum)            
            fs.writeFileSync(`${mdDir}/children_alignment.md`, att2['contents'][0].value);
            const att3 = AutoLispExtProvideHover(dcl, new vscode.Position(21,30));     // expect null (horizontal_margin: but doesn't have dedicated help page)
            expect(att3).to.equal(null);
            const att4 = AutoLispExtProvideHover(dcl, new vscode.Position(42,60));     // is_cancel
            fs.writeFileSync(`${mdDir}/is_cancel.md`, att4['contents'][0].value);

            const dyn = AutoLispExtProvideHover(mock, new vscode.Position(6,2));        // dynamic (memory LSP document to create edge case scenario)
            fs.writeFileSync(`${mdDir}/dynamic.md`, dyn['contents'][0].value);
        }
        catch (err) {
            assert.fail(`failed to update baselines: ${err}`);
        }
    });


    test("Primitives LSP|DCL - Expect Null", function () {
        try {
            const primitive1 = AutoLispExtProvideHover(lsp, new vscode.Position(18,18));    // expect null - string
            expect(primitive1).to.equal(null);
            const primitive2 = AutoLispExtProvideHover(lsp, new vscode.Position(31,23));    // expect null - number
            expect(primitive2).to.equal(null);
            const primitive3 = AutoLispExtProvideHover(dcl, new vscode.Position(6,10));     // expect null - comment in Tile
            expect(primitive3).to.equal(null);
            const primitive4 = AutoLispExtProvideHover(dcl, new vscode.Position(12,50));    // expect null - string
            expect(primitive4).to.equal(null);
            const primitive5 = AutoLispExtProvideHover(dcl, new vscode.Position(3,5));      // expect null - comment global
            expect(primitive5).to.equal(null);
        }
        catch (err) {
            assert.fail("One or more known NULL results returned an unexpected value");
        }
    });


    test("UserDefined LSP - Markdown Verification", function () {
        try {
            const user1 = AutoLispExtProvideHover(lsp, new vscode.Position(7,5));      // LoadGlobalVariables
            expect(fs.readFileSync(`${mdDir}/LoadGlobalVariables.md`, fileOps)).to.equal(user1['contents'][0].value);
            const user2 = AutoLispExtProvideHover(lsp, new vscode.Position(10,10));    // C:CText
            expect(fs.readFileSync(`${mdDir}/CCText.md`, fileOps)).to.equal(user2['contents'][0].value);
            const user3 = AutoLispExtProvideHover(lsp, new vscode.Position(11,11));    // settextstyle
            expect(fs.readFileSync(`${mdDir}/settextstyle.md`, fileOps)).to.equal(user3['contents'][0].value);
            const user4 = AutoLispExtProvideHover(lsp, new vscode.Position(36,10));    // LookBusy - local undocumented
            expect(fs.readFileSync(`${mdDir}/LookBusy.md`, fileOps)).to.equal(user4['contents'][0].value);
            const user5 = AutoLispExtProvideHover(lsp, new vscode.Position(17,7));     // expect null
            expect(user5).to.equal(null);
        }
        catch (err) {
            assert.fail("One or more of the tracked UserDefined markdown representations drifted from expected results");
        }
    });
    

    test("Native LSP - Markdown Verification", function () {
        try {
            const native1 = AutoLispExtProvideHover(lsp, new vscode.Position(12,8));   // command
            expect(fs.readFileSync(`${mdDir}/command.md`, fileOps)).to.equal(native1['contents'][0].value);
            const native2 = AutoLispExtProvideHover(lsp, new vscode.Position(24,10));  // not
            expect(fs.readFileSync(`${mdDir}/not.md`, fileOps)).to.equal(native2['contents'][0].value);
            const native3 = AutoLispExtProvideHover(lsp, new vscode.Position(39,10));  // setq
            expect(fs.readFileSync(`${mdDir}/setq.md`, fileOps)).to.equal(native3['contents'][0].value);
            const native4 = AutoLispExtProvideHover(lsp, new vscode.Position(39,14));  // expect null
            expect(native4).to.equal(null);
            const native5 = AutoLispExtProvideHover(lsp, new vscode.Position(45,28));  // vla-get-layers
            expect(fs.readFileSync(`${mdDir}/vla-get-layers.md`, fileOps)).to.equal(native5['contents'][0].value);
            const native6 = AutoLispExtProvideHover(lsp, new vscode.Position(54,5));   // vla-put-AttachmentPoint  (has Enums)
            expect(fs.readFileSync(`${mdDir}/vla-put-attachmentpoint.md`, fileOps)).to.equal(native6['contents'][0].value);
            const native7 = AutoLispExtProvideHover(lsp, new vscode.Position(54,54));  // acAttachmentPointTopLeft (is Enum)
            expect(fs.readFileSync(`${mdDir}/acAttachmentPointTopLeft.md`, fileOps)).to.equal(native7['contents'][0].value);
            const native8 = AutoLispExtProvideHover(lsp, new vscode.Position(55,25));  // vlax-3d-point (ambiguous function)
            expect(fs.readFileSync(`${mdDir}/vlax-3d-point-1.md`, fileOps)).to.equal(native8['contents'][0].value);
            expect(fs.readFileSync(`${mdDir}/vlax-3d-point-2.md`, fileOps)).to.equal(native8['contents'][1].value);
        }
        catch (err) {
            assert.fail("One or more of the tracked Native LSP markdown representations drifted from expected results");
        }
    });


    test("Native DCL Tiles - Markdown Verification", function () {
        try {
            const tile1 = AutoLispExtProvideHover(dcl, new vscode.Position(5,17));     // dialog
            expect(fs.readFileSync(`${mdDir}/dialog.md`, fileOps)).to.equal(tile1['contents'][0].value);
            const tile2 = AutoLispExtProvideHover(dcl, new vscode.Position(11,11));    // boxed_row
            expect(fs.readFileSync(`${mdDir}/boxed_row.md`, fileOps)).to.equal(tile2['contents'][0].value);
            const tile3 = AutoLispExtProvideHover(dcl, new vscode.Position(44,15));    // button
            expect(fs.readFileSync(`${mdDir}/button.md`, fileOps)).to.equal(tile3['contents'][0].value);
            const tile4 = AutoLispExtProvideHover(dcl, new vscode.Position(47,10));    // ok_cancel
            expect(fs.readFileSync(`${mdDir}/ok_cancel.md`, fileOps)).to.equal(tile4['contents'][0].value);
        }
        catch (err) {
            assert.fail("One or more of the tracked Native DCL markdown representations drifted from expected results");
        }
    });


    test("Native DCL Attributes - Markdown Verification", function () {
        try {
            const att1 = AutoLispExtProvideHover(dcl, new vscode.Position(7,7));       // label
            expect(fs.readFileSync(`${mdDir}/label.md`, fileOps)).to.equal(att1['contents'][0].value);
            const att2 = AutoLispExtProvideHover(dcl, new vscode.Position(11,40));     // children_alignment (has Enum)
            expect(fs.readFileSync(`${mdDir}/children_alignment.md`, fileOps)).to.equal(att2['contents'][0].value);
            const att3 = AutoLispExtProvideHover(dcl, new vscode.Position(21,30));     // expect null (horizontal_margin: but doesn't have dedicated help page)
            expect(att3).to.equal(null);
            const att4 = AutoLispExtProvideHover(dcl, new vscode.Position(42,60));     // is_cancel
            expect(fs.readFileSync(`${mdDir}/is_cancel.md`, fileOps)).to.equal(att4['contents'][0].value);
        }
        catch (err) {
            assert.fail("One or more of the tracked Native DCL markdown representations drifted from expected results");
        }
    });


    test("UserDefined LSP Dynamic - Markdown Verification", function () {
        try {
            const dyn1 = AutoLispExtProvideHover(mock, new vscode.Position(6,2));        // dynamic (memory LSP document to create edge case scenario)
            expect(fs.readFileSync(`${mdDir}/dynamic.md`, fileOps)).to.equal(dyn1['contents'][0].value);
        }
        catch (err) {
            assert.fail("One or more of the tracked UserDefined Dynamic markdown representations drifted from expected results");
        }
    });


    test("Native LSP ActiveIndex - Markdown Verification", function () {
        try {
            const active1 = Annotation.asMarkdown(AutoLispExt.WebHelpLibrary.ambiguousFunctions.get('vlax-3d-point')[0], 0);
            expect(active1.value).to.include("**`x`**");
            const active2 = Annotation.asMarkdown(AutoLispExt.WebHelpLibrary.ambiguousFunctions.get('vlax-3d-point')[0], 1);
            expect(active2.value).to.include("**`y`**");
            const active3 = Annotation.asMarkdown(AutoLispExt.WebHelpLibrary.ambiguousFunctions.get('vlax-3d-point')[0], 2);
            expect(active3.value).to.include("**`z`**");

            expect(fs.readFileSync(`${mdDir}/vlax-3d-point-ACTIVE.md`, fileOps)).to.equal(active2.value);
        }
        catch (err) {
            assert.fail("One or more of the tracked Native DCL markdown representations drifted from expected results");
        }
    });


    test("UserDefined LSP ActiveIndex - Markdown Verification", function () {
        try {
            const doc = DocumentServices.findAllDocumentsWithCustomSymbolKey('settextstyle')[0];
            const map = SymbolManager.getSymbolMap(doc);
            const pointers = map.collectAllSymbols().get('settextstyle');
            const flatView = doc.documentContainer.flatten();
            const atom = flatView[pointers[0].flatIndex];
            const arg = flatView[pointers[0].flatIndex + 2];
            const userDocs = parseDocumentation(flatView[atom.commentLinks[atom.commentLinks.length - 1]]);

            const active1 = Annotation.asMarkdown(atom, 0, [arg], userDocs, doc.fileName);
            expect(active1.value).to.include("**`sfc:style1`**");
        }
        catch (err) {
            assert.fail("One or more of the tracked UserDefined LSP markdown representations drifted from expected results");
        }
    });

});