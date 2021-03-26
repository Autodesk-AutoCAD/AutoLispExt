import * as path from 'path';
// import * as process from 'process';
import { runTests } from 'vscode-test';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../../../');
		let extensionTestsPath ='';
		console.log('argv[0] is ' + process.argv[0]);
		console.log('argv[1] is ' + process.argv[1]);
		console.log('argv[2] is ' + process.argv[2]);
		// The path to the extension test script
		// Passed to --extensionTestsPath
		if (process.argv[2] === '--codecoverage') {
		 	extensionTestsPath = path.resolve(__dirname, './suite/codeCoverage');
		} else {
			extensionTestsPath = path.resolve(__dirname, './suite/index');
		}
		// Download VS Code, unzip it and run the integration test
		console.log('extensionTestsPath is ' + extensionTestsPath);
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('err is ' + err);
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();