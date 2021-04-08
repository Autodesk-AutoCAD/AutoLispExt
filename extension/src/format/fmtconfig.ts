import { workspace } from 'vscode';


export function closeParenStyle(): 'Same line' | 'New line with outer identation' {
    console.log("[ERROR]the real closeParenStyle() is called");
    return workspace.getConfiguration('autolispext').get('format.CloseParenthesisStyle') || 'New line with outer identation';
}

export function maximumLineChars(): number {
    console.log("[ERROR]the real maximumLineChars() is called");
    return workspace.getConfiguration('autolispext').get('format.MaxLineChars') || 85;
}

export function longListFormatStyle(): 'Single Column' | 'Fill to Margin' {
    console.log("[ERROR]the real longListFormatStyle() is called");
    return workspace.getConfiguration('autolispext').get('format.LongListFormatStyle') || 'Fill to Margin';
}

export function indentSpaces(): number {
    console.log("[ERROR]the real indentSpaces() is called");
    return workspace.getConfiguration('autolispext').get('format.NarrowStyleIndent') || 2;
}