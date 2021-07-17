import * as path from 'path';
// import * as process from 'process';
import { runTests } from 'vscode-test';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		let extensionTestsPath ='';
		// The path to the extension test or code coverage script
		// Passed to --extensionTestsPath
		if (process.argv[2] === '--codecoverage') {
		 	extensionTestsPath = path.resolve(__dirname, './suite/codeCoverage');
		} else {
			extensionTestsPath = path.resolve(__dirname, './suite/index');
		}
		
		const workSpace = path.resolve(__dirname, '../../extension/src/test/SourceFile/renaming');

		//const wsFile = path.resolve(workSpace, 'comments.lsp');
		// This version can pre-load an active file, but "passive" activation of the extension is breaking NYC code coverage in an ambiguous ways
		//await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [workSpace, wsFile, '--disable-extensions']});

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [workSpace, '--disable-extensions']});
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();