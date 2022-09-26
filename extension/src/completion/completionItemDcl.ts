import {CompletionItem, CompletionItemKind, CompletionItemLabel, Position, Range, SnippetString, TextEdit} from "vscode";
import {IDclContainer, IDclFragment} from "../astObjects/dclInterfaces";
import {DclTile} from "../astObjects/dclTile";
import {DclAttribute} from "../astObjects/dclAttribute";
import { CompletionLibraryDcl } from './completionLibraryDcl';

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

    //#region Helpers
    private getConsumeRange(startAtom: IDclFragment, pos: Position) {
        return new Range(new Position(startAtom.line, startAtom.column), pos);
    }

    private getFragmentsOnLine(container: IDclContainer, targetLine: number) : Array<IDclFragment> {
        const result: Array<IDclFragment> = [];
        container.atoms.forEach(item => {
            if (item.asContainer) {
                result.push(...this.getFragmentsOnLine(item.asContainer, targetLine));
            } else if (item.line === targetLine) {
                result.push(item);
            }
        });
        return result;
    }

    private needsLF() : boolean {
        return this.kind === Kinds.TILE 
            && CompletionLibraryDcl.Instance.tilesWithChildren.includes(this.label.toString());
    }
    //#endregion Helpers


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
    }

    private postProcessTile(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        const posRank = getPositionRank(pos);
        if (!atom) {
            if (container.lastAtom.rank < posRank) {
                return this.postProcessTileProximityParent(pos, container, tile);
            } else if (container.contains(pos)) {
                return this.postProcessTilePosition(pos, container, tile);
            }
        }

        if (!container.contains(pos)) {
            return this; // some kind of malformed arrangement
            debugger; // Impossible? If we have an atom, then then we should have a container containing that atom
        }

        return this.postProcessTileWithAtom(pos, atom, container.asAttribute, tile);
    }

    

    

    // #region DDFD Tile with Atom
    private postProcessTileWithAtom(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        if (atom.symbol === ':' || container.atoms.length === 1) {
            // Note that this responsible for handling any Tile or Attribute with just a single standalone word
            // Also note that truly malformed tiles like ': a b c' from the ':' perspective will leave some fragments
            // after the insertion, but that is unavoidable so we don't accidently consume code the user wants.
            return this.postProcessTileColonAtom(atom, container, tile);
        }

        if (container.firstAtom.symbol !== ':') {
            return this;
            debugger; // I don't think this can be true, but if it is, then I need to know if the package.json is working else do commented out work
            // const clone = new CompletionItemDcl(this);
            // clone.range = atom.range;
            // return clone;
        }

        //if (container.atoms.length === 2 && container.atoms.every(x => !x.isComment)) {
        if (container.atoms.length === 2 && container.atoms[1] === atom) {
            // Recycle the work from 1st atom processor by shifting the context left
            // The postProcessTileColonAtom() method has awareness of this potential scenario
            const clone = this.postProcessTileColonAtom(container.firstAtom, container, tile);
            return clone;
        }

        // If none of the above are true, then just replace the dcl fragment
        const clone = new CompletionItemDcl(this);
        clone.range = atom.range;
        return clone;
    }


    postProcessTileColonAtom(atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl { 
        if (container.atoms.some(x => x.symbol === '{' || x.symbol === '}')) {
            return this; // if this is semi-wellFormed, then keep it simple
        }

        const shared = tile.flatten().filter(x => x.line === atom.line);

        if (shared.length === 1) {       
            return this.postProcessTileColonAtomSimple(atom);
        } else if (container.length <= 2) {
            return this.postProcessTileColonAtomComplex(atom, container, shared);
        }
        return this;
    }

    postProcessTileColonAtomSimple(atom: IDclFragment) : CompletionItemDcl { 
        const clone = new CompletionItemDcl(this);
        if (atom.symbol === ':') {
            clone.additionalTextEdits = [new TextEdit(atom.range, '')];
        } else {
            clone.range = atom.range;
        }
        clone.insertText = this.needsLF()
                         ? new SnippetString(`: ${this.label} {\n\t$0\n}`)
                         : new SnippetString(`: ${this.label} { $0 }`);
        return clone;
    }

    postProcessTileColonAtomComplex(atom: IDclFragment, container: IDclContainer, shared: IDclFragment[]) : CompletionItemDcl {
        const clone = new CompletionItemDcl(this);
        const edits: Array<TextEdit> = [];

        if (atom.symbol === ':') {
            edits.push(new TextEdit(atom.range, ''));
        }

        if (shared.length !== container.length) {
            const indent = shared.some(x => x.symbol === '}' && x.flatIndex < atom.flatIndex) ? '' : '\t';
            clone.insertText = this.needsLF() 
                             ? new SnippetString(`\n${indent}: ${this.label} {\n\t${indent}$0\n${indent}}`)
                             : new SnippetString(`\n${indent}: ${this.label} { $0 }`);
        } else if (this.needsLF()) {
            clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}`);
        } else {
            clone.insertText = new SnippetString(`: ${this.label} { $0 }`);
        }

        if (container.atoms.length === 2 && container.atoms.indexOf(atom) === 0) {
            edits.push(new TextEdit(new Range(atom.line, atom.column + 1, atom.line, container.atoms[1].column), ''));
            clone.range = container.lastAtom.range;
        }

        clone.additionalTextEdits = edits;
        return clone;
    }
    // #endregion









    private postProcessTileProximityParent(pos: Position, container: IDclContainer, tile: DclTile) : CompletionItemDcl { 
        // Context = Position is NOT literally inside the container, but could may be touching it.

        const shared = tile.flatten().filter(x => x.line === pos.line);
        const lastRank = shared.length > 0 ? shared[shared.length - 1].rank : Number.MAX_VALUE;
        const posRank = getPositionRank(pos);
        const clone = new CompletionItemDcl(this);

        if (shared.length === 0) {
            clone.insertText = this.needsLF()
                             ? new SnippetString(`: ${this.label} {\n\t$0\n}`)
                             : new SnippetString(`: ${this.label} { $0 }`);
        } else if (shared.length === 1 && container.firstAtom === shared[0]) {
            const edits = [new TextEdit(container.firstAtom.range, '')];
            clone.insertText = this.needsLF()
                             ? new SnippetString(`: ${this.label} {\n\t$0\n}`)
                             : new SnippetString(`: ${this.label} { $0 }`);
        } else if (lastRank < posRank) {
            const indent = shared.some(x => x.symbol === '}' && x.rank < posRank) ? '' : '\t';
            clone.insertText = this.needsLF()
                             ? new SnippetString(`\n${indent}: ${this.label} {\n\t${indent}$0\n${indent}}`)
                             : new SnippetString(`\n${indent}: ${this.label} { $0 }`);
            if (container.lastAtom.symbol === ':') {
                clone.additionalTextEdits = [new TextEdit(this.getConsumeRange(container.lastAtom, pos), '')];
            }
        } else {
            const indent = shared.some(x => x.symbol === '}' && x.rank < posRank) ? '' : '\t';
            clone.insertText = this.needsLF()
                             ? new SnippetString(`\n${indent}: ${this.label} {\n\t${indent}$0\n${indent}}`)
                             : new SnippetString(`\n${indent}: ${this.label} { $0 }`);
            if (container.atoms.length === 2 && container.lastAtom.rank < posRank) {
                clone.range = container.lastAtom.range;
            }
        }

        return clone;
        
        
        // if (!container.atoms.some(x => x.line === pos.line)) {

        //     clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}\n`);
        //     return clone;
        // }

        // // everything after the above condition means the cursor is on the same line as something else

        // const openRank = container.openBracketAtom?.rank ?? Number.MAX_VALUE;
        // const closeRank = container.closeBracketAtom?.rank ?? Number.MAX_VALUE;

        // if (posRank <= closeRank && posRank > openRank) {
        //     clone.insertText = new SnippetString(`\n\t: ${this.label} {\n\t\t$0\n\t}\n`);
        //     return clone;
        // }

        // return this;
    }

    private postProcessTilePosition(pos: Position, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        // Context = Position is actually inside the container and not just a proximity "touch" hit

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
                clone.additionalTextEdits = [new TextEdit(this.getConsumeRange(container.firstAtom, pos), '')];
                clone.insertText = new SnippetString(`\n: ${this.label} {\n\t$0\n}`);
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

            const hits = this.getFragmentsOnLine(tile, pos.line);
            const range = this.getConsumeRange(container.firstAtom, pos);
            clone.additionalTextEdits = [new TextEdit(range, '')];
            if (hits.length === 1) {
                clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}`);
            } else {
                clone.insertText = new SnippetString(`\n\t: ${this.label} {\n\t$0\n}`);
            }
            
            return clone;
        }
        if (hasSharedAttLine || hasSharedTileLine) {
            // this is kind of an oddity for tiles with no : prefix, it actually
            // new lines exactly where you want it to. Apparently it is just the scenario
            // after the : already exists that is jacking everything up.
            clone.insertText = new SnippetString(`\n: ${this.label} {\n\t$0\n}`);
        } else {
            // This is working perfectly if its on a single line by itself for both : && blank
            clone.insertText = new SnippetString(`: ${this.label} {\n\t$0\n}\n`);
        }
        return clone;

        
    }




}