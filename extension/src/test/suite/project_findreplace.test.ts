import * as path from 'path';
import { OpenProjectFile } from '../../project/openProject';
import * as vscode from 'vscode';
import { ProjectTreeProvider } from '../../project/projectTree';

import { findInProject, FindInProject } from '../../project/findReplace/findInProject';
import { SearchOption } from '../../project/findReplace/options';
import { applyReplacementInFile } from '../../project/findReplace/applyReplacement';

import * as os from 'os';
import { ImportMock } from 'ts-mock-imports';
import { FileNode, SearchTreeProvider } from '../../project/findReplace/searchTree';
import { ReadonlyDocument } from "../../project/readOnlyDocument";
import * as ut from '../../utils';
import * as opt from '../../project/findReplace/options';
import * as fs from 'fs';

import { clearSearchResultWithError, setIsSearching, getWarnIsSearching } from "../../project/findReplace/clearResults";
import { openSearchResult } from "../../project/findReplace/openSearchResult";
import { FindingNode } from '../../project/findReplace/searchTree';
import { replaceInProject } from '../../project/findReplace/replaceInProject';
import { findInFile, grantExePermission } from '../../project/findReplace/ripGrep';
import { saveOpenDoc2Tmp } from '../../utils';
import { detectEncoding } from '../../project/findReplace/encoding';

var expect = require('chai').expect;
suite("Project find and replace in project Tests", function () {
	var filenode = new FileNode;
	let prefixpath = __filename + "/../../../../extension/src/test/SourceFile/test_case/";
	let projpath = path.join(prefixpath + "project_test_file.prj");
	let ret = vscode.Uri.file(projpath);
	let rootNode= OpenProjectFile(ret);

	var searchobj = new SearchOption();
	searchobj.keyword = "-layer";
	searchobj.completed = true;

	var mock_value = "bbbbbbb";

	ProjectTreeProvider.instance().updateData(rootNode);
		
	let closeOsArchStub, closeOptGetSearchStub, closeVscodeCommandsStub, 
	closeOptgetStringStub, closeOsTypeStub, closefsAccessSyncStub, closefsChmodSyncStub;
	suiteTeardown( async ()=>{
		closeOsArchStub.restore();
		closeOptGetSearchStub.restore();
		closeVscodeCommandsStub.restore();
		closeOptgetStringStub.restore();
		closeOsTypeStub.restore();
		closefsAccessSyncStub.restore();
		closefsChmodSyncStub.restore();
	});
	suiteSetup(async () => {
		closeOsArchStub = ImportMock.mockFunction(os, 'arch', 'x64');
		closeOptGetSearchStub = ImportMock.mockFunction(opt, 'getSearchOption', searchobj);
		closeVscodeCommandsStub = ImportMock.mockFunction(vscode.commands, 'executeCommand', mock_value);
		closeOptgetStringStub = ImportMock.mockFunction(opt, 'getString', "remove -layer");
		closeOsTypeStub = ImportMock.mockFunction(os, 'type', 'Darwin');
		closefsAccessSyncStub = ImportMock.mockFunction(fs, 'accessSync', null);
		closefsChmodSyncStub = ImportMock.mockFunction(fs, 'chmodSync', null);
	});

	suite("Open search result Tests", function(){
		test("Failed to open search result", async function () {
			var clickedTreeItem = new FindingNode();
			try{
				await openSearchResult(clickedTreeItem, searchobj);
			}
			catch (err) {
				expect(err.startsWith("File doesn't exist:")).to.be.true;
			}
			
		});
		
		test("Succeed to open search result", async function(){
			searchobj.isReplace = false;
			searchobj.useRegularExpr = true;
			searchobj.matchCase = true;

			var object = new FindInProject();
			await object.execute(searchobj, rootNode);
			let filenode = object.resultByFile;
			let findingnode = filenode[0].findings;
			let clickedTreeItem = findingnode[0];
			
			try{
				let retvalue = await openSearchResult(clickedTreeItem, searchobj);
				expect(retvalue).to.be.equals(mock_value);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});
	});
	
	suite("Find in project Tests", function () {
		test("Find in a project", async function () {
			try{
				await findInProject();
				var displaynode = SearchTreeProvider.instance.getChildren();
				let filenode = displaynode[1];
				let findingnode = filenode.findings;
				expect(findingnode.length).to.be.equals(1);
				}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});
	});

	suite("Clear search result Tests", function(){
		test("Clear search result with error", function(){
			try {
				var err = "wrong err";
				clearSearchResultWithError(err);
				var summarynode = SearchTreeProvider.instance.getChildren();
				expect(summarynode[0].summary).to.be.equals('wrong err');
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		})
		test("Clear search result", function(){
			try {
				setIsSearching(true);
				getWarnIsSearching();
			}
			catch (err) {
				expect(err.startsWith("A search is in progress")).to.be.true;
			}
		})
	});

	suite("Apply replacement in project Test1", function() {
		let projpath2 = path.join(prefixpath + "test_remove.lsp");
		filenode.filePath = projpath2;
		let doc = ReadonlyDocument.open(projpath2);
		
		let closeVscodeWorkspaceStub, closeUtGetDocumentStub;
		suiteTeardown( async ()=>{
			closeVscodeWorkspaceStub.restore();
			closeUtGetDocumentStub.restore();
		});
		suiteSetup(async () => {
			closeVscodeWorkspaceStub = ImportMock.mockFunction(vscode.workspace, "applyEdit", true);
			closeUtGetDocumentStub = ImportMock.mockFunction(ut, "getDocument", doc);
		});

		test("Apply change in editor in File", async function(){
			try {
				let retvalue = await applyReplacementInFile(filenode);
				expect(retvalue).to.be.equals(true);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});
	});

	suite("Apply replacement in project Test2", function() {
		let closeUtGetDocumentStub;
		suiteTeardown( async ()=>{
			closeUtGetDocumentStub.restore();
		});
		suiteSetup(async () => {
			closeUtGetDocumentStub = ImportMock.mockFunction(ut, "getDocument", null);
		});
		test("Apply change by File", async function(){
			try {
				let retvalue = await applyReplacementInFile(filenode);
				expect(retvalue).to.be.equals(null);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});
	});

	suite("Replace in project Tests", function(){
		test("Succeed to replace", async function (){
			ProjectTreeProvider.instance().updateData(rootNode);
			try {
				await replaceInProject();
				var summarynode = SearchTreeProvider.instance.getChildren();
				expect(summarynode[0].tooltip.startsWith('Replace "-layer" with "remove -layer"')).to.be.true;
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
			
		});
	});

	suite("find in file tests", async function(){
		test("find in file tests", async function(){
			SearchOption.activeInstance.matchCase = false;
			SearchOption.activeInstance.matchWholeWord = true;
			SearchOption.activeInstance.isReplace = true;
			SearchOption.activeInstance.replacement = "remove -layer";

			let file2Search = saveOpenDoc2Tmp(filenode.filePath);
			let encoding = detectEncoding(filenode.filePath);
			try {
				let retvalue = await findInFile(searchobj, file2Search, encoding);
				expect(retvalue.stdout).to.be.equals('3:11:(command "remove -layer")');
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});

		test("grant permission", async function () {
			try {
				grantExePermission();
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});
	});
});