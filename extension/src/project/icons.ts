import * as vscode from 'vscode'
import * as path from 'path'

export class IconUris {
    private static extRootDir: string = null;
    private static lspFileUri = undefined;
    private static missingFileUri: vscode.Uri = null;
 
    private static matchCaseOnUri = undefined;
    private static matchCaseOffUri = undefined;
 
    private static matchWordOnUri = undefined;
    private static matchWordOffUri = undefined;

    private static useRegularExprOnUri = undefined;
    private static useRegularExprOffUri = undefined;

    public static initialize() {
        if (!IconUris.extRootDir) {
            IconUris.extRootDir = vscode.extensions.getExtension("Autodesk.autolispext").extensionPath;
            //TBD: update with real icons from PD
            IconUris.missingFileUri = vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png'));
        }

        return IconUris.extRootDir;
    }

    public static lspFile(): { light: string | vscode.Uri; dark: string | vscode.Uri } {
        if(IconUris.lspFileUri == undefined) {
            IconUris.lspFileUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'project_save.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'project_save.svg'))
            };
        }

        return IconUris.lspFileUri;
    }

    public static matchCase(on:boolean): vscode.Uri {
        if(IconUris.matchCaseOnUri == undefined) {
            IconUris.matchCaseOnUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'project_save.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'project_save.svg'))
            };
        }

        if(IconUris.matchCaseOffUri == undefined) {
            IconUris.matchCaseOffUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png'))
            };
        }

        if(on)
            return IconUris.matchCaseOnUri;

        return IconUris.matchCaseOffUri;
    }

    public static matchWord(on:boolean): vscode.Uri {
        if(IconUris.matchWordOnUri == undefined) {
            IconUris.matchWordOnUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'project_save.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'project_save.svg'))
            };
        }

        if(IconUris.matchWordOffUri == undefined) {
            IconUris.matchWordOffUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png'))
            };
        }

        if(on)
            return IconUris.matchWordOnUri;
        
        return IconUris.matchWordOffUri;
    }

    public static useRegularExpr(on:boolean): vscode.Uri {
        if(IconUris.useRegularExprOnUri == undefined) {
            IconUris.useRegularExprOnUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'light', 'project_save.svg')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'dark', 'project_save.svg'))
            };
        }

        if(IconUris.useRegularExprOffUri == undefined) {
            IconUris.useRegularExprOffUri = {
                //TBD: update with real icons from PD
                "light" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png')),
                "dark" : vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png'))
            };
        }

        if(on)
            return IconUris.useRegularExprOnUri;
        
        return IconUris.useRegularExprOffUri;
    }

    public static missingFile(): vscode.Uri {
        return IconUris.missingFileUri;
    }

}