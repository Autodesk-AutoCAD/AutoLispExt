import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

import * as fs from 'fs-extra';
import * as baseConfig from "@istanbuljs/nyc-config-typescript";

import 'ts-node/register';
import 'source-map-support/register';

const NYC = require('nyc');

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		reporter: 'mochawesome',
		reporterOptions: {
			'reportDir': path.resolve(__dirname, '../../../coverage/mochawesome')
		}
	});
	mocha.useColors(true);

	const testsRoot = path.resolve(__dirname, '..');

	const nyc = await setupNYC();

	// Add all test files to mocha
	const testFiles = glob.sync('**/*.test.js', { cwd: testsRoot });
	testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

	const failures: number = await new Promise(resolve => mocha.run(resolve));

	await reportCodeCoverage(nyc);

	if (failures > 0) {
		throw new Error(`${failures} tests failed.`);
	}
}

async function setupNYC() {
	let nyc = new NYC({
		...baseConfig,
		all: true,
		cwd: path.join(__dirname, '..', '..', '..'),
		exclude: ["out/test/**"],
		include: ["out/**/*.js"],
		instrument: true,
		reporter: ['text-summary', 'html'],
		hookRequire: true,
		hookRunInContext: true,
		hookRunInThisContext: true,
		silent: false
	});
	await nyc.wrap();

	// To make sure the report is only for current run
	const tempDirectory = nyc.tempDirectory();
	if(fs.existsSync(tempDirectory)) {
		fs.removeSync(tempDirectory);
	}
	await nyc.createTempDirectory();

	return nyc;
}

async function reportCodeCoverage(nyc) {
	await nyc.writeCoverageFile();

	let textReport = '';

	let currentWrite = process.stdout.write;
	process.stdout.write = (s) => { textReport = textReport + s; return true; };

	await nyc.report.bind(nyc)();

	process.stdout.write = currentWrite;
	
	console.log(textReport);
	console.log("--------------------------------------------------------");
	console.log("Open coverage folder to check detailed report in HTML.");
	console.log("--------------------------------------------------------");
}
