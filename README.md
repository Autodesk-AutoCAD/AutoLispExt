# Welcome to the AutoCAD® LISP Extension

The Autodesk® AutoCAD® extension is an Autodesk extension to be used in connection with the Microsoft® Visual Studio Code® extension to enable you to debug AutoLISP® source files with AutoCAD.  The extension plays the dual role of both debug adapter and language server. 

## Features
1. Debug Adapter
    * Launch Debug
    * Attach Debug
2. Language Server
    * Syntax highlight
    * Smart bracket
    * Document format
    * Break on error

## Platform support
Windows | Mac | Linux |
:-------: | :---: | :-------: |
<font color=green>√</font> | <font color=green>√</font> | <font color=red>x</font> |

## How to use the AutoCAD AutoLISP Extension
To debug an AutoLISP source file, press F5 and then choose one of the following debug configurations:
- AutoLISP Debug: Launch
- AutoLISP Debug: Attach

If prompted, specify the absolute path to the AutoCAD executable (acad.exe).

Note: To avoid specifying this path each time you press F5, configure launch.json to include the absolute path to the AutoCAD executable.

## How to configure the AutoCAD path
To specify the path to the AutoCAD executable that is used with launch debug, update the “path” attribute of the launchlisp configuration in launch.json. For example:
```
{
    "version": "0.1.1",
    "configurations": [
        {
            "type": "attachlisp",
            "request": "attach",
            "name": "AutoLISP Debug: Attach",
            "attributes": {
                "process":"acad"       //process name used to filter when attach
            }
        },
        {
            "type": "launchlisp",
            "request": "launch",
            "name": "AutoLISP Debug: Launch",
            "attributes":{
                "path": "C:\\Program Files\\Autodesk\\AutoCAD AutoLISP Preview\\acad.exe", // absolute path of acad.exe
                "params": ""                                                               // AutoCAD startup parameter
            }
        }
    ]
}
```

## Notes
1.	Other LISP extensions may conflict with this extension. If you are unable to set a breakpoint in an LSP file or you cannot use launch/attach debug, you should uninstall all other LISP extensions.
2.	If you launch AutoCAD as an administrator, you should start Microsoft Visual Studio Code as an administrator as well. Otherwise, Microsoft Visual Studio Code will be unable to locate the AutoCAD process for attach debug.

## Legal
AutoCAD Lisp Extension © 2019 Autodesk, Inc. All rights reserved.

All use of this Software is subject to the Autodesk terms of service accepted accepted upon access or use of this Service or made available on the Autodesk webpage. Autodesk terms of service for Autodesk’s various web services can be found [here](https://www.autodesk.com/company/terms-of-use/en/general-terms).

### Privacy 
To learn more about Autodesk’s online and offline privacy practices, please see the [Autodesk Privacy Statement](https://www.autodesk.com/company/legal-notices-trademarks/privacy-statement).

### Autodesk Trademarks
The trademarks on the [Autodesk Trademarks page](https://www.autodesk.com/company/legal-notices-trademarks/privacy-statement) are registered trademarks or trademarks of Autodesk, Inc., and/or its subsidiaries and/or affiliates in the USA and/or other countries.

All other brand names, product names or trademarks belong to their respective holders.

### Patents
This Service is protected by patents listed on the [Autodesk Patents](https://www.autodesk.com/company/legal-notices-trademarks/patents) page.

### Autodesk Cloud and Desktop Components

This Service may incorporate or use background Autodesk online and desktop technology components. For information about these components, see [Autodesk Cloud Platform Components](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-cloud-platform-components) and [Autodesk Desktop Platform Components](https://www.autodesk.com/company/legal-notices-trademarks/autodesk-desktop-platform-components).

### Third-Party Trademarks, Software Credits and Attributions

#### https://github.com/unshiftio/url-parse:
Copyright (c) 2015 Unshift.io, Arnout Kazemier,  the Contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
