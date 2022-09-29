import { Position, Range } from 'vscode';
import { DclAtom } from './dclAtom';
import { DclAttribute } from './dclAttribute';
import { DclTile } from './dclTile';

export interface IDclFragment {
    readonly line: number;
    readonly column: number;
    readonly symbol?: string | undefined;
    readonly flatIndex?: number | undefined; // This is ideal for comparing an ASTObjects position to another ASTObject
    readonly asTile?: DclTile | undefined;
	readonly asAttribute?: DclAttribute | undefined;
    readonly asContainer?: IDclContainer | undefined;
    readonly isComment: boolean;
    readonly isBlockComment: boolean;
    readonly isString: boolean;
    readonly isNumber: boolean;
    readonly range: Range;
    readonly rank: number; // This is ideal for comparing cursor position to an ASTObject

    equal(atom: IDclFragment): boolean;
    contains(position: Position): boolean;
    getAtomFromPosition(position: Position): IDclFragment;
}

export interface IDclContainer extends IDclFragment {
    readonly atoms: Array<IDclFragment>;
    readonly length: number;
    readonly firstAtom: IDclFragment;
    readonly lastAtom: IDclFragment;
    readonly firstNonComment: IDclFragment;
    readonly isWellFormed: boolean;
    getParentFrom(position: Position|IDclFragment, tilesOnly: boolean): IDclContainer;
    getImpliedParent(position: Position): IDclContainer;
    flatten(into?: Array<DclAtom>): Array<DclAtom>;
}
