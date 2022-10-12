import {ReadonlyDocument} from "../project/readOnlyDocument";
import {CompletionContext, Position, Range} from "vscode";
import {DclAttribute} from "../astObjects/dclAttribute";
import {DclTile} from "../astObjects/dclTile";
import {IDclContainer, IDclFragment} from "../astObjects/dclInterfaces";
import {CompletionItemDcl} from "./completionItemDcl";
import {AutoLispExt} from "../context";
import {CompletionLibraryDcl, SnippetKeys} from "./completionLibraryDcl";
import {Kinds} from './completionItemDcl';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();


// This file is responsible for determining what could potentially be suggested give the current context

// TODO: you don't have anything looking for an atom.symbol === '{' or '}' but also not certain it matters

const getPositionRank = (pos: Position): number => pos.line * 1000 + pos.character;

// Note: the 'enhance' boolean exists for testing purposes and is used to toggle custom insertions On/Off.
export function invokeCompletionProviderDcl(doc: ReadonlyDocument, pos: Position, context: CompletionContext, enhance: boolean = true): Array<CompletionItemDcl> {
    const lib = CompletionLibraryDcl.Instance;
    const tile = doc.documentDclContainer.getParentFrom(pos, true)?.asTile;
    const directParent = doc.documentDclContainer.getImpliedParent(pos);
    const atom = doc.documentDclContainer.getAtomFromPosition(pos);

    if (atom?.symbol === '/') {
        return [lib.dclSnippets.get(SnippetKeys.COMMENTLF).postProcess(pos, atom, directParent, tile)];
    }

    if (atom?.isComment) {
        return null;
    }

    if (atom?.isString) {
        return stringProcessing(atom, directParent, pos, context);
    }

    if (!tile || tile === doc.documentDclContainer) {
        // cursor is in the document root and we can only suggest a DIALOG snippet
        return [lib.dclSnippets.get(SnippetKeys.DIALOG), lib.dclSnippets.get(SnippetKeys.COMMENTLF)];
    }

    const results = directParent instanceof DclAttribute
        ? attributeHandling(pos, atom, directParent.asAttribute, tile)
        : directParent instanceof DclTile
            ? tileHandling(pos, atom, directParent.asTile, tile)
            : null;

    if (results && enhance && results.length > 0) {
        // enhance boolean allows testing of the provider code without triggering the post processing
        return results.map(item => item.postProcess(pos, atom, directParent, tile));
    }

    return results;
}

function getTilesAndAttributes(tile: DclTile, pos: Position, skipAttributes: boolean = false) {
    const lib = CompletionLibraryDcl.Instance;
    const lowerKey = tile.tileTypeAtom?.symbol.toLowerCase() ?? '';
    const attributes = skipAttributes ? [] : getApplicableAttributes(tile, pos);
    const result = attributes.map(x => lib.dclAttributes.get(x)).filter(y => y);

    if (lowerKey === 'paragraph') {
        return result.concat([lib.dclTiles.get('concatenation'), lib.dclTiles.get('text_part')]);
    }

    if (lowerKey === 'concatenation') {
        return result.concat([lib.dclTiles.get('text_part')]);
    }

    return lowerKey === 'dialog' || lib.tilesWithChildren.includes(lowerKey)
         ? result.concat(lib.allTiles)
         : !lib.dclTiles.has(lowerKey) && !lib.dclAttributes.has(lowerKey)
         ? result.concat(lib.allTiles)
         : result;
}

function getApplicableAttributes(tile: DclTile, pos: Position) : Array<string> {
    if (!tile.tileTypeAtom) {
        return [];
    }
    const posNormal = getPositionRank(pos);
    const lowerKey = tile.tileTypeAtom.symbol.toLowerCase();
    const helpLib = AutoLispExt.WebHelpLibrary;
    const attributes = helpLib.dclTiles.get(lowerKey)?.attributes ?? [];
    const existing: Array<string> = [];

    for (let i = 0; i < tile.atoms.length; i++) {
        const item = tile.atoms[i];
        if (item instanceof DclAttribute) {
            existing.push(item.firstAtom.symbol.toLowerCase());
        }

        if (item.rank > posNormal) {
            continue;
        }

        if (item instanceof DclTile && item.rank < posNormal) {
            // If a DCL Tile appears before the cursor position, then attribute declarations should no longer be applicable
            return [];
        }
    }

    return attributes.filter(x => !existing.includes(x.toLowerCase()));
}

function stringProcessing(atom: IDclFragment, directParent: IDclContainer, pos: Position, context: CompletionContext): Array<CompletionItemDcl> {
    const index = directParent.atoms.indexOf(atom);
    if (directParent.atoms[index + 1]?.symbol !== ';' && pos.character === atom.range.end.character - 1) {
        const localPrimitive = localize("autolispext.commands.dclcompletion.primitive", "Primitive");
        const localClosesStr = localize("autolispext.commands.dclcompletion.primitive.ClosesString", "Closes the string");
        const result = new CompletionItemDcl(`${atom.symbol};`);
        result.insertText = `${atom.symbol};`;
        result.detail = localPrimitive;
        result.documentation = localClosesStr;
        result.range = atom.range;
        result.kind = Kinds.PRIMITIVE;
        return [result];
    }

    // TODO: It may be a nice feature to auto escape double quotes in the middle or close the string if at the end. 
    // TODO: you could detect the ACTION strings and provide some degree of lisp auto completion
    return null;
}












