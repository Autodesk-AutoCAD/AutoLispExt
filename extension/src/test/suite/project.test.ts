import * as path from 'path';
import { OpenProjectFile } from '../../project/openProject';
import { createProject } from '../../project/createProject';
import { Uri } from 'vscode';
import { ProjectTreeProvider, addLispFileNode2ProjectTree } from '../../project/projectTree';
import { AddFile2Project } from '../../project/addFile2Project';

var expect = require('chai').expect;

suite("Project related Tests", function () {

	suite("Project open Tests", function () {
		// Defines a Mocha unit test, test case: open nonexisting project file
		test("open nonexisting project file", function () {
			try {
				OpenProjectFile(Uri.file("empty.prj"));
			}
			catch (err) {
				expect(err.message.startsWith("Can't read project file:")).to.be.true;
			}
		});

		// Defines a Mocha unit test, test case: open an existing project file
		test("open an existing project file", function () {
			let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\project_test_file.prj");
			let ret = Uri.file(project_path);
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
			let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\createPrj.prj");
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
			let project_path_err = path.join(__dirname + "\\..\\..\\..\\test_case\\createPr.pr");
			try {
				createProject(project_path_err);
			}
			catch (err) {
				expect(err.message.startsWith("Only PRJ files are allowed.")).to.be.true;
			}
		});
	});

	suite("Project add '.lsp' file Tests",function(){
		//Defines a Mocha unit test, test case: Add ".lsp" file to project. 
		//Due to we don't push lispfilenode to projectnode, so we don't need to delete 
		//Test function: addLispFileNode2ProjectTree(), invoke AddFile2Project(), invoke addFileNode()
		
		//The length of LspFileNode is "1" to "2"
		//value from "test_remove"，to "'test_remove'，'pdfMarkups'"
		//Check the original value of LspFile is "test_remove"
		let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\project_test_file.prj");
		let ret = Uri.file(project_path);
		let rootNode= OpenProjectFile(ret); 
		let fileNode = rootNode.sourceFiles[0];
		let rawFilePath_add = fileNode.rawFilePath;
		expect(rootNode.sourceFiles.length).to.be.equals(1);
		
		test("add '.lsp' file to project",function(){
			//add "pdfMarkups.lsp"
			let fileName= path.join(__dirname + "\\..\\..\\..\\test_case\\pdfMarkups.lsp");
			try{
				addLispFileNode2ProjectTree(rootNode, fileName, rawFilePath_add);
				expect(rootNode.sourceFiles.length).to.be.equals(2);
			}
			catch (err) {
				expect(err).to.be.equals("");
			}
		});
		//Defines a Mocha unit test, test case: Failed to add "'.txt'/'.lsp.lsp'" file to project", 
		//Failed to add a file, which is aAlready in the project, Only LSP files are allowed.
		//Test function: AddFile2Project()
		test("failed to add wrong extension file to project",async function(){
			//add "add_fail_case.txt", which is non .lsp file.
			ProjectTreeProvider.instance().updateData(rootNode);
			if (ProjectTreeProvider.hasProjectOpened() == true) {
				let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\add_fail_case.txt");
				let project_path_1 = path.join(__dirname + "\\..\\..\\..\\test_case\\add_fail_case.lsp.lsp");
				let project_path_2 = path.join(__dirname + "\\..\\..\\..\\test_case\\test_remove.lsp");
				let array = [project_path,  project_path_1,  project_path_2 ];
				for (let i=0;i<3;i++) {
					let ret = Uri.file(array[i]);
					let arr = new Array<Uri>();
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
});