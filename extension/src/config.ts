import { workspace } from 'vscode';


export function closeParenStyle(): 'Same line' | 'New Line' {
    return workspace.getConfiguration('autolispext').get('CloseParensStyle') || 'New Line';
}

export function maximumLineChars(): number {
    return workspace.getConfiguration('autolispext').get('maxLineChars') || 80;
}

export function longListFormatStyle(): 'Single Column' | 'Fill to Margin' {
    return workspace.getConfiguration('autolispext').get('LongListFormatStyle') || 'Fill to Margin';
}
