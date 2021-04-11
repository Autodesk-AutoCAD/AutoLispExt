import * as chai from "chai";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from 'os';
import { getLispAndDclCompletions,getCmdAndVarsCompletionCandidates } from "../../completion/autocompletionProvider";
import { before } from "mocha";
import { ReadonlyDocument } from "../../project/readOnlyDocument";
import { allCmdsAndSysvars } from "../../resources";

let assert = chai.assert;
const testDir = path.join(__dirname + "/../../../extension/src/test");
const outputDir = path.join(testDir + "/OutputFile");
let LispFile = "";
let DclFile = "";
let lispdoc: vscode.TextDocument;
let dcldoc: vscode.TextDocument;
fs.mkdir(outputDir, { recursive: true }, (err) => {
  if (err) {
    return console.error(err);
  }
});

function createFakeTextDcoument() {
  LispFile = path.join(testDir + "/OutputFile/test.lsp");
  DclFile = path.join(testDir + "/OutputFile/test.dcl");
  try {
    if (!fs.existsSync(LispFile)) {
      fs.writeFileSync(LispFile, "");
    }
    if (!fs.existsSync(DclFile)) {
      fs.writeFileSync(DclFile, "");
    }
    lispdoc  = ReadonlyDocument.open(LispFile);
    dcldoc = ReadonlyDocument.open(DclFile);
  } catch (error) {
    console.log(error);
  }
}

function getSuggestLabel(doc : vscode.TextDocument ,inputword : string,isupper :boolean){
  const suggestionList: Array<vscode.CompletionItem> = getLispAndDclCompletions(
    doc,
    inputword,
    isupper
  );
  let suggestLabel = [];
  suggestionList.forEach((item) => {
    suggestLabel.push(item.label);
  });
  return suggestLabel;
}

function getSuggestLabelCMD(cmd :string[] ,inputword : string,isupper :boolean){
  let suggestionList = getCmdAndVarsCompletionCandidates(cmd,inputword,isupper)
  let suggestLabel = [];
  suggestionList.forEach((item) => {
    suggestLabel.push(item.label);
  });
  return suggestLabel;
}
suite("AutoCompletion Tests", function () {
  // Windows only functions (vla-,vlax-,vlr-,vl-load-com,vl-load-reactors,vlisp-)
  before(async () => {
    this.timeout(0);
    await vscode.extensions.getExtension("Autodesk.autolispext").activate();

    if (vscode.extensions.getExtension("Autodesk.autolispext") === undefined) {
      console.log("Autodesk.autolispext NOT exist");
    } else {
      await vscode.extensions.getExtension("Autodesk.autolispext").activate();
    }
    createFakeTextDcoument();
  });

  test("AutoCompletion Test for de",async function () {
    this.timeout(0);
    await vscode.extensions.getExtension("Autodesk.autolispext").activate();
    const inputword = "de";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = ['defun', 'defun-q'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for se", function () {
    const inputword = "se";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = ['setq','set','setenv','setvar','set_tile','setcfg','setfunhelp','setview'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for str", function () {
    const inputword = "str";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      
      let expectedList = ['strcase','strcat','strlen'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for ;", function () {
    const inputword = ";";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = [];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for (", function () {
    const inputword = "(";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = [];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for ca", function () {
    const inputword = "ca";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = ['caaaar','caaadr','caadar','caaddr','cadaar','cadadr','caddar',
      'cadddr','caaar','caadr','cadar','caddr','caar','cadr','car'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for Se", function () {
    //Mixed upper and lower case
    const inputword = "Se";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = [];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for PRI", function () {
    //Upcase test
    const inputword = "PRI";
    try {
      const isupper = true;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = ['PRIN1','PRINC','PRINT'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test for vlax-get", function () {
    const inputword = "vlax-get";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(lispdoc,inputword,isupper);
      let expectedList = [];
      if (os.platform() === "win32") {
        expectedList = [
          "vlax-get",
          "vlax-get-acad-object",
          "vlax-get-object",
          "vlax-get-or-create-object",
          "vlax-get-property",
        ];
        chai.expect(suggestLabel).to.eql(expectedList);
      } else {
        expectedList = [];
        chai.expect(suggestLabel).to.eql(expectedList);
      }
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });
  
  test("AutoCompletion Test for column in DCL", function () {
    //Mixed upper and lower case
    const inputword = "col";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(dcldoc,inputword,isupper);
      let expectedList = ['color','column'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });
  
  test("AutoCompletion Test for rad in DCL", function () {
    //Mixed upper and lower case
    const inputword = "rad";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabel(dcldoc,inputword,isupper);
      let expectedList = ['radio_button','radio_cluster','radio_column','radio_row'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test autocompletion Inside Double Quote for ci", function () {
    //Test Cmd And Vars in Double Quote in lowercase
    const inputword = "ci";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabelCMD(allCmdsAndSysvars,inputword,isupper);
      let expectedList = ['circle','circlerad'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test autocompletion Inside Double Quote for CI", function () {
    //Test Cmd And Vars in Double Quote in uppercase
    const inputword = "CI";
    try {
      const isupper = true;
      let suggestLabel = getSuggestLabelCMD(allCmdsAndSysvars,inputword,isupper);
      let expectedList = ['CIRCLE','CIRCLERAD'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

  test("AutoCompletion Test autocompletion Inside Double Quote for _pli", function () {
    //Test Cmd And Vars in Double Quote with underline _
    const inputword = "_pli";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabelCMD(allCmdsAndSysvars,inputword,isupper);
      let expectedList = ['_pline','_plineconvertmode','_plinegcenmax','_plinegen',
      '_plinereversewidths','_plinetype','_plinewid'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });
  test("AutoCompletion Test autocompletion Inside Double Quote for -plo", function () {
    //Test Cmd And Vars in Double Quote with dash line -
    const inputword = "-plo";
    try {
      const isupper = false;
      let suggestLabel = getSuggestLabelCMD(allCmdsAndSysvars,inputword,isupper);
      let expectedList = ['-plot','-plotstyle','-plotstamp'];
      chai.expect(suggestLabel).to.eql(expectedList);
    } catch (err) {
      assert.fail(`AutoCompletion test for ${inputword} failed`);
    }
  });

});
