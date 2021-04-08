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

function createFile(f: string) {
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
  before(async () => {
    if (vscode.extensions.getExtension("Autodesk.autolispext") == undefined) {
      console.log("Autodesk.autolispext NOT exist");
    } else {
      await vscode.extensions.getExtension("Autodesk.autolispext").activate();
    }
  });

  test("AutoCompletion Test for de", function () {
    const inputword = "de";
    try {
      const f = "test.lsp";
      createFile(f);
      let doc: vscode.TextDocument = ReadonlyDocument.open(autocompletionFile);
      const isupper = false;
      const suggestionList: Array<vscode.CompletionItem> = getLispAndDclCompletions(
        doc,
        inputword,
        isupper
      );
      let suggestLabel = [];
      suggestionList.forEach((item) => {
        suggestLabel.push(item.label);
      });
      let expectedList = ["defun", "defun-q"];
      chai.expect(suggestLabel).to.eql(expectedList);

    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test.only("AutoCompletion Test for vlax-get", function () {
    const inputword = "vlax-get";
    try {
      const f = "test.lsp";
      createFile(f);
      let doc: vscode.TextDocument = ReadonlyDocument.open(autocompletionFile);
      const isupper = false;
      const suggestionList: Array<vscode.CompletionItem> = getLispAndDclCompletions(
        doc,
        inputword,
        isupper
      );
      let suggestLabel = [];
      suggestionList.forEach((item) => {
        suggestLabel.push(item.label);
      });
      console.log(`suggestLabel is ${suggestLabel.toString()}`);
      let expectedList = ["defun", "defun-q"];
      chai.expect(suggestLabel).to.eql(expectedList);

    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  

});
