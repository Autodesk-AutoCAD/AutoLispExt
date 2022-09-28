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
    const cmdLineTesting = false;

    //#region setup
    suiteSetup(async () => {
		try {
            if (cmdLineTesting) {
                const filePath = path.resolve(__dirname, '../../../', './extension/src/test/SourceFile/test_case/comments.lsp');
                await vscode.extensions.getExtension('Autodesk.autolispext').activate();
                await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath), { 'preview': false, 'preserveFocus': true });            
            }
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


    test("Attribute Suggestions - well-formed Attibute expect enum suggestions from existing", function () {
        try {
            const doc = dynamicDoc({before1: 'alignment = left;'});
            let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 58), context);
            const expected = ["left", "right", "top", "bottom", "centered"];
            expect(sut.length).to.equal(expected.length, 'length check - position away from = atom');
            sut.forEach(item => {
                expect(expected).to.include(item.label);
                expect(getInsertText(item)).to.equal(item.label);
            });

            sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 57), context);
            expect(sut).to.equal(null, 'suggest nothing until at least 1 space from delineator');
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


    test("Hybrid Suggestions - Using Position & Proximity Parent", function () {
        // try {
        //     let doc = dynamicDoc({before1: ': x'});
        //     let sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before1, 48), context);
        //     expect(sut.length).to.equal(allTiles.length, 'length check #1');
        //     sut.forEach(item => {
        //         if (compLib.tilesWithChildren.includes(item.label.toString())) {
        //             expect(getInsertText(item)).to.equal(`\n\t: ${item.label} {\n\t\t$0\n\t}`);
        //         } else {
        //             expect(getInsertText(item)).to.equal(`\n\t: ${item.label} { $0 }`);
        //         }
        //     });
            
        //     doc = dynamicDoc({before2: ': x'});
        //     sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.Before2, 4), context);
        //     expect(sut.length).to.equal(allTiles.length, 'length check #2');
        //     sut.forEach(item => {
        //         if (compLib.tilesWithChildren.includes(item.label.toString())) {
        //             expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
        //         } else {
        //             expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
        //         }
        //     });

        //     doc = dynamicDoc({after1: ': x'});
        //     sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After1, 37), context);
        //     expect(sut.length).to.equal(allTiles.length, 'length check #3');
        //     sut.forEach(item => {
        //         if (compLib.tilesWithChildren.includes(item.label.toString())) {
        //             expect(getInsertText(item)).to.equal(`\n: ${item.label} {\n\t$0\n}`);
        //         } else {
        //             expect(getInsertText(item)).to.equal(`\n: ${item.label} { $0 }`);
        //         }
        //     });

        //     doc = dynamicDoc({after2: ': x'});
        //     sut = invokeCompletionProviderDcl(doc, new Position(LineTarget.After2, 4), context);
        //     expect(sut.length).to.equal(allTiles.length, 'length check #4');
        //     sut.forEach(item => {
        //         if (compLib.tilesWithChildren.includes(item.label.toString())) {
        //             expect(getInsertText(item)).to.equal(`: ${item.label} {\n\t$0\n}`);
        //         } else {
        //             expect(getInsertText(item)).to.equal(`: ${item.label} { $0 }`);
        //         }
        //     });
        // }
        // catch (err) {
        //     assert.fail(`${err}`);
        // }
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