# Welcome to the AutoCAD® LISP Extension

The AutoCAD AutoLISP extension is a Microsoft® Visual Studio® Code extension that enables you to debug AutoLISP® source files with AutoCAD. The extension plays the dual role of both debug adapter and language server.

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

