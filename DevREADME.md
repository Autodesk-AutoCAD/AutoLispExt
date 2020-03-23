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
npm install --global gulp-cli
npm install 
```

## How to compile the code
You could compile the code by:
```
cd AutoLispExt
gulp build
copy utils\acadProcessFinder\bin\acadProcessFinder.exe extension\out\process
```
If you only want to build the ts file and debug it via F5, you can run:
```
=> Windows:   winCompile.bat
=> Otherwise: npm run compile
```

## How to package the extension
You could package the extension by:
```
cd AutoLispExt
gulp package
```
Note that don't run "publish" command otherwise you make sure you want to do.
For the publish command it will release current version extension to vscode market. 

## The Script pack.py
You could do all above steps  by the script pack.py, it is python2
```
cd AutoLispExt
python pack.py
```

## How to publish the extension to vscode market

You need to see the details to the page <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>

1. Create a tag on GIT, with the correct commit ID selected
2. Open https://master-2.jenkins.autodesk.com/job/AutoCAD/job/AutoLispExt/job/master/, and do the following:
2.1 Click on the "Build with Parameters" on the left side; if you can't find it, please ask Jenkins Admin for permission;
2.2 Fill in the "vsixUri" field with the Uri of the signed and tested VSIX. It shall be a link on Artifactory, e.g.:
    https://art-bobcat.autodesk.com/artifactory/team-autocad-npm/autolispext/-/autolispext-1.0.10-40.tgz!/package/autolispext.vsix
    NOTE: don't copy the Url from your web browser. Copy the address of the "Download" link of the correct VSIX file.
2.3 Check the "publish2VsCodeMarket" box;
2.4 Click on the "Build" button;
2.5 After a few minutes, visit https://marketplace.visualstudio.com/items?itemName=Autodesk.autolispext to make sure it's done.

You can also do it by hand:
1. Download the signed version pacakage from Artifactory to local machine and unzip it
2. Change path to the path in step 3, and run command "vsce login Autodesk"; it will prompt you input the PAT.
3. Run command "vsce publish --packagePath autolispextxxx.vsix"
4. Check the [extension web page](https://marketplace.visualstudio.com/items?itemName=Autodesk.autolispext) to see if it is updated.
5. run command "vsce logout Autodesk"

Note that when you input the PAT by hand in the machine. The VSCE tool will save the PAT, and next time to run "vsce publish" it will not prompt you to input the PAT and publish it to market directly. So this is risk.

## Notice

You may encounter the failure of npm install, the error message would say:
Error installing vscode.d.ts: Error: read ECONNRESET
If you encounter this problem, maybe your NODE is too old, in version v10.13.0 it 
can work well.
or run "npm cache clean -force"