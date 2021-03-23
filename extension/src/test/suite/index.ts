import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

const NYC = require('nyc');
import * as baseConfig from "@istanbuljs/nyc-config-typescript";
import 'ts-node/register';
import 'source-map-support/register';
import * as fs from 'fs-extra';

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd'
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
	// Setup coverage pre-test, including post-test hook to report

	let nyc = new NYC({
		...baseConfig,
		cwd: path.join(__dirname, '..', '..', '..'),
		reporter: ['text', 'html'],
		all: true,
		silent: false,
		instrument: true,
		hookRequire: true,
		hookRunInContext: true,
		hookRunInThisContext: true,
		include: ["out/**/*.js"],
		exclude: ["out/test/**"],
	});
	await nyc.wrap();

	// Delete the 'coverage' folder first to make sure the HTML report is only for current run of npm test
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
