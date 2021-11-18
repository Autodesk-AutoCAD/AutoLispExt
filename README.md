# Visual Studio Code Extension for AutoCAD® AutoLISP

[中文简体](#AutoCAD®-AutoLISP-Visual-Studio-Code-扩展)

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
* Launch Program: /Applications/Autodesk/AutoCAD &lt;release&gt;/AutoCAD &lt;release&gt;.app/Contents/MacOS/AutoCAD
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

See [here](NOTICE.md).

# AutoCAD® AutoLISP Visual Studio Code 扩展

[English](#Visual-Studio-Code-Extension-for-AutoCAD®-AutoLISP)

这是一个 Visual Studio Code 扩展，用来支持在 VSCode 中编写 AutoCAD AutoLISP 源文件（LSP）。它允许您使用 AutoCAD 2021 编辑和调试 lisp 程序。有关使用 AutoLISP 编程语言为 AutoCAD 创建 lisp 程序的信息，请参见：

- AutoCAD AutoLISP: [Developer’s Guide](https://www.autodesk.com/autolisp-developers-guide)
- AutoCAD AutoLISP: [Reference](https://www.autodesk.com/autolisp-reference)
- AutoCAD AutoLISP: [Tutorials](https://www.autodesk.com/autolisp-tutorials)

该扩展开源，在 Apache License v2.0 下发布。

非常感谢您的反馈！如果您有任何建议，请在[此处](https://github.com/Autodesk-AutoCAD/AutoLispExt/issues)创建一个 Issue。

## 特性

1. AutoLISP 调试
   - 启动/附着调试
   - 调试控制台
   - 断点
   - 单步调试/单步跳出/单步跳过
   - 变量
   - 调用堆栈
   - 出错时跳出
2. AutoLISP 编辑器
   - 语法高亮
   - 代码补全、代码片段
   - 智能括号
   - 代码格式化（紧凑或宽松）
   - 自动缩进
   - 通过上下文菜单轻松访问在线文档（选择敏感）
   - 转到定义
   - 插入代码区域
3. AutoLISP 项目
   - 打开项目（.prj）
   - 创建项目
   - 将 .lsp 文件添加到项目
   - 从项目中删除 .lsp 文件
   - 在项目中搜索/查找

## 开始

1. 在系统上安装受支持的 AutoCAD 版本。
2. 安装此扩展。
3. 打开要处理的 AutoLISP 源程序（LSP）文件所在的文件夹。或者通过 VSCode 侧栏打开 AutoLISP 项目文件。
4. 打开要修改或调试的 LSP 文件。
5. 选择调试配置，并开始调试当前 LSP 文件。

## 安装

可以通过 VSCode 中的扩展面板搜索并安装此扩展。搜索 AutoCAD AutoLISP Extension。
也可以通过在 VSCode 命令面板中输入以下命令来安装此扩展：依次单击`视图` > `命令面板…`（或按 Ctrl+Shift+P）> 键入 ext install autodesk.autolispext 后回车。

## 支持平台

| Windows | Mac  | Linux |
| :-----: | :--: | :---: |
<font color=green>√</font> | <font color=green>√</font> | <font color=red>x</font> |

## 如何使用

1. 打开一个 LSP 文件。
2. 依次单击`运行` > `启动调试` (或按 F5)。
3. 然后选择以下调试配置之一：
   - AutoLISP Debug: Launch——启动 AutoCAD 应用程序的新实例以调试当前 LSP 文件。
   - AutoLISP Debug: Attach——将当前 LSP 文件附加到正在运行的 AutoCAD 应用程序实例以进行调试。如果出现提示，请指定 AutoCAD 可执行文件（Windows 上的 acad.exe 或 Mac 上的 AutoCAD）的绝对路径。

注意：为了避免每次单击`运行` > `启动调试`（或按 F5）时都指定此路径，此路径将由扩展自动保存。有关配置扩展的其他信息，请参见*如何配置 AutoCAD 路径*。

## 如何配置 AutoCAD 路径

1. 在 Visual Studio Code 中，依次单击`文件` > `首选项` > `设置`。
2. 在“用户”选项卡下，展开“扩展”，然后单击“AutoCAD® AutoLISP 配置“。
3. 更新 Debug: Attach Process 以指定 Debug: Attach 可以附着的进程名称，以过滤无关进程。
4. 更新 Debug: Launch Program 以指定要与 Debug: Launch 一起使用的 AutoCAD 可执行文件的路径。
5. 更新 Debug: Launch Parameters 以指定 AutoCAD 启动参数。

注意：配置时请确保将以下示例中的启动程序路径（Launch Program）替换为实际的 AutoCAD 程序路径。

示例（Windows）

- Launch Program：C:\Program Files\Autodesk\AutoCAD \<release\>\acad.exe
- Attach Process：acad

示例（Mac OS）

- Launch Program：/Applications/Autodesk/AutoCAD \<release\>/AutoCAD \<release\>.app/Contents/MacOS/AutoCAD
- Attach Process：AutoCAD

更多信息请参阅[联机文档](https://www.autodesk.com/autolisp-extension)。

## 注意

1. 其他 AutoLISP 扩展可能与此扩展冲突。如果无法在 LSP 文件中设置断点或无法使用启动/附着调试配置，则应禁用或卸载所有其他 AutoLISP 扩展。
2. 在 Mac® OS 上使用此扩展时，扩展设置中的“Launch Program”应为“.../AutoCAD &lt;release&gt;.app/Contents/MacOS/AutoCAD”，而不是 AutoCAD &lt;release&gt;.app 的绝对路径。
3. 对于 AutoCAD 专用工具集或基于 OEM 的产品，产品名称可能与 AutoCAD 或 acad.exe 不同。要将此扩展用于这些产品，请根据要调试的产品在扩展设置中设置对应“Launch Program”的值。
4. 如果以管理员身份启动 AutoCAD，则同样应以管理员身份启动 Microsoft Visual Studio Code。否则，Microsoft Visual Studio Code 将无法找到用于附加调试的 AutoCAD 进程。

## 法律通告

Visual Studio Code Extension for AutoCAD® AutoLISP © 版权所有 2020 Autodesk Inc. 保留所有权利。

### 隐私

要了解有关 Autodesk 联机和脱机隐私文档的详细信息，请参见 [Autodesk 隐私声明](https://www.autodesk.com/company/legal-notices-trademarks/privacy-statement)。

### Trademarks
The license does not grant permission to use the trade names, trademarks, service marks, or product names of Autodesk, except as required for reasonable and customary use in describing the origin of the work and reproducing the content of any notice file. Autodesk, the Autodesk logo, AutoCAD and AutoLISP are registered trademarks or trademarks of Autodesk, Inc., and/or its subsidiaries and/or affiliates in the USA and/or other countries. All other brand names, product names, or trademarks belong to their respective holders. Autodesk is not responsible for typographical or graphical errors that may appear in this document.

All other brand names, product names or trademarks belong to their respective holders.

### Third-Party Trademarks, Software Credits and Attributions

See [here](NOTICE.md).