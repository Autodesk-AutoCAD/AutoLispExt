import * as vscode from 'vscode'
import * as path from 'path'

export class IconUris {
    private static extRootDir: string = null;
    private static lspFileUri: vscode.Uri = null;
    private static missingFileUri: vscode.Uri = null;

    public static initialize() {
        if (!IconUris.extRootDir) {
            IconUris.extRootDir = vscode.extensions.getExtension("Autodesk.autolispext").extensionPath;
            //TBD: update with real icons from PD
            IconUris.lspFileUri = vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png'));
            IconUris.missingFileUri = vscode.Uri.file(path.join(IconUris.extRootDir, 'images', 'adsk_lisp.png'));
        }

        return IconUris.extRootDir;
    }

    public static lspFile(): vscode.Uri {
        return IconUris.lspFileUri;
    }

    public static missingFile(): vscode.Uri {
        return IconUris.missingFileUri;
    }

}