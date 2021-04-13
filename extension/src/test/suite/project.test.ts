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
import { IconUris } from "../../project/icons";

var sinon = require("sinon");
var expect = require('chai').expect;

suite("Project related Tests", function () {
	let project_path = path.join(__dirname + "/../../../test_case/project_test_file.prj");
	let ret = vscode.Uri.file(project_path);
	let rootNode= OpenProjectFile(ret);
	suite("Project open Tests", function () {
		// Defines a Mocha unit test, test case: open nonexisting project file
		test("open nonexisting project file", function () {
			try {
				OpenProjectFile(vscode.Uri.file("empty.prj"));
			}
			catch (err) {
				expect(err.message.startsWith("Can't read project file:")).to.be.true;
			}
		});

		// Defines a Mocha unit test, test case: open an existing project file
		test("open an existing project file", function () {
			try {
				//OpenProjectFile() is different with OpenProject()
				expect(OpenProjectFile(ret).projectName).to.be.equals("project_test_file");
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}	
		});
	});

	suite("Project create Tests", function () {
		// Defines a Mocha unit test, test case: Successed to create a new project
		test("create a new project", async function () {
			let project_path = path.join(__dirname + "/../../../test_case/createPrj.prj");
			try {
				let returnValue = await createProject(project_path);
				//after createproject(), need to click "create" button. So under the "__dirname" folder, which don't contains createPrj.prj
				expect(returnValue.projectName).to.be.equals("createPrj");
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
		});

		// Defines a Mocha unit test, test case: Failed to create a new project, only PRJ files are allowed.
		test("failed to create a new project", function () {
			let project_path_err = path.join(__dirname + "/../../../test_case/createPr.pr");
			try {
				createProject(project_path_err);
			}
			catch (err) {
				expect(err.message.startsWith("Only PRJ files are allowed.")).to.be.true;
			}
		});
	});

	suite("Project add '.lsp' file Tests",function(){
		//Defines a Mocha unit test, test case: Add ".lsp" file to project/ also finish SaveProject() function test
		//Due to we don't push lispfilenode to projectnode, so we don't need to delete 
		//Test function: addLispFileNode2ProjectTree(), invoke AddFile2Project(), invoke addFileNode()
		
		//Test function: SaveProject()
		//The length of LspFileNode is "1" to "2", value from "test_remove"，to "'test_remove'，'pdfMarkups'"
		let project_path_src = path.join(__dirname + "/../../../test_case/project_test_file.prj");
		let project_path_dest = path.join(__dirname + "/../../../test_case/project_test_file_add.prj");
		fs.copyFileSync(project_path_src, project_path_dest);		
		let ret = vscode.Uri.file(project_path_dest);
		let rootNode= OpenProjectFile(ret);
		ProjectTreeProvider.instance().updateData(rootNode);
		let fileNode = rootNode.sourceFiles[0];
		expect(rootNode.sourceFiles.length).to.be.equals(1);
		
		test("add '.lsp' file to project", async function(){
			//add "pdfMarkups.lsp"
			let fileName= path.join(__dirname + "/../../../test_case/pdfMarkups.lsp");
			let rawFilePath = null;
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
			try{
				addLispFileNode2ProjectTree(rootNode, fileName, rawFilePath);
				expect(rootNode.sourceFiles.length).to.be.equals(2);
			}
			catch (err) {
				expect(err).to.be.equals("");
			}
			fs.removeSync(project_path_dest);
		});

		// Defines a Mocha unit test, test case: Failed to add "'.txt'/'.lsp.lsp'" file to project", 
		// Failed to add a file, which is aAlready in the project, Only LSP files are allowed.
		// Test function: AddFile2Project()
		test("failed to add wrong extension file to project",async function(){
			//add "add_fail_case.txt", which is non .lsp file.
			ProjectTreeProvider.instance().updateData(rootNode);
			if (ProjectTreeProvider.hasProjectOpened() == true) {
				let project_path = path.join(__dirname + "/../../../test_case/add_fail_case.txt");
				let project_path_1 = path.join(__dirname + "/../../../test_case/add_fail_case.lsp.lsp");
				let project_path_2 = path.join(__dirname + "/../../../test_case/test_remove.lsp");
				let array = [project_path,  project_path_1,  project_path_2 ];
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
			let project_path_src = path.join(__dirname + "/../../../test_case/project_test_file.prj");
			let project_path_dest = path.join(__dirname + "/../../../test_case/project_test_file_remove.prj");
			fs.copyFileSync(project_path_src, project_path_dest);		
			let ret = vscode.Uri.file(project_path_dest);
			let rootNode= OpenProjectFile(ret);
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
			expect(rootNode.sourceFiles.length).to.be.equals(1);
			try {
				await excludeFromProject(rootNode.sourceFiles[0]);
				expect(rootNode.sourceFiles.length).to.be.equals(0);
			}
			catch (err) {
				console.log(err);
				expect(err).to.be.equals("");
			}
			fs.removeSync(project_path_dest);
		});

		test("Fail to remove '.lsp' file from unopened project", async function(){
			ProjectTreeProvider.instance().updateData(null);
			let value = ProjectTreeProvider.hasProjectOpened();
			try{
				await excludeFromProject(rootNode.sourceFiles[0]);
			}
			catch (err) {
				expect(err.startsWith("A project must be open")).to.be.true;
			}
		});
	});

	suite("Project save project Test", function(){
		//Defines a Mocha unit test, test case: Save project, which is contains on "add '.lsp' file to project" test
		//"The test is contained on \"add '.lsp' file to project\" test"

		test("Successed to save project", async function(){
			let project_path_src = path.join(__dirname + "/../../../test_case/project_test_file.prj");
			let project_path_dest = path.join(__dirname + "/../../../test_case/project_test_file_add.prj");
			fs.copyFileSync(project_path_src, project_path_dest);		
			let ret = vscode.Uri.file(project_path_dest);
			let rootNode= OpenProjectFile(ret);
			ProjectTreeProvider.instance().updateData(rootNode);
			let fileNode = rootNode.sourceFiles[0];
			expect(rootNode.sourceFiles.length).to.be.equals(1);
			//add "pdfMarkups.lsp"
			let fileName= path.join(__dirname + "/../../../test_case/pdfMarkups.lsp");
			let rawFilePath = null;
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
			try{
				addLispFileNode2ProjectTree(rootNode, fileName, rawFilePath);
				expect(rootNode.sourceFiles.length).to.be.equals(2);
				//If you need to save the added lispnode, you need to update the data through onchanged for the save test
				let refresh = true;
				await SaveProject(refresh);
				OpenProjectFile(ret);
				expect(rootNode.sourceFiles.length).to.be.equals(2);
			}
			catch (err) {
				expect(err).to.be.equals("");
			}
			fs.removeSync(project_path_dest);
		});	
		
		//Defines a Mocha unit test, test case: No project to save
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
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
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
			ProjectTreeProvider.instance().updateData(rootNode);
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
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
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
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
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
			let project_path = path.join(__dirname + "/../../../test_case/project_no_lisp_file.prj");	
			let ret = vscode.Uri.file(project_path);
			let rootNode= OpenProjectFile(ret);
			ProjectTreeProvider.instance().updateData(rootNode);
			let value = ProjectTreeProvider.hasProjectOpened();
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



	// suite("Project icons Test", function(){
	// 	//different colortheme, different icon. 
	// 	test("refresh icons", function(){
	// 		var myAPI = {
	// 			method: IconUris.initialize()
	// 		};
	// 		var database = sinon.mock(myAPI);
	// 		//let value = database.expects("method").once();
	// 		let str3 = path.join(__dirname);
	// 		let str1 = "\\out\\test\\suite";
	// 		let str2 = myAPI.method;
	// 		str2 = str2.concat(str1);
	// 		database.verify(); 
	// 		database.restore();
	// 		try {
	// 			expect(str2).to.be.equals(str3);
	// 		}
	// 		catch (err) {
	// 			console.log(err);
	// 			expect(err.toString()).to.be.equals("");
	// 		}
	// 	});
	// });

