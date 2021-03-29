import * as chai from 'chai';
// import * as chaiFiles from 'chai-files';
import { Position } from 'vscode';
import { LispAtom } from '../../format/sexpression';
import { LispFormatter } from '../../format/formatter';
import { TextDocument } from 'vscode';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import * as fs from 'fs'
import * as path from 'path';

let prettydiff = require("prettydiff");
console.log('__dirname in test context is :' + __dirname);
let unformat_file = path.join(__dirname + "/../../../extension/src/test/Source/unFormatted.lsp");
let formatedfile = path.join(__dirname + "/formatedfile.lsp");
let formatedBasefile = path.join(__dirname + "/../../../extension/src/test/Base/formatedBasefile.lsp");
// chai.use(chaiFiles);

let expect = chai.expect;
// let file = chaiFiles.file;
// let dir = chaiFiles.dir;
let output     = "",
    options    = prettydiff.options;
options.source = "my code";
output         = prettydiff();

console.log('output in test context is :' + output);

suite("LispFormatter Tests", function () {	
	try {
		
		const doc = ReadonlyDocument.open(unformat_file); 						
		let fmt = LispFormatter.format(doc, null);
		fs.writeFile(unformat_file, fmt, err => {
			if (err) {
			 console.error('Failed to write file: ', err);
			} else console.log('write file failed');
		   });
		let expectedFormatString =  
`(defun c:formatTest (/ a b) 
  (setq a 3)
  (setq b "test")
  (princ a)
  (princ b)
)`.split( "\n" ).join( "\r\n" );

		test("LispFormatter.format() Test", function () {
			try {
				// chai.assert.equal(formatedstring.length,fmt.length);
				chai.assert.equal(fmt,expectedFormatString);

			}
			catch (err) {
				chai.assert.fail("The formatted string is different");
			}
		});
		test("LispFormatter.format() whole file compare Test", function () {
			try {
				// chai.assert.equal(formatedstring.length,fmt.length);
			
				// chai.assert.equal(fmt,expectedFormatString);
				// expect(file(formatedBasefile)).to.equal(file(formatedfile));

			}
			catch (err) {
				chai.assert.fail("The formatted string is different");
			}
		});

	} catch (error) {
		chai.assert.fail("Failed to run the format test");
		
	}
});
