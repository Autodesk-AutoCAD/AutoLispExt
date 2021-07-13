import * as path from 'path';
import { suite, test } from 'mocha';
import { assert, expect } from 'chai';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import { SymbolManager, RootSymbolMapHost, ISymbolHost, ISymbolReference } from '../../symbols';

let roDoc: ReadonlyDocument;
let symbolMap: RootSymbolMapHost;

suite("SymbolManager & Object Method Tests", function () {	


	suiteSetup(() => {
		try {
			const extRootPath = path.resolve(__dirname, '../../../');
			const lispFileTest = path.resolve(extRootPath, "./extension/src/test/SourceFile/test_case/symbols.lsp");
			roDoc = ReadonlyDocument.open(lispFileTest);
			symbolMap = SymbolManager.getSymbolMap(roDoc, true);
			symbolMap = SymbolManager.getSymbolMap(roDoc);
			expect(symbolMap.items.length).to.be.at.least(10);
		} catch (error) {
			assert.fail("Failed to initialize shared suite data sources");
		}
	});

	suiteTeardown(() => {
		try {
			expect(symbolMap.isValid).to.equal(true);	
			SymbolManager.invalidateSymbolMapCache();
			expect(symbolMap.isValid).to.equal(false);	
		} catch (error) {
			assert.fail("Failed to dispose known Symbol Map");
		}
	});




	test("NamedSymbolReference - Property Expectation", function () {	
		try {
			const sut = symbolMap.items[0].asHost.named;
			expect(sut.asHost).to.equal(null);
			expect(sut.asReference).to.equal(sut);
			expect(sut.filePath).to.equal(roDoc.fileName);
			expect(sut.flatIndex).to.equal(3);
			expect(sut.hasId).to.equal(true);
			expect(sut.id).to.equal("c:whatever");
			expect(sut.isDefinition).to.equal(true);
			expect(sut.isLocalization).to.equal(false);			
			expect(sut.parent.parent).to.equal(symbolMap);
			expect(sut.range.start.line).to.equal(13);
		}
		catch (err) {
			assert.fail("At least one of the various properties initialized to unexpected results");
		}
	});

	test("NamedSymbolHost - Property Expectation", function () {	
		try {
			const sut = symbolMap.items[0].asHost;
			expect(sut.asHost).to.equal(sut);
			expect(sut.asReference).to.equal(null);
			expect(sut.filePath).to.equal(roDoc.fileName);
			expect(sut.hasId).to.equal(true);
			expect(sut.isValid).to.equal(true);
			expect(sut.items.length).to.be.at.least(5);
			expect(!sut.named).to.equal(false);
			expect(sut.parent).to.equal(symbolMap);
			expect(sut.range.start.line).to.equal(13);
		}
		catch (err) {
			assert.fail("At least one of the various properties initialized to unexpected results");
		}
	});

	test("AnonymousSymbolHost - Property Expectation", function () {	
		try {
			const sut = symbolMap as ISymbolHost;
			expect(sut.asHost).to.equal(sut);
			expect(sut.asReference).to.equal(null);
			expect(sut.filePath).to.equal(roDoc.fileName);
			expect(sut.hasId).to.equal(false);
			expect(sut.isValid).to.equal(true);
			expect(sut.items.length).to.be.at.least(5);
			expect(sut.named).to.equal(null);
			expect(sut.parent).to.equal(null);
			expect(sut.range.start.line).to.equal(3);
		}
		catch (err) {
			assert.fail("At least one of the various properties initialized to unexpected results");
		}
	});




	test("ISymbolBase.equal() - complete sub-type coverage test", function () {	
		try {
			const nHost = symbolMap.items[0].asHost;
			const nRef = symbolMap.items[0].asHost.named;
			expect(nHost.equal(nRef.parent)).to.equal(true);
			expect(nHost.equal(nRef)).to.equal(false);
			expect(nRef.equal(nHost.named)).to.equal(true);
			expect(nRef.parent.equal(nHost)).to.equal(true);
			expect(nRef.equal(nHost)).to.equal(false);
		}
		catch (err) {
			assert.fail("Failed to yield expected truthy results");
		}
	});




	test("ISymbolReference.findLocalizingParent() - using localized symbol", function () {	
		try {
			const sut = symbolMap.items[0].asHost.items[7].asReference;
			const result = sut.findLocalizingParent();
			expect(result).to.equal(symbolMap.items[0]);
		}
		catch (err) {
			assert.fail("Failed to pull symbol map");
		}
	});

	test("ISymbolReference.findLocalizingParent() - using globalized symbol", function () {	
		try {
			const sut = symbolMap.items[0].asHost.items[4].asReference;
			const result = sut.findLocalizingParent();
			expect(result).to.equal(symbolMap);
		}
		catch (err) {
			assert.fail("Failed to pull symbol map");
		}
	});




	test("ISymbolHost.findLocalizingParent() - using NamedSymbolHost with localized name", function () {	
		try {
			const sut = symbolMap.items[0].asHost;
			const result = sut.findLocalizingParent('gv:field0');
			expect(result).to.equal(symbolMap.items[0]);
		}
		catch (err) {
			assert.fail("Failed to pull symbol map");
		}
	});

	test("ISymbolHost.findLocalizingParent() - using NamedSymbolHost with global name", function () {	
		try {
			const sut = symbolMap.items[0].asHost;
			const result = sut.findLocalizingParent('gv:field1');
			expect(result).to.equal(symbolMap);
		}
		catch (err) {
			assert.fail("Failed to pull symbol map");
		}
	});




	test("RootSymbolMapHost.collectAllSymbols() - verify effective accumulation", function () {
		try {
			const sut = symbolMap.collectAllSymbols();

			[
				{id: 'c:whatever', count: 1},
				{id: 'a', count: 3},
				{id: 'b', count: 1},
				{id: 'gv:field0', count: 2},
				{id: 'gv:field1', count: 2},
				{id: 'c', count: 1},
				{id: 'c:stuffandthings', count: 1},
				{id: 'c:stuff&things', count: 1},
				{id: 'c:dostuff', count: 1},
				{id: 'gv:field2', count: 2},
				{id: 'gv:field3', count: 1},
				{id: 'gv:field4', count: 1},
				{id: 'gv:field5', count: 1}
			].forEach(entry => {
				expect(sut.get(entry.id).length).to.equal(entry.count);
			});
		}
		catch (err) {
			assert.fail("Failed to pull symbol map");
		}
	});

	test("RootSymbolMapHost.collectAllSymbols() - provided vs generated symbol collection Map<>", function () {	
		try {
			// Note: this needs to match because it indirectly proves out the ability to aggregate multiple
			//		 document LispContainers into a single (provided) summary Map<> when necessary.
			const sut: Map<string, Array<ISymbolReference>> = new Map();
			symbolMap.collectAllSymbols(sut);
			const generated = symbolMap.collectAllSymbols();
			const keys = [...sut.keys()];
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const sutReference = sut.get(key);
				const genReference = generated.get(key);
				expect(sutReference.length).to.equal(genReference.length);
				for (let j = 0; j < sutReference.length; j++) {
					const value = sutReference[j].equal(genReference[j]);
					expect(value).to.equal(true);
				}
			}
		}
		catch (err) {
			assert.fail("Failed to pull symbol map");
		}
	});


});