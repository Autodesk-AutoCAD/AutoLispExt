import * as chai from "chai";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {findContainers,getIndentation,isCursorInDoubleQuoteExpr} from "../../format/autoIndent";
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
  indentTestFile = path.join(testDir + "/SourceFile/autoIndentTestFile.lsp");
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
  // Doesn't include the case that press enter insider brackets since
  // the limitation of the unit test
  // In the client the OnTypeFormattingEdit is trigged after enter so the cursor position is from new line.
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

  test("Autoindent for reverse enter should have 18 indentation", async function () {
    let fn = "reverse enter";
    try {
      let cursorPos2d = new vscode.Position(6, 25);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 18);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for lambda enter should have 17 indentation", async function () {
    let fn = "lambda enter";
    try {
      let cursorPos2d = new vscode.Position(8, 30);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 17);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for while enter should have 2 indentation", async function () {
    let fn = "while enter";
    try {
      let cursorPos2d = new vscode.Position(16, 25);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 2);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for repeat enter should have 6 indentation", async function () {
    let fn = "repeat enter";
    try {
      let cursorPos2d = new vscode.Position(17, 14);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 6);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for foreach enter should have 6 indentation", async function () {
    let fn = "foreach enter";
    try {
      let cursorPos2d = new vscode.Position(21, 19);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 6);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for if enter should have 6 indentation", async function () {
    let fn = "if enter";
    try {
      let cursorPos2d = new vscode.Position(22, 18);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 6);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for progn enter should have 12 indentation", async function () {
    let fn = "progn enter";
    try {
      let cursorPos2d = new vscode.Position(25, 17);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 12);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for cond enter should have 4 indentation", async function () {
    let fn = "cond enter";
    try {
      let cursorPos2d = new vscode.Position(33, 8);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 4);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for cursor insider quotes enter return true", async function () {
    let fn = "cursor insider quotes";
    try {
      let cursorPos2d = new vscode.Position(34, 50);
      let isInDoubleQuote= isCursorInDoubleQuoteExpr(indentTestDoc,cursorPos2d);
      assert.isTrue(isInDoubleQuote == true);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for block comment enter should have 5 indentation", async function () {
    let fn = "block comment enter";
    try {
      let cursorPos2d = new vscode.Position(39, 35);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 5);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for emtpy line enter should have 2 indentation", async function () {
    let fn = "emtpy line enter";
    try {
      let cursorPos2d = new vscode.Position(20, 2);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 2);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for NO operator enter should have 1 indentation", async function () {
    let fn = "NO operator enter";
    try {
      let cursorPos2d = new vscode.Position(43, 1);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 1);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for list quote enter should have 10 indentation", async function () {
    let fn = "list quote enter";
    try {
      let cursorPos2d = new vscode.Position(47, 11);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 10);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for multiple setq enter should have 6 indentation", async function () {
    let fn = "multiple setq enter";
    try {
      let cursorPos2d = new vscode.Position(49, 9);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 6);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for text with tab enter should have 10 indentation", async function () {
    let fn = "text with tab enter";
    try {
      let cursorPos2d = new vscode.Position(52, 34);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 10);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for after defun before fun name enter should have 7 indentation", async function () {
    let fn = "after defun before fun name enter";
    try {
      let cursorPos2d = new vscode.Position(54, 7);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 7);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for after fun name before argment enter should have 7 indentation", async function () {
    let fn = "after fun name before argment enter";
    try {
      let cursorPos2d = new vscode.Position(55, 11);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 7);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });

  test("Autoindent for after fun name missing argument enter should have 7 indentation", async function () {
    let fn = "after fun name missing argument enter";
    try {
      let cursorPos2d = new vscode.Position(56, 11);
      let lineIndentSpace = getIndent(cursorPos2d);
      assert.isTrue(lineIndentSpace == 7);
    } catch (err) {
      assert.fail(`Autoindent test for ${fn} failed`);
    }
  });


});
