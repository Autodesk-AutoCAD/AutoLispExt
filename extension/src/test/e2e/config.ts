import { MochaOptions } from "vscode-extension-tester";

// As described in the following artical:
// https://github.com/redhat-developer/vscode-extension-tester/wiki/Mocha-Configuration
// "Since this framework is using Mocha programatically, we lose certain ways to configure the test runner. 
//  We do however support using mocha configuration files, with roughly the same functionality as described 
//  in mochajs documentation."
//
const options: MochaOptions = {
    reporter: 'spec', // the default value
    timeout: 20000, // set enough time for debug config tests 
    slow: 15000, // set enough time for debug config tests 
    ui: 'bdd' // the default value, providing describe(), it(), before(), after(), beforeEach(), afterEach()
}

export default options;
