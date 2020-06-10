import { workspace } from 'vscode';


export function closeParenStyle(): 'Same line' | 'New line with outer identation' {
    return workspace.getConfiguration('autolispext').get('format.CloseParenthesisStyle') || 'New line with outer identation';
}

export function maximumLineChars(): number {
    return workspace.getConfiguration('autolispext').get('format.MaxLineChars') || 85;
}

export function longListFormatStyle(): 'Single Column' | 'Fill to Margin' {
    return workspace.getConfiguration('autolispext').get('format.LongListFormatStyle') || 'Fill to Margin';
}

export function indentSpaces(): number {
    return workspace.getConfiguration('autolispext').get('format.NarrowStyleIndent') || 2;
}