function tileHandling(pos: Position, atom: IDclFragment, directParent: IDclContainer, tile: DclTile): Array<CompletionItemDcl> {
    // Note: malformed tiles often masquerade as Attributes instead of Tiles

    const lib = CompletionLibraryDcl.Instance;
    const posRank = getPositionRank(pos);

    if (atom) {
        if (directParent.atoms[0] === atom || directParent.atoms[1] === atom) {
            return getTilesAndAttributes(tile, pos, true);
        }

        if (atom.symbol === '{' && atom.rank < posRank) {
            return getTilesAndAttributes(directParent.asTile, pos);
        }
    
        return null;
    }

    const wellFormed = directParent.firstAtom.symbol === ':' && directParent.asTile?.openBracketAtom?.symbol === '{';
    if (directParent.isWellFormed && posRank < directParent.asTile.openBracketAtom.rank) {
        return null; // tile is already well-formed and atom cannot be null
    }
    if (!directParent.isWellFormed && directParent.contains(pos)) {
        return getTilesAndAttributes(directParent.asTile, pos);
    }
    return getTilesAndAttributes(tile, pos);
}

// TODO, the dialog tile is now too far up the chain and not swhowing any attribute suggestions... ever....

function malformedTileHandlerNoAtom(pos: Position, directParent: DclAttribute, tile: DclTile): Array<CompletionItemDcl> {
    // Triggered by Attribute with ':' as the first character

    const lib = CompletionLibraryDcl.Instance;

    if (directParent.length === 1) {
        return getTilesAndAttributes(tile, pos, directParent.firstAtom.symbol === ':');
    }

    if (directParent.length === 2) {
        const key = directParent.atoms[1].symbol.toLowerCase();
        const attSource = AutoLispExt.WebHelpLibrary.dclTiles.get(key)?.attributes;
        if (attSource?.some(x => x.toLowerCase().includes('children'))) {
            return [lib.dclSnippets.get(SnippetKeys.BRACKETLF), lib.dclSnippets.get(SnippetKeys.BRACKET)];
        }
        return [lib.dclSnippets.get(SnippetKeys.BRACKET)];
    }

    return null;
}

function malformedTileHandlerHasAtom(atom: IDclFragment, pos: Position, directParent: DclAttribute, tile: DclTile): Array<CompletionItemDcl> {
    // Triggered by Attribute with ':' as the first character

    const lib = CompletionLibraryDcl.Instance;

    if (directParent.atoms.indexOf(atom) < 2) {
        return tileHandling(pos, atom, directParent, tile);
    }

    return [lib.dclSnippets.get(SnippetKeys.BRACKETLF)];
}










function attributeHandling(pos: Position, atom: IDclFragment, directParent: DclAttribute, tile: DclTile): Array<CompletionItemDcl> {
    if (directParent.atoms[0].symbol === ':') {
        return !atom
             ? malformedTileHandlerNoAtom(pos, directParent, tile)
             : malformedTileHandlerHasAtom(atom, pos, directParent, tile);
    }

    if (!atom) {
        if (directParent.isWellFormed && !directParent.contains(pos)) {
            // The direct parent is not in scope for suggestions
            return getTilesAndAttributes(tile, pos);
        }

        return attributeHandlerNoAtom(pos, directParent);
    }

    return attributeHandlerWithAtom(atom, directParent, pos, tile);
}


function attributeHandlerNoAtom(pos: Position, directParent: DclAttribute): Array<CompletionItemDcl> {
    // Note: malformed tiles often masquerade as Attributes instead of Tiles

    const lib = CompletionLibraryDcl.Instance;
    const posNormal = getPositionRank(pos);
    let previous = -1;
    for (let i = 0; i < directParent.atoms.length; i++) {
        const atom = directParent.atoms[i];
        if (atom.rank > posNormal) {
            previous = i;
            break;
        }
    }

    if (previous === 1 || directParent.length === 1) {
        if (directParent.atoms[previous]?.symbol === '=') {
            return null;
        }
        return [lib.dclSnippets.get(SnippetKeys.EQUAL)];
    }

    if (directParent.length === 2 || previous === 2) {
        return !directParent.isWellFormed ? lib.dclEnums.get(directParent.atoms[0].symbol.toLowerCase()) : null;
    }

    return null;
}



function attributeHandlerWithAtom(atom: IDclFragment, directParent: DclAttribute, pos: Position, tile: DclTile) {
    const lib = CompletionLibraryDcl.Instance;
    if (atom.isNumber) {
        return null;
    }

    if (atom.symbol === ';' && pos.character === atom.column) {
        return lib.dclEnums.get(directParent.atoms[0].symbol.toLowerCase());
    }
    
    if (atom.symbol === ';' && pos.character > atom.column) {
        return getTilesAndAttributes(tile, pos);
    }

    if (atom.symbol === '=') {
        return null; // force them to put a space between the setter symbol
    }

    if (directParent.asAttribute?.delineator?.symbol === '=' && directParent.asAttribute.delineator.range.end.character < pos.character) {
        return lib.dclEnums.get(directParent.atoms[0].symbol.toLowerCase());
    }

    if (directParent.atoms.includes(atom)) {
        if (directParent.isWellFormed && atom.rank === directParent.rank) {
            return getApplicableAttributes(tile, pos).map(x => lib.dclAttributes.get(x)).filter(y => y);
        }

        return getTilesAndAttributes(tile, pos);
    }

    return null;

}

