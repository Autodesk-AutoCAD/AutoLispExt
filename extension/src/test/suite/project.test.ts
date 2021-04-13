import * as path from 'path';
import { OpenProjectFile } from '../../project/openProject';
import { createProject } from '../../project/createProject';
import * as vscode from 'vscode';
import { ProjectTreeProvider, addLispFileNode2ProjectTree } from '../../project/projectTree';
import { AddFile2Project } from '../../project/addFile2Project';
import { SaveProject } from '../../project/saveProject';
import { excludeFromProject } from '../../project/excludefile';
import * as fs from	'fs-extra';
import { RefreshProject } from '../../project/refreshProject';
import { getTreeItemTitle } from '../../project/projectutil';
import { openLspFile } from '../../project/openLspFile';
import { hasFileWithSameName } from '../../project/projectTree';

var sinon = require("sinon");
var expect = require('chai').expect;

suite("Project related Tests", function () {
	let prefixpath = __filename + "/../../../../extension/src/test/SourceFile/test_case/";
	let projpath = path.join(prefixpath + "project_test_file.prj");
	let ret = vscode.Uri.file(projpath);
	let rootNode= OpenProjectFile(ret);
	suite("Project open Tests", function () {
		test("open nonexisting project file", function () {
			try {
				OpenProjectFile(vscode.Uri.file("empty.prj"));
			}
			catch (err) {
				expect(err.message.startsWith("Can't read project file:")).to.be.true;
			}
		});


		test("open an existing project file", function () {
			try {
				expect(rootNode.projectName).to.be.equals("project_test_file");
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}	
		});
	});

	suite("Project create Tests", function () {
		test("create a new project", async function () {
			let projpath = path.join(prefixpath + "createPrj.prj");
			try {
				let returnValue = await createProject(projpath);
				expect(returnValue.projectName).to.be.equals("createPrj");
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});

		test("failed to create a new project", function () {
			let projpath_err = path.join(prefixpath + "createPr.pr");
			try {
				createProject(projpath_err);
			}
			catch (err) {
				expect(err.message.startsWith("Only PRJ files are allowed.")).to.be.true;
			}
		});
	});

	suite("Project add '.lsp' file Tests",function(){
		let destprojpath = path.join(prefixpath + "project_test_file_add.prj");
		fs.copyFileSync(projpath, destprojpath);		
		let ret = vscode.Uri.file(destprojpath);
		let rootNode= OpenProjectFile(ret);
		
		test("add '.lsp' file to project", async function(){
			let fileName= path.join(prefixpath + "test_case/pdfMarkups.lsp");
			try{
				addLispFileNode2ProjectTree(rootNode, fileName, null);
				expect(rootNode.sourceFiles.length).to.be.equals(2);
			}
			catch (err) {
				expect(err).to.be.equals("");
			}
			fs.removeSync(destprojpath);
		});

		test("failed to add wrong extension file to project",async function(){
			if (ProjectTreeProvider.hasProjectOpened() == true) {
				let projpath = path.join(prefixpath + "add_fail_case.txt");
				let projpath1 = path.join(prefixpath + "add_fail_case.lsp.lsp");
				let projpath2 = path.join(prefixpath + "test_remove.lsp");
				let array = [projpath,  projpath1,  projpath2];
				for (let i=0;i<3;i++) {
					let ret = vscode.Uri.file(array[i]);
					let arr = new Array<vscode.Uri>();
					arr.push(ret);
					let prom = AddFile2Project(arr);
					try{
						prom
						.then(response => { 
							return;
						})
						.catch(error => {
							expect(error).to.be.equals("Only LSP files are allowed.");
						})
					}
					catch(err){
						expect(err).to.be.equals("");
					}
				}
			}
		});
	});

	suite("Project remove '.lsp' file Tests", function(){
		test("Successed to remove '.lsp' file from project", async function(){
			let destprojpath = path.join(prefixpath + "project_test_file_remove.prj");
			fs.copyFileSync(projpath, destprojpath);		
			let ret = vscode.Uri.file(destprojpath);
			let rootNode= OpenProjectFile(ret);
			ProjectTreeProvider.instance().updateData(rootNode);
			try {
				await excludeFromProject(rootNode.sourceFiles[0]);
				expect(rootNode.sourceFiles.length).to.be.equals(0);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
			fs.removeSync(destprojpath);
		});

		test("Fail to remove '.lsp' file from unopened project", async function(){
			ProjectTreeProvider.instance().updateData(null);
			try{
				await excludeFromProject(rootNode.sourceFiles[0]);
			}
			catch (err) {
				expect(err.startsWith("A project must be open")).to.be.true;
			}
		});
	});

	suite("Project save project Test", function(){
		test("Successed to save project", async function(){
			let destprojpath = path.join(prefixpath + "project_test_file_add.prj");
			fs.copyFileSync(projpath, destprojpath);		
			let ret = vscode.Uri.file(destprojpath);
			let rootNode= OpenProjectFile(ret);
			ProjectTreeProvider.instance().updateData(rootNode);
			let fileName= path.join(prefixpath + "pdfMarkups.lsp");
			try{
				addLispFileNode2ProjectTree(rootNode, fileName, null);
				await SaveProject(true);
				OpenProjectFile(ret);
				expect(rootNode.sourceFiles.length).to.be.equals(2);
			}
			catch (err) {
				expect(err).to.be.equals("");
			}
			fs.removeSync(destprojpath);
		});	
		
		test("No project to save", async function(){
			ProjectTreeProvider.instance().updateData(null);
			try{
				let msg = SaveProject(true);
				msg
				.then(response => {
					return;
				})
				.catch(error => {
					expect(error).to.be.equals("No project to save.");
				})
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});	
	});

	suite("Project refresh Test", function(){
		test("Successed to refresh project", function(){
			try {
				RefreshProject();
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});

		test("file with same name", function(){
			let rootNode= OpenProjectFile(ret);
			let fileName = "test_remove.lsp";
			try {
				hasFileWithSameName(fileName, rootNode);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});
	});

	suite("Project getTreeItemTitle Test", function(){
		test("Successed to getTreeItemTitle ptoject", function(){
			let treeNode = new vscode.TreeItem(rootNode.getDisplayText());
			try {
				getTreeItemTitle(treeNode);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
			
		});
	});

	suite("Project open lisp file Test", function(){
		test("Successed to open lisp file", async function(){
			let clickedTreeItem = rootNode.sourceFiles[0];
			try {
				await openLspFile(clickedTreeItem);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});

		test("Failed to open lisp file", async function(){
			let projpath = path.join(prefixpath + "project_no_lisp_file.prj");	
			let ret = vscode.Uri.file(projpath);
			let rootNode= OpenProjectFile(ret);
			let clickedTreeItem = rootNode.sourceFiles[0];
			try{
				await openLspFile(clickedTreeItem);
			}
			catch (err) {
				expect(err.startsWith("File doesn't exist: ")).to.be.true;
			}
		});
	});
});
