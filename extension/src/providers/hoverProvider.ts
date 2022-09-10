import * as vscode from "vscode";
import { IDclContainer, IDclFragment } from '../astObjects/dclInterfaces';
import { AutoLispExt } from '../context';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import {DocumentServices} from "../services/documentServices";
import {ISymbolReference, SymbolManager} from "../symbols";
import {LispAtom} from "../astObjects/lispAtom";
import * as nls from "vscode-nls";
import {AnnoIcon, Annotation} from "../help/documentationPresenter";
import {parseDocumentation} from "../parsing/comments";

const localize = nls.loadMessageBundle();
const ambiguityError = localize("autolispext.hoverProvider.ambiguous", "Multiple definitions containing the @Global flag");

export function AutoLispExtProvideHover(doc: ReadonlyDocument, position: vscode.Position) : vscode.ProviderResult<vscode.Hover>
{
    if (doc.documentDclContainer) {
        return handlersDCL.getHoverResults(doc, position);
    }
    
    if (doc.documentContainer) {
        return handlersLSP.getHoverResults(doc, position);
    }
    
    return null;
}


namespace handlersDCL {
    export function getHoverResults(roDoc: ReadonlyDocument, position: vscode.Position): vscode.Hover {
        const parent = roDoc.documentDclContainer.getParentFrom(position);
        if (!parent) {
            return null;
        }
        const atom = parent.getAtomFromPosition(position);
        return parent.asTile ? processTileAtom(parent, atom) : processAttributeAtom(parent, atom);
    }


    function processAttributeAtom(parent: IDclContainer, atom: IDclFragment): vscode.Hover {
        const def = AutoLispExt.WebHelpLibrary.dclAttributes.get(atom.symbol.toLowerCase());
        if (!def || parent.firstAtom.flatIndex !== atom.flatIndex) {
            return null;
        }
        return new vscode.Hover(Annotation.asMarkdown(def));
    }

    function processTileAtom(parent: IDclContainer, atom: IDclFragment): vscode.Hover {
        const def = AutoLispExt.WebHelpLibrary.dclTiles.get(atom.symbol.toLowerCase());
        if (def) {
            return new vscode.Hover(Annotation.asMarkdown(def));
        }
        return null;
    }
}


namespace handlersLSP {
    export function getHoverResults(roDoc: ReadonlyDocument, position: vscode.Position): vscode.Hover {
        const atom = roDoc.documentContainer.getAtomFromPos(position);
        if (!atom || atom.isPrimitive()) {
            return null;
        }

        const key = atom.symbol.toLowerCase();
        const markdown = getNativeResource(key) ?? getUserResources(key, roDoc, position);
        if (markdown === null) {
            return null;
        }

        return new vscode.Hover(markdown, atom.getRange());
    }


    function getNativeResource(lowerKey: string) : vscode.MarkdownString|Array<vscode.MarkdownString> {
        const webHelp = AutoLispExt.WebHelpLibrary;

        if (webHelp.ambiguousFunctions.has(lowerKey)) {
            return webHelp.ambiguousFunctions.get(lowerKey).map(x => Annotation.asMarkdown(x));
        }

        if (webHelp.functions.has(lowerKey)) {
            return Annotation.asMarkdown(webHelp.functions.get(lowerKey));
        }

        if (webHelp.enumerators.has(lowerKey)) {
            return Annotation.asMarkdown(webHelp.enumerators.get(lowerKey));
        }

        return null;
    }



    function getUserResources(lowerKey: string, doc: ReadonlyDocument, pos: vscode.Position) : vscode.MarkdownString {
        return tryLocalUserResource(lowerKey, doc, pos) ?? tryGlobalUserResources(lowerKey, doc);
    }


    function tryLocalUserResource(lowerKey: string, roDoc: ReadonlyDocument, pos: vscode.Position) : vscode.MarkdownString {
        if (!roDoc.documentContainer.userSymbols.has(lowerKey)) {
            return null;
        }

        const map = SymbolManager.getSymbolMap(roDoc);
        const pointers = map.collectAllSymbols().get(lowerKey);
        const defs = pointers.filter(x => x.isDefinition);
        if (defs.length === 0) {
            return null;
        }

        if (defs.length === 1) {
            return getUserResourceMarkdown(defs[0], roDoc.documentContainer.flatten(), roDoc);
        }

        // fallback, provide last defined; this assumes it will override prior definitions
        return getUserResourceMarkdown(defs[defs.length - 1], roDoc.documentContainer.flatten(), roDoc);
    }


    function tryGlobalUserResources(lowerKey: string, skipSource: ReadonlyDocument) : vscode.MarkdownString {
        let possible = DocumentServices.findAllDocumentsWithCustomSymbolKey(lowerKey);
        for (let i = 0; i < possible.length; i++) {
            const doc = possible[i];
            if (doc === skipSource) {
                continue;
            }

            const result = findGlobalUserResource(lowerKey, doc);
            if (result) {
                // If there are 5 documents and 2, 4 & 5 all have @Global labels, then only 2 will be returned
                // In most languages this wouldn't make sense, but lisp cannot have overloads and we have no
                // way of knowing which of the 3 will be loaded at the time.
                return result;
            }
        }
        return null;
    }


    function findGlobalUserResource(lowerKey: string, roDoc: ReadonlyDocument) : vscode.MarkdownString {
        const map = SymbolManager.getSymbolMap(roDoc);
        const pointers = map.collectAllSymbols().get(lowerKey);
        const flatView = roDoc.documentContainer.flatten();
        const defs = pointers.filter(x => x.isDefinition && flatView[x.flatIndex].hasGlobalFlag);
        if (defs.length === 0) {
            return null;
        }

        if (defs.length === 1) {
            return getUserResourceMarkdown(defs[0], flatView, roDoc);
        }

        return new vscode.MarkdownString(`${AnnoIcon.ERROR} ${ambiguityError}`);
    }


    const breakables = ['nil', 't', '/', ')'];
    function getUserResourceMarkdown(source: ISymbolReference, flatView: LispAtom[], roDoc: ReadonlyDocument) : vscode.MarkdownString {
        const atom = flatView[source.flatIndex];
        const userData = atom.commentLinks ? parseDocumentation(flatView[atom.commentLinks[atom.commentLinks.length - 1]]) : null;
        const args: Array<LispAtom> = [];
        for (let i = source.flatIndex + 1; i < flatView.length; i++) {
            const current = flatView[i];
            if (breakables.includes(current.symbol.toLowerCase())) {
                break;
            } else if (current.symbol === '(') {
                continue;
            }

            args.push(current);
        }
        return Annotation.asMarkdown(atom, null, args, userData, roDoc.fileName);
    }

}



