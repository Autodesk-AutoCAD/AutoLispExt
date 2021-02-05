import * as vscode from 'vscode'
import * as path from 'path'

export class IconUris {
    private static extRootDir: string = null;
    private static lspFileUri = undefined;
    private static missingFileUri = undefined;
 
    private static matchCaseOnUri = undefined;
    private static matchCaseOffUri = undefined;
 
    private static matchWordOnUri = undefined;
    private static matchWordOffUri = undefined;

    private static useRegularExprOnUri = undefined;
    private static useRegularExprOffUri = undefined;

    private static close = undefined;

    public static initialize() {
        if (!IconUris.extRootDir) {
            IconUris.extRootDir = vscode.extensions.getExtension("Autodesk.autolispext").extensionPath;
        }

        return IconUris.extRootDir;
    }

    public static lspFile(): { light: string | vscode.Uri; dark: string | vscode.Uri } {
        if(IconUris.lspFileUri == undefined) {
            IconUris.lspFileUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'LISP_file.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'LISP_file.svg'))
            };
        }

        return IconUris.lspFileUri;
    }

    public static matchCase(on:boolean): vscode.Uri {
        if(IconUris.matchCaseOnUri == undefined) {
            IconUris.matchCaseOnUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Match_Case_On.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Match_Case_On.svg'))
            };
        }

        if(IconUris.matchCaseOffUri == undefined) {
            IconUris.matchCaseOffUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Match_Case_Off.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Match_Case_Off.svg'))
            };
        }

        if(on)
            return IconUris.matchCaseOnUri;

        return IconUris.matchCaseOffUri;
    }

    public static matchWord(on:boolean): vscode.Uri {
        if(IconUris.matchWordOnUri == undefined) {
            IconUris.matchWordOnUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Match_Whole_Word_On.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Match_Whole_Word_On.svg'))
            };
        }

        if(IconUris.matchWordOffUri == undefined) {
            IconUris.matchWordOffUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Match_Whole_Word_Off.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Match_Whole_Word_Off.svg'))
            };
        }

        if(on)
            return IconUris.matchWordOnUri;
        
        return IconUris.matchWordOffUri;
    }

    public static useRegularExpr(on:boolean): vscode.Uri {
        if(IconUris.useRegularExprOnUri == undefined) {
            IconUris.useRegularExprOnUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Regular_Expression_On.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Regular_Expression_On.svg'))
            };
        }

        if(IconUris.useRegularExprOffUri == undefined) {
            IconUris.useRegularExprOffUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Regular_Expression_Off.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Regular_Expression_Off.svg'))
            };
        }

        if(on)
            return IconUris.useRegularExprOnUri;
        
        return IconUris.useRegularExprOffUri;
    }

    public static missingFile(): vscode.Uri {
        if(IconUris.missingFileUri == undefined) {
            IconUris.missingFileUri = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'Error_LISP_File.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'Error_LISP_File.svg'))
            };
        }

        return IconUris.missingFileUri;
    }

    public static closeUri(): vscode.Uri {
        if(!IconUris.close) {
            IconUris.close = {
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'close.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'close.svg'))
            };
        }

        return IconUris.close;
    }

}