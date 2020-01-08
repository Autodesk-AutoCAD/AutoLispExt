# Welcome to AutoCAD Lisp Extension

AutoCAD Lisp Extension is a vscode extension for debug AutoCAD AutoLISP. The Extension plays the roles of both debug adapter and language server which could enable you debug lisp with AutoCAD. The following description is for developers.

## Build status

[![Build Status](https://master-2.jenkins.autodesk.com/buildStatus/icon?=job/AutoCAD/job/AutoLispExt/master)](https://master-2.jenkins.autodesk.com/buildStatus/icon?=job/AutoCAD/job/AutoLispExt/master/)


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

## Notice
You may encounter the failure of npm install, the error message would say:
Error installing vscode.d.ts: Error: read ECONNRESET
If you encounter this problem, maybe your NODE is too old, in version v10.13.0 it 
can work well.
or run "npm cache clean -force"