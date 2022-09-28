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





    // #region Helpers
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
            && (CompletionLibraryDcl.Instance.tilesWithChildren.includes(this.label.toString()) 
            || this.label === 'paragraph'
            || this.label === 'concatenation');
    }
    // #endregion Helpers




    // #region primary handlers
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

        return this.postProcessTileWithAtom(pos, atom, container, tile);
    }
    // #endregion primary handlers
    

    

    // #region Tile with Atom
    private postProcessTileWithAtom(pos: Position, atom: IDclFragment, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        if (atom.symbol === ':' || container.atoms.length === 1) {
            // Note that this responsible for handling any Tile or Attribute with just a single standalone word
            // Also note that truly malformed tiles like ': a b c' from the ':' perspective will leave some fragments
            // after the insertion, but that is unavoidable so we don't accidently consume code the user wants.
            return this.postProcessTileColonAtom(atom, container, tile);
        }

        if (container.firstAtom.symbol !== ':') {
            return atom.symbol === ';' ? this.postProcessTileProximityParent(pos, container, tile) : this;
        }

        if (container.atoms.length === 2 && container.atoms[1] === atom) {
            // Recycle the work from 1st atom processor by shifting the context left because it can also handle a 2-part malformed tile
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
            //const indent = shared.some(x => x.symbol === '}' && x.flatIndex < atom.flatIndex) ? '' : '\t';
            const indent = shared.some(x => x.symbol === '{' && shared.every(y => y.symbol !== '}')) ? '\t' : '';
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
        // Context = Position is NOT literally inside the container, but could may be touching a partial or well-formed container.
        //           Entry into this method qualified by (container.lastAtom.rank < posRank)

        const shared = tile.flatten().filter(x => x.line === pos.line);
        const clone = new CompletionItemDcl(this);

        if (shared.length === 0) {
            clone.insertText = this.needsLF()
                             ? new SnippetString(`: ${this.label} {\n\t$0\n}`)
                             : new SnippetString(`: ${this.label} { $0 }`);
            return clone;
        }

        if (container.length <= 2) {
            if (container.firstAtom.symbol === ':') {
                clone.additionalTextEdits = [new TextEdit(this.getConsumeRange(container.firstAtom, pos), '')];
            } else {
                clone.range = this.getConsumeRange(container.firstAtom, pos);
            }    
        }

        const indent = shared.some(x => x.symbol === '{' && shared.every(y => y.symbol !== '}')) ? '\t' : '';
        const leadLF = shared.length > container.length || container.isWellFormed || shared.some(x => x.symbol === '}') ? '\n' : '';

        clone.insertText = this.needsLF()
                         ? new SnippetString(`${leadLF}${indent}: ${this.label} {\n\t${indent}$0\n${indent}}`)
                         : new SnippetString(`${leadLF}${indent}: ${this.label} { $0 }`);
                 
        return clone;
    }

    private postProcessTilePosition(pos: Position, container: IDclContainer, tile: DclTile) : CompletionItemDcl {
        // Context = Position is actually inside the container and not just a proximity "touch" hit
        //           Could be the inner most portion of : tile { $0 } on its own or shared line

        const clone = new CompletionItemDcl(this);
        const posRank = getPositionRank(pos);
        const shared = tile.flatten().filter(x => x.line === pos.line);
        if (shared.length === 0 || shared.some(x => x.rank > posRank)) {
            clone.insertText = this.needsLF()
                             ? new SnippetString(`: ${this.label} {\n\t$0\n}`)
                             : new SnippetString(`: ${this.label} { $0 }`);
        } else if (container === tile) {
            clone.insertText = this.needsLF()
                             ? new SnippetString(`\n\t: ${this.label} {\n\t\t$0\n\t}`)
                             : new SnippetString(`\n\t: ${this.label} { $0 }`);
        }

        return clone;
    }




}