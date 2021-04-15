import * as chai from "chai";
import * as vscode from "vscode";
import * as path from "path";
import { readFile2TextDocument } from "./helper";
import { getMatchingWord } from "../../completion/autocompletionProvider";
let assert = chai.assert;
const testDir = path.join(__dirname + "/../../../extension/src/test");
const sourceDir = path.join(testDir + "/SourceFile");
let LispFile = path.join(sourceDir + "/getWordmatch.lsp");
let doc: vscode.TextDocument;

suite("GetMatchingWord Tests",function () {
//Test getMatchingWord in the autocompletionProvider 
  suiteSetup(async ()=>{
    doc = await readFile2TextDocument(LispFile);
  })
  test("GetMatchingWord Test for [p,true]", async function () {
    let fn = "GetMatchingWord Test for [p,true]";
    try {
      let cursorPos = new vscode.Position(0, 0);
      let expectedList = ["p", false];
      chai.expect(getMatchingWord(doc, cursorPos)).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${fn} failed`);
    }
  });

  test("GetMatchingWord Test for [A,false]", async function () {
    let fn = "GetMatchingWord Test for [A,false]";
    try {
      let cursorPos = new vscode.Position(1, 0);
      let expectedList = ["A", true];
      chai.expect(getMatchingWord(doc, cursorPos)).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${fn} failed`);
    }
  });

  test("GetMatchingWord Test for [(,false]", async function () {
    //Test wordSep = " &#^()[]|;'\".";
    let fn = "GetMatchingWord Test for [(,false]";
    try {
      let cursorPos = new vscode.Position(2, 3);
      let expectedList = ["(", false];
      chai.expect(getMatchingWord(doc, cursorPos)).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${fn} failed`);
    }
  });

});
