import * as path from 'path';
import {suite, test} from 'mocha';
import {assert, expect} from 'chai';
import {ReadonlyDocument} from '../../project/readOnlyDocument';
import * as vscode from 'vscode';
import {CompletionTriggerKind, Position} from 'vscode';
import {CompletionLibraryDcl, SnippetKeys} from '../../completion/completionLibraryDcl';
import { invokeCompletionProviderDcl } from '../../completion/completionProviderDcl';
import { loadAllResources } from '../../resources';
import { DocumentServices } from '../../services/documentServices';
import { WebHelpLibrarySingleton } from '../../help/documentationLibrary';
import { Kinds } from '../../completion/completionItemDcl';


suite("CompletionDclProvider: Tests", function () {
    
    const dynamic = [
        '// Some Comment',
        'DynamicDlgName : dialog {',
        '\t: boxed_column { children_alignment = right; #BeforeTile1#',
        '\t\t#BeforeTile2#',
        '\t\t: button { label = "Click Me"; } #AfterTile1#',
        '\t\t#AfterTile2#',
        '\t}',
        '}',
        '',
        'DynamicDlgName2 : dialog {',
        '\t: boxed_column { ',
        '\t\t',
        '\t}',
        '}',
    ];
    const context = {triggerKind: CompletionTriggerKind.Invoke, triggerCharacter: ' '};
    let helpLib: WebHelpLibrarySingleton;
    let compLib: CompletionLibraryDcl;
    let boxColumnAtts: Array<string>;
    let allTiles: Array<string>;

    //#region setup
    suiteSetup(async () => {
		try {
            helpLib = WebHelpLibrarySingleton.Instance;
            compLib = CompletionLibraryDcl.Instance;
            boxColumnAtts = [...helpLib.dclTiles.get('boxed_column').attributes];
            allTiles = Array.from(helpLib.dclTiles.keys()).filter(x => x !== 'dialog');
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});

    enum LineTarget {
        Before1 = 2,
        Before2 = 3,
        After1 = 4,
        After2 = 5,
        Blank1 = 8,
        Blank2 = 11,
    }
    interface IInjections {
        before1?: string;
        before2?: string;
        after1?: string;
        after2?: string;
    }
    function injector(arg: IInjections): Array<string> {
        const result: Array<string> = [];
        for (let i = 0; i < dynamic.length; i++) {
            if (i === LineTarget.Before1) {
                result.push(dynamic[i].replace('#BeforeTile1#', arg.before1 ?? ''));
            } else if (i === LineTarget.Before2) {
                result.push(dynamic[i].replace('#BeforeTile2#', arg.before2 ?? ''));
            } else if (i === LineTarget.After1) {
                result.push(dynamic[i].replace('#AfterTile1#', arg.after1 ?? ''));
            } else if (i === LineTarget.After2) {
                result.push(dynamic[i].replace('#AfterTile2#', arg.after2 ?? ''));
            } else {
                result.push(dynamic[i]);
            }
        }
        return result;
    }
    function dynamicDoc(arg: IInjections): ReadonlyDocument { 
        const parts = injector(arg);
        return ReadonlyDocument.createMemoryDocument(parts.join('\n'), DocumentServices.Selectors.DCL);
    }
    function getInsertText(item: vscode.CompletionItem) : string {
        const value = item.insertText;
        if (value instanceof vscode.SnippetString) {
            return value.value;
        } else if (value) {
            return value;
        }
        return '';
    }
    //#endregion


    // #region Attribute Testing
    test("Attribute Suggestions - Position after known Attibute starter", function () {
        try {
            const doc = dynamicDoc({before1: 'alignment'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 99), context);
            expect(sut.length).to.equal(1, 'length check #1');
            expect(sut[0].label.toString()).to.equal('=');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Attribute Suggestions - Position after unknown Attibute starter", function () {
        try {
            const doc = dynamicDoc({before1: 'whatever'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 99), context);
            expect(sut.length).to.equal(1, 'length check #1');
            expect(sut[0].label.toString()).to.equal('=');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Attribute Suggestions - known Attibute expect enum suggestions", function () {
        try {
            const doc = dynamicDoc({before1: 'alignment = '});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 58), context);
            const expected = ["left", "right", "top", "bottom", "centered"];
            expect(sut.length).to.equal(expected.length, 'length check - position away from = atom');
            sut.forEach(item => {
                expect(expected).to.include(item.label);
                expect(getInsertText(item)).to.equal(`${item.label};`);
            });

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 57), context);
            expect(sut).to.equal(null, 'suggest nothing until at least 1 space from delineator');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Attribute Suggestions - known Attibute expect enum suggestions from existing", function () {
        try {
            const doc = dynamicDoc({before1: 'alignment = left'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 58), context);
            const expected = ["left", "right", "top", "bottom", "centered"];
            expect(sut.length).to.equal(expected.length, 'length check - position away from = atom');
            sut.forEach(item => {
                expect(expected).to.include(item.label);
                expect(getInsertText(item)).to.equal(`${item.label};`);
            });

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 57), context);
            expect(sut).to.equal(null, 'suggest nothing until at least 1 space from delineator');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Attribute Suggestions - partial attribute from both sides of the ';' character", function () {
        try {            
            const doc = dynamicDoc({before2: 'alignment = ;'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 14), context);
            const expected = ["left", "right", "top", "bottom", "centered"];
            expect(sut.length).to.equal(expected.length, 'length check #1');
            sut.forEach(item => {
                expect(expected).to.include(item.label);
                expect(getInsertText(item)).to.equal(`${item.label};`);
            });

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 15), context);
            expect(sut.length).to.equal(allTiles.length + boxColumnAtts.length - 2, 'length check #2');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });


    test("Attribute Suggestions - well-formed Attibute expect enum suggestions from existing", function () {
        try {
            let doc = dynamicDoc({before1: 'alignment = left;'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 58), context);
            const expected = ["left", "right", "top", "bottom", "centered"];
            expect(sut.length).to.equal(expected.length, 'length check - position away from = atom');
            sut.forEach(item => {
                expect(expected).to.include(item.label);
                expect(getInsertText(item)).to.equal(item.label);
            });

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 57), context);
            expect(sut).to.equal(null, 'suggest nothing until at least 1 space from delineator');

            doc = dynamicDoc({before2: 'alignment = left;'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 2), context);
            expect(sut.length).to.equal(boxColumnAtts.length - 2, 'filtered length check');
            sut.forEach(item => {
                expect(Kinds.ATTRIBUTE).to.equal(item.kind);
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });


    test("Attribute Suggestions - Partial Attibute expecting string suggestion", function () {
        try {
            let doc = dynamicDoc({before1: 'key = "somevalue"'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 62), context);
            expect(sut.length).to.equal(1, 'length check');
            expect(getInsertText(sut[0])).to.equal('"somevalue";');

            // these verify that suggestions are only firing when the Position is right at the end quote
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 61), context);
            expect(sut).to.equal(null);
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 63), context);
            expect(sut).to.equal(null);

            doc = dynamicDoc({before1: 'key = '});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 99), context);
            expect(sut.length).to.equal(1, 'length check');
            expect(sut[0].insertText).to.be.instanceOf(vscode.SnippetString);
            expect(getInsertText(sut[0])).to.equal('"$0";');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Attribute Suggestions - Expect null from number primitive", function () {
        try {
            let doc = dynamicDoc({before2: 'width = 5000'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 12), context);
            expect(sut).to.equal(null);
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });
    // #endregion Attribute Testing


    test("Hybrid Suggestions - Using Partial Attibute", function () {
        try {
            let doc = dynamicDoc({before1: 'alignment'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 50), context);
            expect(sut.length).to.equal(allTiles.length + boxColumnAtts.length - 2, 'length check #1');

            doc = dynamicDoc({before2: 'alignment'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 10), context);
            expect(sut.length).to.equal(allTiles.length + boxColumnAtts.length - 2, 'length check #2');

            doc = dynamicDoc({after2: 'alignment'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After2, 10), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #3');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Comment Suggestion - From '/' atom", function () {
        try {
            let doc = dynamicDoc({after2: '/'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After2, 3), context);
            expect(sut.length).to.equal(1, 'length check');
            expect(getInsertText(sut[0])).to.equal('/*\n\t$0\n*/');
            
            sut = invokeCompletionProviderDcl(doc, new Position(0, 5), context);
            expect(sut).to.equal(null); // should not make suggestions inside of a comment
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Hybrid Suggestions - Using position only", function () {
        try {
            let doc = dynamicDoc({});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 50), context);
            expect(sut.length).to.equal(allTiles.length + boxColumnAtts.length - 1, 'length check #1');

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 10), context);
            expect(sut.length).to.equal(allTiles.length + boxColumnAtts.length - 1, 'length check #2');

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After2, 10), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #3');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Hybrid Suggestions - first atom context", function () {
        try {
            let doc = dynamicDoc({before1: ':'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 48), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #1');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({}); // going after the ';' atom from the attribute
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 46), context);
            expect(sut.length).to.equal(allTiles.length + boxColumnAtts.length - 1, 'length check #1.2');
            sut.forEach(item => {
                if (item.kind === Kinds.ATTRIBUTE) {
                    expect(getInsertText(item)).to.equal(item.label.toString());
                } else if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
                }
            });
            
            doc = dynamicDoc({before2: ':'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 2), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #2');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({after1: ':'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After1, 37), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #3');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({after2: ':'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After2, 2), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #4');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });




    test("Hybrid Suggestions - second atom context", function () {
        try {
            let doc = dynamicDoc({before1: ': x'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 48), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #1');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
                }
            });
            
            doc = dynamicDoc({before2: ': x'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 4), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #2');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({after1: ': x'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After1, 37), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #3');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({after2: ': x'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After2, 4), context);
            expect(sut.length).to.equal(allTiles.length, 'length check #4');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });


    test("Hybrid Suggestions - well-formed Attibute using ';' atom", function () {
        try {
            const expectedCount = allTiles.length + boxColumnAtts.length - 2;
            let doc = dynamicDoc({before1: 'alignment = left;'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 63), context);            
            expect(expectedCount).to.equal(sut.length, 'length check');

            doc = dynamicDoc({before2: ':            { } '});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 8), context);            
            expect(allTiles.length).to.equal(sut.length);
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Tile Suggestions - Possibly well-formed Tile expect basic suggestions", function () {
        try {
            let doc = dynamicDoc({before2: ':            { }'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 5), context);            
            expect(allTiles.length).to.equal(sut.length, 'length check');
            sut.forEach(item => {
                expect(item.label).to.equal(getInsertText(item));
            });

            doc = dynamicDoc({before2: ': box { }'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 5), context);            
            expect(allTiles.length).to.equal(sut.length);
            sut.forEach(item => {
                expect(item.label).to.equal(getInsertText(item));
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });


    test("Tile Suggestions - Special Cases", function () {
        try {
            let doc = dynamicDoc({before2: ': paragraph {                             }'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 15), context);            
            expect(2).to.equal(sut.length, 'length check #1');
            expect(sut[0].label).to.equal('concatenation');
            expect(sut[1].label).to.equal('text_part');

            doc = doc = dynamicDoc({before2: ': concatenation {                       }'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 30), context);            
            expect(1).to.equal(sut.length);
            expect(sut[0].label).to.equal('text_part');

            doc = doc = dynamicDoc({before2: ':    x'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 5), context);            
            expect(1).to.equal(sut.length);
            expect(getInsertText(sut[0])).to.equal('x { $0 }');

            doc = doc = dynamicDoc({before2: ':    column'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 5), context);            
            expect(2).to.equal(sut.length);
            expect(getInsertText(sut[0])).to.equal('column { \n\t$0 \n}');
            expect(getInsertText(sut[1])).to.equal('column { $0 }');
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    test("Hybrid Suggestions - Using Position & Well-Formed Proximity Parent", function () {
        try {
            const expectedCount = allTiles.length + boxColumnAtts.length - 2;
            let doc = dynamicDoc({before1: 'alignment = right;'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 99), context);
            expect(expectedCount).to.equal(sut.length, 'length check #1');
            sut.forEach(item => {
                if (item.kind === Kinds.ATTRIBUTE) {
                    expect(getInsertText(item)).to.equal(item.label.toString());
                } else if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
                }
            });

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 99), context);
            expect(expectedCount).to.equal(sut.length, 'length check #2');
            sut.forEach(item => {
                if (item.kind === Kinds.ATTRIBUTE) {
                    expect(getInsertText(item)).to.equal(item.label.toString());
                } else if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({before2: 'alignment = right;'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 99), context);
            expect(expectedCount).to.equal(sut.length, 'length check #2');
            sut.forEach(item => {
                if (item.kind === Kinds.ATTRIBUTE) {
                    expect(getInsertText(item)).to.equal(item.label.toString());
                } else if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n: ${item.label} { $0 }`);
                }
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });

    // TODO: Add Paragraph & Concatenation logic

    test("Hybrid Suggestions - Using Position & Fractional Proximity Parent", function () { 
        try {
            let doc = dynamicDoc({before1: ':'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 99), context);
            expect(allTiles.length).to.equal(sut.length, 'length check #3');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
                }
            });

            doc = dynamicDoc({before2: ':'});
            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 99), context);
            expect(allTiles.length).to.equal(sut.length, 'length check #4');
            sut.forEach(item => {
                if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });


    test("Hybrid Suggestions - Using Position without association", function () {
        try {
            const allCount = allTiles.length + boxColumnAtts.length;
            let doc = dynamicDoc({before1: ': x'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Blank1, 0), context);
            expect(sut.length).to.equal(2, 'length check #1');

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Blank2 - 1, 99), context);
            expect(allCount).to.equal(sut.length, 'length check #2');
            sut.forEach(item => {
                if (item.kind === Kinds.ATTRIBUTE) {
                    expect(getInsertText(item)).to.equal(item.label.toString());
                } else if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
                } else {
                    expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
                }
            });


            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Blank2, 99), context);
            expect(allCount).to.equal(sut.length, 'length check #3');
            sut.forEach(item => {
                if (item.kind === Kinds.ATTRIBUTE) {
                    expect(getInsertText(item)).to.equal(item.label.toString());
                } else if (compLib.tilesWithChildren.includes(item.label.toString())) {
                    expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
                } else {
                    expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
                }
            });
        }
        catch (err) {
            assert.fail(`${err}`);
        }
    });



});