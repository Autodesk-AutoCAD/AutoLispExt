# Visual Studio Code Extension for AutoCAD® AutoLISP

[English](README.md)

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

可以通过 VSCode 中的扩展面板搜索并安装此扩展。搜索AutoCAD AutoLISP Extension。
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
2. 在“用户”选项卡下，展开“扩展”，然后单击“AutoCAD®AutoLISP 配置“。
3. 更新 Debug: Attach Process 以指定要针对“调试附着”过滤的进程名称。
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
2. 在 Mac^®^ OS 上使用此扩展时，扩展设置中的“Launch Program”应为“../AutoCAD\<release\>.app/Contents/MacOS/AutoCAD”，而不是 AutoCAD\<release\>.app 的绝对路径。
3. 对于 AutoCAD 专用工具集或基于 OEM 的产品，产品名称可能与 AutoCAD 或 acad.exe 不同。要将此扩展用于这些产品，请根据要调试的产品在扩展设置中设置对应“Launch Program”的值。
4. 如果以管理员身份启动 AutoCAD，则同样应以管理员身份启动 Microsoft Visual Studio Code。否则，Microsoft Visual Studio Code 将无法找到用于附加调试的 AutoCAD 进程。

## 声明

Visual Studio Code Extension for AutoCAD® AutoLISP © 2020 Autodesk, Inc. All rights reserved.

### 隐私

要了解有关 Autodesk 联机和脱机隐私文档的详细信息，请参见 [Autodesk 隐私声明](https://www.autodesk.com/company/legal-notices-trademarks/privacy-statement)。

### 商标

本许可证未授予使用 Autodesk 的商品名、商标、服务标志或产品名称的权限，除非在描述作品来源和复制任何通知文件内容时出于合理和习惯的需要。Autodesk、Autodesk 徽标、AutoCAD 和AutoLISP 是 Autodesk，Inc. 和/或其子公司和/或附属公司在美国和/或其他国家/地区的注册商标。所有其他品牌名称、产品名称或商标均属于其各自的持有人。Autodesk 不对本文档中可能出现的印刷或图形错误负责。

所有其他品牌名称、产品名称或商标均属于其各自的持有人。

### 第三方商标等

[NOTICE.md](https://github.com/Autodesk-AutoCAD/AutoLispExt/blob/main/NOTICE.md)。