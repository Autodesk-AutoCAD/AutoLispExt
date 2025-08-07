import { Position, Range } from 'vscode';
import { DclAtom } from './dclAtom';
import { IDclContainer, IDclFragment } from './dclInterfaces';

export class DclAttribute implements IDclContainer {
    
    get line(): number {
        return this.length === 0 ? -1 : this.firstAtom.line;
    }

    get column(): number {
        return this.length === 0 ? -1 : this.firstAtom.column;
    }

    get asAttribute(): DclAttribute {
        return this;
    }

    get asContainer(): IDclContainer {
        return this;
    }

    get isComment(): boolean { 
        return false; 
    }

    get isBlockComment(): boolean {
        return false; 
    }

    get isString(): boolean {
        return false; 
    }

    get isNumber(): boolean {
        return false; 
    }

    get range(): Range {
        const lastAtom = this.atoms[this.length - 1];
        return new Range(this.firstAtom.range.start, lastAtom.range.end);
    }

    get rank(): number {
        return this.line * 1000 + this.column;
    }
        
    equal(dclObject: IDclFragment): boolean {
        return JSON.stringify(this) === JSON.stringify(dclObject);
    }

    contains(position: Position): boolean {
        return this.range.contains(position);
    }

    getAtomFromPosition(position: Position): IDclFragment {
        if (this.contains(position)) {
            for (let i = 0; i < this.length; i++) {
                if (!this.atoms[i].contains(position)) {
                    continue;
                }
                return this.atoms[i];
            }
        }
        return null;
    }

    public atoms: Array<IDclFragment>;

    get length(): number {
        return this.atoms.length;
    }

    get firstAtom(): IDclFragment {
        return this.atoms[0];
    }

    get lastAtom(): IDclFragment {
        return this.atoms[this.length - 1];
    }

    get firstNonComment(): IDclFragment {
        return this.length === 0 ? null : this.firstAtom;
    }

    getParentFrom(from: Position|IDclFragment, tilesOnly: boolean = false): IDclContainer {
        const pos = from instanceof Position ? from : from.range.start;
        if (this.contains(pos)) {
            return tilesOnly ? null : this;
        }
        return null;
    }

    getImpliedParent(position: Position): IDclContainer {
        return this.contains(position) ? this : null;
    }

    flatten(into?: Array<DclAtom>): Array<DclAtom> {
        if (!into) {
            into = [];
        }
        this.atoms.forEach(item => {
            into.push(item as DclAtom);
        });
        return into;
    }


    // Everything above this point is sequenced by IDclFragment & then IDclContainer contract
    // Everything below this point is unique to DclAttribute and not an interface requirement


    constructor(atoms: Array<DclAtom>) {
        this.atoms = [...atoms];
    }

    get key(): IDclFragment { 
        return this.length === 0 ? null : this.firstAtom;
    }
    get delineator(): IDclFragment { 
        return this.length < 3 ? null : this.atoms[1];
    }
    get value(): IDclFragment { 
        return this.length < 3 ? null : this.atoms[2];
    }


    get isWellFormed(): boolean {
        const invalid = this.length !== 4              // exceeds possible key-value-pair structure
                     || this.lastAtom.symbol !== ';'   // invalid attribute termination
                     || this.firstAtom.isString        // strings are invalid keys
                     || this.atoms[1].symbol !== '=';  // Unexpected delineator
        return !invalid;
    }
    
}
