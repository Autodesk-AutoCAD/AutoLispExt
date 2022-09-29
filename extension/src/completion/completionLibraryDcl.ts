import {CompletionItemKind, SnippetString} from "vscode";
import {AutoLispExt} from "../context";
import {Annotation} from '../help/documentationPresenter';
import {CompletionItemDcl, Kinds} from "./completionItemDcl";
import * as nls from 'vscode-nls';

// This file is responsible for pre-generating the default versions of all possible DCL completion items.
// Doing this eliminates "some" of the extraneous processing; like documentation markdown generation.

// NOTE: on webHelpAbstraction.json
//		 COMMON attributes like width & alignment are not listed for all tiles.


let _instance: CompletionLibraryDcl = null;
const localize = nls.loadMessageBundle();

export enum SnippetKeys {
	DIALOG = 'dialog',
	EQUAL = 'equals',
	BRACKET = 'brackets',
	BRACKETLF = 'bracketBlock',
	COMMENTLF = 'commentBlock',
	STRING = 'string',
	TRUE = 'true',
	FALSE = 'false'
}

export class CompletionLibraryDcl {
    public dclTiles: Map<string, CompletionItemDcl> = new Map();
	public dclAttributes: Map<string, CompletionItemDcl> = new Map();
	public dclSnippets: Map<SnippetKeys, CompletionItemDcl> = new Map();
	public dclEnums: Map<string, Array<CompletionItemDcl>> = new Map();
	public isLoaded:boolean = false;
	public tilesWithChildren: Array<string> = [];

	get allTiles(): Array<CompletionItemDcl> {
		return Array.from(this.dclTiles.values());
	}

	public get allAttributes(): Array<CompletionItemDcl> {
		return Array.from(this.dclAttributes.values());
	}


    private constructor() {}

    static get Instance() {
        if (_instance) {
			return _instance.getOrInit();
		}
		_instance = new CompletionLibraryDcl();
		return _instance.getOrInit();
    }


	private getOrInit() : CompletionLibraryDcl {
		if (!this.isLoaded && AutoLispExt.Resources.isLoaded) {
			this.generateDynamics();
			this.generateTiles();
			this.generateAttributes();
			this.generateEnums();
			this.isLoaded = true;
		}
		return this;
	}

	private makeSnippet(label: string, desc: string, detail: string, insText: string, kind: CompletionItemKind) : CompletionItemDcl {
		const snip = new CompletionItemDcl(label);
		snip.insertText = insText.includes('$') ? new SnippetString(insText) : insText;
		snip.detail = detail;
		snip.documentation = desc;
		snip.sortText = label === 'dialog' ? '!!!dialog' : label;
		snip.kind = kind;
		return snip;
	}


	private generateDynamics() : void {
		const localDialogStruct = localize("autolispext.commands.dclcompletion.primitive.dialog", "Generates a dialog structure");
		this.dclSnippets.set(SnippetKeys.DIALOG,
			this.makeSnippet('dialog', localDialogStruct, 'Tile', `\${1:NAME} : dialog {\n\t$0\n}`, Kinds.TILE)
		);

		const localPrimitive = localize("autolispext.commands.dclcompletion.primitive", "Primitive");
		const localPrimStruct = localize("autolispext.commands.dclcompletion.primitive.structure", "structural primitive");

		this.dclSnippets.set(SnippetKeys.EQUAL,
			this.makeSnippet('=', localPrimStruct, localPrimitive, '=', Kinds.STRUCTURE)
		);
		this.dclSnippets.set(SnippetKeys.BRACKET,
			this.makeSnippet('{}', localPrimStruct, localPrimitive, '{ $0 }', Kinds.STRUCTURE)
		);
		this.dclSnippets.set(SnippetKeys.BRACKETLF,
			this.makeSnippet('{lf}', localPrimStruct, localPrimitive, '{ \n\t$0 \n}', Kinds.STRUCTURE)
		);
		this.dclSnippets.set(SnippetKeys.COMMENTLF,
			this.makeSnippet('/*lf*/', localPrimStruct, localPrimitive, '/*\n\t$0\n*/', Kinds.STRUCTURE)
		);


		const localPrimString = localize("autolispext.commands.dclcompletion.primitive.string", "string structure");
		this.dclSnippets.set(SnippetKeys.STRING,
			this.makeSnippet('"?"', localPrimString, localPrimitive, '"$0"', Kinds.PRIMITIVE)
		);		

		const localPrimBool = localize("autolispext.commands.dclcompletion.primitive.boolean", "boolean structure");
		this.dclSnippets.set(SnippetKeys.TRUE,
			this.makeSnippet('True', localPrimBool, localPrimitive, 'true', Kinds.PRIMITIVE)
		);
		this.dclSnippets.set(SnippetKeys.FALSE,
			this.makeSnippet('False', localPrimBool, localPrimitive, 'false', Kinds.PRIMITIVE)
		);
	}

