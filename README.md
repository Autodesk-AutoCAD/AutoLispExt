# AutoCAD® AutoLISP® Extension for Visual Studio Code

This extension adds support for AutoCAD AutoLISP source (LSP) files to Visual Studio Code. It allows you to edit and debug your lisp programs with AutoCAD 2021.
For information on creating lisp programs for AutoCAD with the AutoLISP programming language, see the:
   - AutoCAD AutoLISP: [Developer’s Guide](https://www.autodesk.com/autolisp-developers-guide)
   - AutoCAD AutoLISP: [Reference](https://www.autodesk.com/autolisp-reference)
   - AutoCAD AutoLISP: [Tutorials](https://www.autodesk.com/autolisp-tutorials)

The extension is distributed under the [Autodesk Terms of Use](https://www.autodesk.com/company/terms-of-use/en/general-terms#offerings).

## Features
1. AutoLISP Debugger
    * Launch/Attach Debug
    * Debug console
    * Breakpoints
    * Step In/Out/Over
    * Variables
    * Callstacks
    * Break on error

2. AutoLISP Editor
    * Syntax highlight
    * Autocompletion and code snippets
    * Smart bracket
    * Document/selection formatting using narrow or wide style
    * Auto indent

3. AutoLISP Project
    * Open a project (.prj)
    * Create a project
    * Add .lsp files into a project
    * Remove files from a project
    * Find & Search in a project

## Getting started
- Step 1. Install a supported AutoCAD release on your system.
- Step 2. Install this extension.
- Step 3. Open a folder that contains the AutoLISP source (LSP) files you want to work on.
- Step 4. Open a LSP file to modify or debug.
- Step 5. Choose a debug configuration and start debugging the current LSP file.

## Installation
This extension can be installed through the Extension panel within VS Code. Search for AutoCAD AutoLISP Extension.
You can also install this extension by entering the following into the VS Code Open Command Palette...(click View > Command Palette... or press Ctrl+SHIFT+P):
ext install autodesk.autolispext

## Platform support
Windows | Mac | Linux |
:-------: | :---: | :-------: |
<font color=green>√</font> | <font color=green>√</font> | <font color=red>x</font> |

## How to use the AutoCAD AutoLISP Extension
To debug an AutoLISP source file:
1.  Open a LSP file.
2.  Click Debug > Start Debugging (or press F5). 
3.  Then choose one of the following debug configurations:
     * AutoLISP Debug: Launch – Launches a new instance of the AutoCAD application to debug the current LSP file.
     * AutoLISP Debug: Attach – Allows you to attach to a running instance of the AutoCAD application to debug the current LSP file.
    If prompted, specify the absolute path to the AutoCAD executable (acad.exe on Windows or AutoCAD on Mac).

Note: To avoid specifying this path each time you click Debug > Start Debugging (or press F5), this path is automatically saved into extension setting. The details are in the following session:

## How to configure the AutoCAD path
1. In Visual Studio Code "File" menu, select "Preferences" -> "Settings".
2. Expand "Extensions" in "User" tab, and click on "AutoCAD® AutoLISP Configuration".
3. Update the "Attach Process" attribute to specify the process name used to filter when attach.
4. Update the "Launch Program" attribute to specify the path of AutoCAD executable that is used with launch debug.
5. Update the "Launch Parameters" attribute to specify the AutoCAD startup parameters.

Note:
In the following configurations, substitute <release> based on the AutoCAD application installed on your workstation.

Example (on Windows):
Launch Program: C:\Program Files\Autodesk\AutoCAD <release>\acad.exe
Attach Process: acad

Example (on Mac):
Launch Program: /Applications/Autodesk/AutoCAD <release>/AutoCAD <release>.app/Contents/MacOS/AutoCAD
Attach Process: AutoCAD

For more information, see the [AutoCAD AutoLISP extension](https://www.autodesk.com/autolisp-extension) documentation online.

## Notes

1.	Other AutoLISP extensions may conflict with this extension. If you are unable to set a breakpoint in a LSP file or you can’t use the launch/attach debug configurations, you should disable or uninstall all other AutoLISP extensions.
2.	When using this extension on Mac® OS, the "Launch Program" attribute in extension setting should be ".../AutoCAD <release>.app/Contents/MacOS/AutoCAD" rather than the absolute path of AutoCAD <release>.app.
3.	For AutoCAD specialized toolsets or OEM-based products, the product name might not be the same as AutoCAD or acad.exe. To use this extension with those products, set the value of the "Launch Program" attribute in extension setting based on the product you want to debug with.
4.	If you launch AutoCAD as an administrator, you should start Microsoft Visual Studio Code as an administrator as well. Otherwise, Microsoft Visual Studio Code will be unable to locate the AutoCAD process for attach debug.

## Legal
AutoCAD Lisp Extension © 2020 Autodesk, Inc. All rights reserved.

All use of this Software is subject to the Autodesk terms of service accepted accepted upon access or use of this Service or made available on the Autodesk webpage. Autodesk terms of service for Autodesk’s various web services can be found [here](https://www.autodesk.com/company/terms-of-use/en/general-terms).

### Privacy 
To learn more about Autodesk’s online and offline privacy practices, please see the [Autodesk Privacy Statement](https://www.autodesk.com/company/legal-notices-trademarks/privacy-statement).

### Trademarks
The license does not grant permission to use the trade names, trademarks, service marks, or product names of Autodesk, except as required for reasonable and customary use in describing the origin of the work and reproducing the content of any notice file. Autodesk, the Autodesk logo, AutoCAD and AutoLISP are registered trademarks or trademarks of Autodesk, Inc., and/or its subsidiaries and/or affiliates in the USA and/or other countries. All other brand names, product names, or trademarks belong to their respective holders. Autodesk is not responsible for typographical or graphical errors that may appear in this document.

All other brand names, product names or trademarks belong to their respective holders.

### Patents
This Service is protected by patents listed on the [Autodesk Patents](https://www.autodesk.com/company/legal-notices-trademarks/patents) page.

### Autodesk Cloud and Desktop Components

This Service may incorporate or use background Autodesk online and desktop technology components. For information about these components, see [Autodesk Cloud Platform Components](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-cloud-platform-components) and [Autodesk Desktop Platform Components](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-desktop-platform-components).

### Third-Party Trademarks, Software Credits and Attributions

#### https://github.com/request/request:
Licensed under the Apache License, Version 2.0 (the
“License”); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on 
Autodesk Confidential - Internal Use Only
Autodesk Internal Use Only
an “AS IS” BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing
permissions and limitations under the License.

#### https://github.com/palantir/tslint:
Licensed under the Apache License, Version 2.0 (the
“License”); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on 
Autodesk Confidential - Internal Use Only
Autodesk Internal Use Only
an “AS IS” BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing
permissions and limitations under the License.

#### https://github.com/microsoft/TypeScript:
Copyright (c) Microsoft Corporation. All rights reserved. 

Licensed under the Apache License, Version 2.0 (the
“License”); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on 
Autodesk Confidential - Internal Use Only
Autodesk Internal Use Only
an “AS IS” BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing
permissions and limitations under the License.

#### https://github.com/microsoft/vscode-vsce:
Copyright (c) Microsoft Corporation. All rights reserved. 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software 
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT 
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

#### https://github.com/Microsoft/vscode-languageserver-node:
Copyright (c) Microsoft Corporation. All rights reserved. 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software 
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT 
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
