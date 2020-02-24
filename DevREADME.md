# Welcome to AutoCAD Lisp Extension

AutoCAD Lisp Extension is a vscode extension for debug AutoCAD AutoLISP. The Extension plays the roles of both debug adapter and language server which could enable you debug lisp with AutoCAD. The following description is for developers.

## Build status

[![Build Status](https://master-2.jenkins.autodesk.com/buildStatus/icon?=job/AutoCAD/job/AutoLispExt/master)](https://master-2.jenkins.autodesk.com/buildStatus/icon?=job/AutoCAD/job/AutoLispExt/master/)

## package location

[extension package posted location](https://art-bobcat.autodesk.com/artifactory/webapp/#/artifacts/browse/tree/General/team-autocad-npm/autolispext/-)

## How to setup the Dev Env
You could setup the develop environment by:
```
cd AutoLispExt
npm install 
```

## How to compile the code
You could compile the code by:
```
cd AutoLispExt
npm run compile
```

## How to package the extension
You could package the extension by:
```
cd AutoLispExt
.\\node_modules\\.bin\\vsce package
```

## The Script pack.py
You could do all above steps  by the script pack.py.
```
cd AutoLispExt
python pack.py
```

## How to publish the extension to vscode market

You need to see the details to the page <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>

1. Ask BRE to do the sign via send out an [Action Request](https://engineering.autodesk.com/esc/)
2. BRE will do the sign and upload the package to the above "pacakge location"
3. Download the signed version pacakage to local machine and unzip it
4. Change path to the path in step 3, and run command "vsce login Autodesk"; it will prompt you input the PAT.
5. Run command "vsce publish --packagePath autolispextxxx.vsix"
6. Check the [extension web page](https://marketplace.visualstudio.com/items?itemName=Autodesk.autolispext) to see if it is updated.
7. run command "vsce logout Autodesk"

Note that when you input the PAT by hand in the machine. The VSCE tool will save the PAT, and next time to run "vsce publish" it will not prompt you to input the PAT and publish it to markey directly.

## Notice

You may encounter the failure of npm install, the error message would say:
Error installing vscode.d.ts: Error: read ECONNRESET
If you encounter this problem, maybe your NODE is too old, in version v10.13.0 it 
can work well.
or run "npm cache clean -force"