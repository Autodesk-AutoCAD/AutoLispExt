import {OpenProjectFile} from '../../project/openProject';
import { Uri } from 'vscode';
var expect = require('chai').expect
suite("Project related Tests", function () {

	suite("Project open Tests", function () {
		// Defines a Mocha unit test
		test("open nonexisting project file", function() {
			try {

			OpenProjectFile(Uri.file("empty.prj"))
			}
			catch(err)
			 {
				expect(/can't read project file:/.test(err)).to.be.true;
			}
		});
	});
});