    private generateTiles() : void {
        for (const key of AutoLispExt.WebHelpLibrary.dclTiles.keys()) {
			const lowerKey = key.toLowerCase();
			if (lowerKey === 'dialog') {
				continue;
			}

            const def = AutoLispExt.WebHelpLibrary.dclTiles.get(key);
            const item = new CompletionItemDcl(def.id);
            item.kind = Kinds.TILE;
			item.detail = 'Tile';
            item.sortText = `!${lowerKey}`; // The '!' helps elevate suggestions
            item.documentation = Annotation.asMarkdown(def);
			item.insertText = def.id;
			this.dclTiles.set(lowerKey, item);

			if (def.attributes.some(x => x.toLowerCase().includes('children'))) {
				this.tilesWithChildren.push(lowerKey);
			}
			this.tilesWithChildren.push('paragraph');
			this.tilesWithChildren.push('concatenation');
        }
    }

    private generateAttributes() : void {
		// TODO: OS Filtering Technical debt
		//       After the Lisp AutoComplete gets updated, then we can turn on the new setting for both document types.

        for (const key of AutoLispExt.WebHelpLibrary.dclAttributes.keys()) {
            const def = AutoLispExt.WebHelpLibrary.dclAttributes.get(key);
            const lowerKey = key.toLowerCase();
            const item = new CompletionItemDcl(def.id);
            item.kind = Kinds.ATTRIBUTE;
			item.detail = 'Attribute';			
            item.sortText = `!!${lowerKey}`; // The '!!' helps elevate Attribute suggestions above Tile suggestions
            item.documentation = Annotation.asMarkdown(def);
			item.insertText = def.id;
            this.dclAttributes.set(lowerKey, item);
        }
    }

	private generateEnums() : void {
		for (const key of AutoLispExt.WebHelpLibrary.dclAttributes.keys()) {
			const def = AutoLispExt.WebHelpLibrary.dclAttributes.get(key);
			const lowerKey = key.toLowerCase();
			const types: Array<CompletionItemDcl> = [];
			const declaredTypes = def.valueType.primitive.toLowerCase();

			if (declaredTypes.includes('string')) {
				types.push(this.dclSnippets.get(SnippetKeys.STRING));
			}

			if (declaredTypes.includes('boolean')) {
				types.push(this.dclSnippets.get(SnippetKeys.TRUE));
				types.push(this.dclSnippets.get(SnippetKeys.FALSE));
			}

			if (def.valueType.enums.length > 0) {
				def.valueType.enums.forEach(name => {
					const item = new CompletionItemDcl(name);
					item.kind = Kinds.ENUM;
					item.detail = 'Enum';
					item.sortText = name;
					item.insertText = name;
					types.push(item);
				});
			}

			if (types.length > 0) {
				this.dclEnums.set(lowerKey, types);
			}
		}
	}



}