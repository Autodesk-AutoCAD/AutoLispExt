import * as chai from "chai";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {findContainers,getIndentation,} from "../../format/autoIndent";
import { ReadonlyDocument } from "../../project/readOnlyDocument";
let assert = chai.assert;
const testDir = path.join(__dirname + "/../../../extension/src/test");
const outputDir = path.join(testDir + "/OutputFile");
let indentTestFile = "";
let indentTestDoc: vscode.TextDocument;

fs.mkdir(outputDir, { recursive: true }, (err) => {
  if (err) {
    return console.error(err);
  }
});

function createFakeTextDcoument() {
  indentTestFile = path.join(testDir + "/SourceFile/autoIndent.lsp");
  try {
    if (fs.existsSync(indentTestFile)) {
      indentTestDoc = ReadonlyDocument.open(indentTestFile);
    }
  } catch (error) {
    console.log(error);
  }
}
function getIndent(cursorPos2d: vscode.Position) {
  try {
    let containerElement = findContainers(indentTestDoc,cursorPos2d);
    let lineIndentSpace = getIndentation(indentTestDoc,containerElement,cursorPos2d);
    return lineIndentSpace.length;
  } catch (error) {
    console.log(error);
  }
}

suite("Autoindent Tests", function () {
  // Autoindent is used for input in the vscode editor
  suiteSetup(() => {
    createFakeTextDcoument();
  });

  test("Autoindent for defun enter should have 2 indentation", async function () {
    let fn = "defun enter";
    try {
      let cursorPos2d = new vscode.Position(0, 28);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 2);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for setq enter should have 2 indentation", async function () {
    let fn = "setq enter";
    try {
      let cursorPos2d = new vscode.Position(1, 13);
      let lineIndentSpace = getIndent(cursorPos2d);
      // let containerParens: ElementRange = containerElement.containerParens[0];
      assert.isTrue(lineIndentSpace == 2);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for cons enter should have 14 indentation", async function () {
    let fn = "cons enter";
    try {
      let cursorPos2d = new vscode.Position(12, 36);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 14);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for mapcar enter should have 14 indentation", async function () {
    let fn = "mapcar enter";
    try {
      let cursorPos2d = new vscode.Position(7, 20);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 14);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for reverse enter should have 14 indentation", async function () {
    let fn = "reverse enter";
    try {
      let cursorPos2d = new vscode.Position(22, 22);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 14);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

});
