import * as path from 'path';
import { OpenProjectFile } from '../../project/openProject';
import { createProject } from '../../project/createProject';
import { Uri } from 'vscode';

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
			let project_path = path.join(__dirname + "/../../../test_case/project_test_file.prj");
			// let project_path = path.join(__dirname + "\\..\\..\\..\\test_case\\project_test_file.prj");
			// let project_path = path.join(__dirname + "\\lisp files\\project_test_file.prj");
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
});
