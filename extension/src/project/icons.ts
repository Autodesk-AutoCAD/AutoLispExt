import * as vscode from 'vscode'
import * as path from 'path'

export class IconUris {
    private static extRootDir: string = null;
    private static lspFileUri = undefined;
    private static missingFileUri: vscode.Uri = null;

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

    public static missingFile(): vscode.Uri {
        return IconUris.missingFileUri;
    }

}