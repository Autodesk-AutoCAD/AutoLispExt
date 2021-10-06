import { Position, Range } from 'vscode';
import { LispContainer } from './lispContainer';

// This interface is intended to let us work in more generic ways without direct context of LispAtom|LispContainer
export interface ILispFragment {
    symbol: string;
    line: number;
    column: number;
    flatIndex: number;
    commentLinks?: Array<number>;
    hasGlobalFlag?: boolean;


    readonly body?: LispContainer | undefined;

    isLispFragment(): boolean;

    equal(atom: ILispFragment): boolean;

    symbLine(last?: boolean): number;

    length(): number;

    isLineComment(): boolean;

    isComment(): boolean;

    isRightParen(): boolean;

    isLeftParen(): boolean;

    isPrimitive(): boolean;

    contains(pos: Position): boolean;

    getRange(): Range;
}