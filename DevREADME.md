# Welcome to AutoCAD Lisp Extension

AutoCAD Lisp Extension is a vscode extension for debug AutoCAD AutoLISP. The Extension plays the roles of both debug adapter and language server which could enable you debug lisp with AutoCAD. The following description is for developers.

## How to setup the Dev Env
npm install -g yarn (if it's not installed yet)

Then you could setup the develop environment by:
```
cd AutoLispExt
npm install --global gulp-cli
yarn install 
```
__NOTE:__ You may see a warning `"The engine "vscode" appears to be invalid"` while running `yarn install`. This is a known problem. Please refer to the [VSCode issue](https://github.com/microsoft/vscode/issues/91009).
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
=> Otherwise: ./macCompile.sh
```

## How to debug the extension

1. open the source codes folder "AutoLispExt" in the vscode.
2. add some breakpoints as needed.
3. hit F5 and select "Extension Client", then it will start another vscode instance with running the extension. 
4. Do some operations to invoke the codes which are added breakpoints, vscode will stop in the first instance.


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

## Run tests

You have two ways to run the tests:
  - Run inside the VS Code and begin debugging by choosing "Extension Tests"
  - Run on terminal outside of VS Code and make sure no VS code is running (VS Code terminal will not work due to VS Code limitation) 
```
yarn test
```

### The following steps require access to Autodesk network resources and therefore can only be done by Autodesk employees

## Build status

[![Build Status](https://master-2.jenkins.autodesk.com/buildStatus/icon?=job/AutoCAD/job/AutoLispExt/master)](https://master-2.jenkins.autodesk.com/buildStatus/icon?=job/AutoCAD/job/AutoLispExt/master/)

## package location

[extension package posted location](https://art-bobcat.autodesk.com/artifactory/webapp/#/artifacts/browse/tree/General/team-autocad-npm/autolispext/-)

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
1. Download the signed version package from Artifactory to local machine and unzip it
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

## Style Guide
Below are some general code guidelines that should be followed when adding or updating the code base. It is the expectation that participating members actively apply this style guide to legacy code during maintenance so we can eventually have a noticeably consistent developer experience.
### Names
1. Use `PascalCase` for type/interface names, enums, setters, getters and global singletons
2. Use `camelCase` for function, argument and local variable names.
3. Use `UPPER_CASE` for global constants.
4. Use `_` as a prefix for private variables
5. Use `I` as a prefix for interface names that define function declarations.
5. Use whole words in names where possible.

### Types
1. Do not export types/functions unless you need to share them across multiple components.
2. Within a file, type definitions should come first.

### Comments
1. Use JSDoc-style comments for functions, interfaces, enums, and classes.
2. Limited to using an informal description and @type/@param/@return when applicable

### General
1. Use arrow functions over anonymous function expressions.
2. Always surround loop and conditional bodies with curly braces.
3. Open curly braces always go on the same line as whatever necessitates them.
4. `else` goes on the same line as the closing curly brace.
5. Use two (2) spaces for indentation.
6. The `export` keyword should be on its own line.
7. Function should always provide type declarations for its return and argument values
8. Function bodies (including getters/setters) must appear on separate lines from their signature declarations regardless of their simplicity. Empty constructors that exist for clarity are acceptable on a single line
9. Use a maximum of 140 chars per lines; including leading whitespace
10. Strings should always use single quotes if they do not contain interpolated values:
```typescript
  let foo = 'bar';       // static string
  let baz = `${5 * 5}`;  // interpolated string
  let qux = 'These aren\'t the droids you\'re looking for.';  // escaped quotes in string
```

### Classes
1. Avoid public properties - use setters/getters.
2. Do not use the `public` keyword for public members - it is implied by default.
3. Initialize all private properties to an initial value or `null`, unless they 
   will be initialized in the constructor. If a basic type is used, do not add 
   a type specifier (e.g. `private _someValue = 0;`).
4. Ordering of members within a class should be:
  - `static`
  - `public`
  - `protected`
  - `private`
5. Start with getters/setters in each scope, then methods. Protected and private
   properties go last.
6. Abstract methods go in the same location as they would in the implemented class.

### Examples
- Interface declaration:

```typescript
/**
 * The base message object which can be sent to a message handler.
 */
export
interface IMessage {
  /**
   * The type of the message.
   * @type {string}
   */
  type: string;
}
```

- If-Else block:

```typescript
if (parent) {
  this._parent = null;
} else if (this.isAttached) {
  this.detach(); 
}
```


- Bit flags:

```typescript
export
enum WidgetFlag {
  /**
   * The widget is attached to the DOM.
   */
  IsAttached = 0x1,
}
```

```typescript
export
class Widget {
  /**
   * Test whether the given widget flag is set.
   * @param {object} flag WidgetFlag
   * @return {boolean}
   */
  testFlag(flag: WidgetFlag): boolean {
    return (this._wflags & flag) !== 0;
  }

  /**
   * Set the given widget flag.
   * @param {object} flag WidgetFlag
   * @returns {void}
   */
  setFlag(flag: WidgetFlag): void {
    this._wflags |= flag;
  }

  /**
   * Clear the given widget flag.
   * @param {object} flag WidgetFlag
   * @returns {void}
   */
  clearFlag(flag: WidgetFlag): void {
    this._wflags &= ~flag;
  }

  private _wflags = 0;
}
```

