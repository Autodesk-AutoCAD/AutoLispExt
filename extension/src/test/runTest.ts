import * as path from 'path';
// import * as process from 'process';
import { runTests } from 'vscode-test';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		// The __dirname is  \AutoLispExt\out\test
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		let extensionTestsPath ='';
		// The path to the extension test or code coverage script
		// Passed to --extensionTestsPath
		if (process.argv[2] === '--codecoverage') {
		 	extensionTestsPath = path.resolve(__dirname, './suite/codeCoverage');
		} else {
			extensionTestsPath = path.resolve(__dirname, './suite/index');
		}
		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();