import * as chai from "chai";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getLispAndDclCompletions } from "../../completion/autocompletionProvider";
import { before } from "mocha";
import { ReadonlyDocument } from "../../project/readOnlyDocument";

let assert = chai.assert;
const testDir = path.join(__dirname + "/../../../extension/src/test");
const outputDir = path.join(testDir + "/OutputFile");
let autocompletionFile = "";
fs.mkdir(outputDir, { recursive: true }, (err) => {
  if (err) {
    return console.error(err);
  }
});


function createFile(f : string) {
	autocompletionFile = path.join(testDir + "/OutputFile/" + f);
  try {
    if (!fs.existsSync(autocompletionFile)) {
      fs.writeFileSync(autocompletionFile, "");
    }
  } catch (error) {
    console.log(error);
  }
}

suite("AutoCompletion Tests", function () {

 before(async () =>{
   
  const activate = vscode.extensions.getExtension('Autodesk.autolispext').isActive;
  console.log(` lisp extension activate? ${activate}`);
  const extpath = vscode.extensions.getExtension('Autodesk.autolispext').extensionPath;
  console.log(` lisp extension extpath: ${extpath}`);
  await vscode.extensions.getExtension('Autodesk.autolispext').activate();

 })

  test.only("AutoCompletion Test for De", function () {
    try {
      const f = "test.lsp";
      createFile(f);
      let doc: vscode.TextDocument = ReadonlyDocument.open(autocompletionFile);
      const inputword = "De";
      const isupper = false;
      const suggestionList: Array<vscode.CompletionItem> = getLispAndDclCompletions(doc, inputword, isupper);
      let suggestLabel = [];
      suggestionList.forEach((item) =>{
        suggestLabel.push(item.label);
    })
      let expectedList =  ['defun','defun-q'];
    // 0:W {label: 'defun', kind: undefined}
    // kind:undefined
    // label:'defun'
    // 1:W {label: 'defun-q', kind: undefined}
    // kind:undefined
    // label:'defun-q'
    // length:2
	  // const expectedList = [

	  // ];
	  assert.equal(suggestLabel,expectedList);

    } catch (err) {
		assert.fail('AutoCompletion test for De failed')
	}
  });

});
