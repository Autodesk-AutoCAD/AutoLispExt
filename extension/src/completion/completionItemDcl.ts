import {CompletionItem, CompletionItemKind, CompletionItemLabel, Position, Range, SnippetString, TextEdit} from "vscode";
import {IDclContainer, IDclFragment} from "../astObjects/dclInterfaces";
import {DclTile} from "../astObjects/dclTile";
import {DclAttribute} from "../astObjects/dclAttribute";
import { parentPort } from 'worker_threads';

// This file is mostly responsible for dynamic modifications to CompletionLibraryDcl default representations
// This is where all the logic for adding new lines, spaces or special characters like ':' & '='
// Consider it an "enhancement" mechanism that actively helps the user create well formed DCL files quickly

export const Kinds = {
    // Configures the Icons used on the left side of the suggested CompletionItems
    TILE: CompletionItemKind.Struct,
    ATTRIBUTE: CompletionItemKind.Variable,
    PRIMITIVE: CompletionItemKind.Constant,
    STRUCTURE: CompletionItemKind.TypeParameter,
    ENUM: CompletionItemKind.EnumMember,
    SNIPPET: CompletionItemKind.Snippet
};

const getPositionRank = (pos: Position): number => pos.line * 1000 + pos.character;

export class CompletionItemDcl extends CompletionItem {

    constructor(source: string | CompletionItemLabel | CompletionItemDcl) {
        if (source instanceof CompletionItemDcl) {
            super(source.label, source.kind);
            this.documentation = source.documentation;
            this.sortText = source.sortText;

            if (source.detail) {
                this.detail = source.detail;
            }

            if (source.insertText instanceof SnippetString) {
                this.insertText = new SnippetString(source.insertText.value);
            } else {
                this.insertText = source.insertText;
            }
        } else {
            super(source);
        }
    }

    public postProcess(pos: Position, atom: IDclFragment, directParent: IDclContainer, tile: DclTile): CompletionItemDcl {
        // Currently doesn't handle ": *nothing* { }" but all the way back to the suggestion engine.
        if (this.kind === Kinds.ENUM || this.kind === Kinds.PRIMITIVE) {
            return this.postProcessEnum(pos, atom, directParent, tile);
        }

        if (this.kind === Kinds.TILE) {
            return this.postProcessTile(pos, atom, directParent, tile);
        }

        if (this.kind === Kinds.ATTRIBUTE) {
            return this.postProcessAttribute(pos, atom, directParent, tile);
        }

        if (atom?.symbol === '/') {
            const clone = new CompletionItemDcl(this);
            clone.range = atom.range;
            return clone;
        }

        return this;
    }

    private postProcessAttribute(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        
        if ((atom?.symbol === ';' || atom?.symbol === '{') && pos.character > atom.column) {
            // contextually this happens when closing 1 attribute and can now start defining another
            const clone = new CompletionItemDcl(this);
            clone.insertText = ` ${clone.insertText} =`;
            return clone;
        }

        if (atom && container.atoms[0] === atom) {
            const clone = new CompletionItemDcl(this);
            clone.range = atom.range;
            if (container.asAttribute?.delineator?.symbol !== '=') {
                clone.insertText = `${clone.insertText} =`;
            }
            return clone;
        }

        return this;
    }

    private postProcessEnum(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        // Note: if this is an enum, then container can only be a known attribute type

        const clone = new CompletionItemDcl(this);
        const closeAttribute = (atom && container.atoms[3]?.symbol !== ';') || (!atom && container.atoms[2]?.symbol !== ';');
        
        if (closeAttribute) {
            if (clone.insertText instanceof SnippetString) {
                clone.insertText.value += ';';
            } else {
                clone.insertText += ';';
            }
        }

        if (atom) {
            clone.range = atom.range;
        }

        return clone;


        // const posRank = getPositionRank(pos);
        // let previous = -1;
        // for (let i = 0; i < container.length; i++) {
        //     if (container.atoms[i].rank < posRank) {
        //         previous = i;
        //     } else {
        //         break;
        //     }
        // }

        

        // const last = container.atoms[container.length - 1];
        // if (last === atom || last.symbol !== ';') {
        //     const clone = new CompletionItemDcl(this);
        //     if (atom) {
        //         clone.range = atom.range;
        //     }
        //     if (clone.insertText instanceof SnippetString) {
        //         clone.insertText.value += ';';
        //     } else {
        //         clone.insertText += ';';
        //     }7
        //     return clone;
        // }
        // return this;
    }

