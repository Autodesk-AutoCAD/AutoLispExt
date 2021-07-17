import { ILispFragment } from '../format/sexpression';


export namespace LispContainerServices {


    export function getLispContainerTypeName(container: ILispFragment): string {
        // initialized to 0 if it is a Document Container or 1 if it is a child LispContainer
        // this is because sub-containers should have least 1 ignored starting character
        for (let i = container.body?.userSymbols ? 0 : 1; i < container.body?.atoms.length ?? -1; i++) {
            const atom = container.body.atoms[i];
            if (atom.isComment() || atom.isLeftParen() || atom.symbol === '\'') {
                continue;
            } 
			return getAtomicTypeNameValue(atom);
        }
        return '*unknown*';
    }
    
    function getAtomicTypeNameValue(atom: ILispFragment): string {
        // Note: there is no handling for leading single quotes because LispContainers 
        //       are designed to individually atomize all single quote characters
		if (atom.symbol.length === 0) { // Should cover rogue LispContainer inputs
			return '*invalid*';
		} else if (atom.isPrimitive()) {
            return '*primitive*';
        } else {
			return atom.symbol.toLowerCase();
		}
    }


}