import * as chai from 'chai';
import * as chaiFiles from 'chai-files';
import { Position } from 'vscode';
import { LispAtom } from '../../format/sexpression';
import { LispFormatter } from '../../format/formatter';
import { TextDocument } from 'vscode';
import { ReadonlyDocument } from '../../project/readOnlyDocument';
import * as fs from 'fs'
import * as path from 'path';

let prettydiff = require("prettydiff");
console.log('__dirname in test context is :' + __dirname);
let unformat_file1 = path.join(__dirname + "/../../../extension/src/test/SourceFile/unFormatted1.lsp");
let formatedOutputFile1 = path.join(__dirname + "/../../../extension/src/test/OutputFIle/formatedOutputFile1.lsp");
let formatedBasefile1 = path.join(__dirname + "/../../../extension/src/test/Baseline/formatedBasefile1.lsp");
chai.use(chaiFiles);

let expect = chai.expect;
let file = chaiFiles.file;
let dir = chaiFiles.dir;


// console.log('output in test context is :' + output);

suite("LispFormatter Tests", function () {	
	try {
		
		
			// output = prettydiff.api({
			// 	source: source, 
			// 	mode: 'diff',
			// 	diff: target, 
			// 	lang: 'text',
			//   });
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
				// chai.assert.equal(fmt,expectedFormatString);
				const doc = ReadonlyDocument.open(unformat_file1); 						
				let fmt = LispFormatter.format(doc, null);
				fs.writeFile(formatedOutputFile1, fmt, err => {
						if (err) {
							console.error('Failed to write file: ', err);
						} 
						// let output     = "",
						// options    = prettydiff.options;
						// options.source = formatedOutputFile1;
						// options.diff = formatedBasefile1;
						// options.api === "node";
						// options.source = fs.readFileSync(formatedOutputFile1);
						// console.log('formatedOutputFile1 content is ' +fs.readFileSync(formatedOutputFile1) );
						// console.log('formatedBasefile1 content is ' +fs.readFileSync(formatedBasefile1) );
						// options.diff = fs.readFileSync(formatedBasefile1);
						// output = prettydiff();
						// output = prettydiff.api({
						// 	source: options.source, 
						// 	mode: 'diff',
						// 	diff: options.diff, 
						// 	lang: 'text',
						//   });
						// console.log('diff is :' + output[0]);
						expect(file(formatedOutputFile1)).to.equal(file(formatedBasefile1));

					});

		// }, options = prettydiff.options, lf = (options.crlf === true)

			// prettydiff.api();
			// output = prettydiff.api({
			// 	source: options.source, 
			// 	mode: 'diff',
			// 	diff: options.diff, 
			// 	lang: 'text',
			//   });
			// console.log('diff is :');
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