    private postProcessTile(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        if (!atom) {
            if (!container.contains(pos)) {
                // The parent container was a proximity hit, but not actually the parent to the active cursor context
                const clone = new CompletionItemDcl(this);

                // this sharedLine test really needs to work differently for some situations like attribute prefix vs tile prefix
                const hasSharedAttLine = tile.atoms.some(x => x instanceof DclAttribute && x.asContainer?.atoms.some(y => y.line === pos.line));
                const hasSharedTileLine = tile.atoms.some(x => x instanceof DclTile && x.asContainer?.atoms.some(y => y.line === pos.line));
                
                if (container.atoms.length === 1 && container.firstAtom.symbol === ':') {
                    if (hasSharedTileLine && !hasSharedAttLine) {
                        // this only has the ':' symbol on this line; IE, a tile (fragment)
                        clone.insertText = new SnippetString(`${this.label} {\n\t\t$0\n\t}\n`);
                        return clone;
                    }
                    if (hasSharedTileLine && hasSharedAttLine) {
                        // has the ':' so the tile line will always be true, but also has an attribute from some tile somewhere
                        clone.insertText = new SnippetString(`${this.label} { $0 }`);
                        return clone;
                    }
                    // if (hasSharedLine) {
                    //     // This is working fine for ': {invoke}' on a blank line, but if it is on shared (attributed) line 
                    //     // Not working that bad if it is on a shared attribute line, but clearly not ideal; could ship this way.
                    //     clone.insertText = new SnippetString(`${this.label} {\n\t\t$0\n\t}\n`);

                    //     // this was removed because it there really needs to be a formatter trigger after the fact.
                    //     ////clone.additionalTextEdits = [ new TextEdit(container.firstAtom.range, '\n\t: ')];
                    //     return clone;
                    // }

                    // This triggers when a ':' exists on the same line as an attribute
                    // however, I don't like the insertion of only the namne, it should really
                    // add some brackets at the very least.

                    if (hasSharedAttLine && container.asAttribute?.lastAtom.symbol === '}') {
                        return this;
                    }

                    clone.insertText = new SnippetString(`${this.label} { $0 }`);
                    return clone;
                }
                if (hasSharedAttLine || hasSharedTileLine) {
                    // this is kind of an oddity for tiles with no : prefix, it actually
                    // new lines exactly where you want it to. Apparently it is just the scenario
                    // after the : already exists that is jacking everything up.
                    clone.insertText = new SnippetString(`\n\t: ${this.label} {\n\t\t$0\n\t}\n`);
                } else {
                    // This is working perfectly if its on a single line by itself for both : && blank
                    clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}\n`);
                }
                return clone;
            }

            return container.asTile
                 ? this.containsPositionNoAtomTileParent(pos, container.asTile, tile)
                 : this.containsPositionNoAtomAttParent(pos, container.asAttribute, tile);
        }

        return this.containsPositionWithAtom(pos, atom, container.asAttribute, tile);
    }


    private containsPositionWithAtom(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        const posRank = getPositionRank(pos);
        const clone = new CompletionItemDcl(this);

        if (container.lastAtom.rank < posRank) {
            // proximity hit, position outside of Attribute or tile
            if (container.lastAtom.line === pos.line) {
                if (atom.symbol === ':') { // malformed tile
                    // including the range from the : atom causes the entire suggestion to be kicked out
                    //clone.range = atom.range; // Turning on is destructive

                    //This is working on a blank line with a single ':' atom
                    // However, when this tile is the only line, it is not getting the brackets with \r\n
                    clone.insertText = new SnippetString(` ${this.label} { $0 }`);
                } else if (container.firstAtom.symbol === ':' ) {
                    clone.insertText = atom.column === container.firstAtom.range.end.character
                                     ? new SnippetString(` ${this.label} { $0 }`)
                                     : new SnippetString(`${this.label} { $0 }`);
                } else {
                    clone.insertText = new SnippetString(`\n\t: ${this.label} {\n\t\t$0\n\t}\n`);
                }
            } else {
                clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}\n`);
            }
            return clone;
        }

        const index = container.atoms.indexOf(atom);
        if (container.firstAtom.symbol === ':' && index === 1) {
            clone.range = atom.range;
            return clone;
        }

        if (/^[a-z_]+$/i.test(container.firstAtom.symbol) && index === 0 && container.atoms[1]?.symbol !== '=') {
            // This assumes we are in a malformed tile context
            clone.range = atom.range;
            clone.insertText = `: ${this.label}`;
            return clone;
        }

        return this; // atom could be a structural character. Generally shouldn't hit this spot...
    }




    private containsPositionNoAtomTileParent(pos: Position, container: DclTile, tile: DclTile) : CompletionItemDcl {
        const posRank = getPositionRank(pos);
        const clone = new CompletionItemDcl(this);
        if (!container.atoms.some(x => x.line === pos.line)) {

            clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}\n`);
            return clone;
        }

        // everything after the above condition means the cursor is on the same line as something else

        const openRank = container.openBracketAtom?.rank ?? Number.MAX_VALUE;
        const closeRank = container.closeBracketAtom?.rank ?? Number.MAX_VALUE;

        if (posRank <= closeRank && posRank > openRank) {
            clone.insertText = new SnippetString(`\n\t: ${this.label} {\n\t\t$0\n\t}\n`);
            return clone;
        }

        return this;
    }



    private containsPositionNoAtomAttParent(pos: Position, container: DclAttribute, tile: DclTile) : CompletionItemDcl {
        return this;
    }


}