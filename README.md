# Visual Studio Code Extension for AutoCAD® AutoLISP

This extension adds support for AutoCAD AutoLISP source (LSP) files to Visual Studio Code. It allows you to edit and debug your lisp programs with AutoCAD 2021.
For information on creating lisp programs for AutoCAD with the AutoLISP programming language, see the:
   - AutoCAD AutoLISP: [Developer’s Guide](https://www.autodesk.com/autolisp-developers-guide)
   - AutoCAD AutoLISP: [Reference](https://www.autodesk.com/autolisp-reference)
   - AutoCAD AutoLISP: [Tutorials](https://www.autodesk.com/autolisp-tutorials)

The extension is open source and distributed under Apache License v2.0.

Your feedback is highly appreciated! Should you have any suggestions, please create an issue [here](https://github.com/Autodesk-AutoCAD/AutoLispExt/issues).

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
    * Easy access to online documentation through the context menu (selection sensitive)
    * Go to definition
    * Insert code region

3. AutoLISP Project
    * Open a project (.prj)
    * Create a project
    * Add .lsp files into a project
    * Remove files from a project
    * Find & Search in a project

## Getting started
- Step 1. Install a supported AutoCAD release on your system. 
- Step 2. Install this extension.
- Step 3. Open a folder that contains the AutoLISP source (LSP) files you want to work on. Or open an Autolisp project file via VSCODE side bar.
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

## How to use the extension
To debug an AutoLISP source file:
1.  Open a LSP file.
2.  Click Run > Start Debugging (or press F5). 
3.  Then choose one of the following debug configurations:
     * AutoLISP Debug: Launch – Launches a new instance of the AutoCAD application to debug the current LSP file.
     * AutoLISP Debug: Attach – Allows you to attach to a running instance of the AutoCAD application to debug the current LSP file.
    If prompted, specify the absolute path to the AutoCAD executable (acad.exe on Windows or AutoCAD on Mac).

Note: To avoid specifying this path each time you click Run > Start Debugging (or press F5), this path is automatically saved with the extension. For additional information on configuring the extension, see How to Configure the AutoCAD Path.

## How to Configure the AutoCAD Path
1.  In Visual Studio Code, click File > Preferences > Settings.
2.  Under the User tab, expand Extensions and click AutoCAD® AutoLISP Configuration.
3.  Update the Debug: Attach Process setting with the process name in which to filter on during Debug Attach.
4.  Update the Debug: Launch Program setting to specify the path of the AutoCAD executable to use with Debug Launch.
5.  Update the Debug: Launch Parameters setting to specify the AutoCAD startup parameters.

Note: In the following examples, be sure to substitute the path with that of the AutoCAD application installed on your workstation.

Example (on Windows):
* Launch Program: C:\Program Files\Autodesk\AutoCAD &lt;release&gt;\acad.exe
* Attach Process: acad

Example (on Mac OS):
* Launch Program: /Applications/Autodesk/AutoCAD /AutoCAD &lt;release&gt;.app/Contents/MacOS/AutoCAD
* Attach Process: AutoCAD

For more information, see the [documentation online](https://www.autodesk.com/autolisp-extension).

## Notes

1.	Other AutoLISP extensions may conflict with this extension. If you are unable to set a breakpoint in a LSP file or you can’t use the launch/attach debug configurations, you should disable or uninstall all other AutoLISP extensions.
2.	When using this extension on Mac® OS, the "Launch Program" attribute in extension setting should be ".../AutoCAD &lt;release&gt;.app/Contents/MacOS/AutoCAD" rather than the absolute path of AutoCAD &lt;release&gt;.app.
3.	For AutoCAD specialized toolsets or OEM-based products, the product name might not be the same as AutoCAD or acad.exe. To use this extension with those products, set the value of the "Launch Program" attribute in extension setting based on the product you want to debug with.
4.	If you launch AutoCAD as an administrator, you should start Microsoft Visual Studio Code as an administrator as well. Otherwise, Microsoft Visual Studio Code will be unable to locate the AutoCAD process for attach debug.

## Legal
Visual Studio Code Extension for AutoCAD® AutoLISP © 2020 Autodesk, Inc. All rights reserved.

### Privacy 
To learn more about Autodesk’s online and offline privacy practices, please see the [Autodesk Privacy Statement](https://www.autodesk.com/company/legal-notices-trademarks/privacy-statement).

### Trademarks
The license does not grant permission to use the trade names, trademarks, service marks, or product names of Autodesk, except as required for reasonable and customary use in describing the origin of the work and reproducing the content of any notice file. Autodesk, the Autodesk logo, AutoCAD and AutoLISP are registered trademarks or trademarks of Autodesk, Inc., and/or its subsidiaries and/or affiliates in the USA and/or other countries. All other brand names, product names, or trademarks belong to their respective holders. Autodesk is not responsible for typographical or graphical errors that may appear in this document.

All other brand names, product names or trademarks belong to their respective holders.

### Third-Party Trademarks, Software Credits and Attributions

TBD.

See [here](NOTICE.md).
