import * as LibObjects from '../help/documentationObjects';
import {ILispDocs, ILspDocPair} from '../parsing/comments';
import {ReadonlyDocument} from "../project/readOnlyDocument";
import * as vscode from "vscode";
import {AutoLispExt} from "../extension";
import {StringBuilder} from "../utils";
import {ILispFragment} from "../astObjects/ILispFragment";
import {LispAtom} from "../astObjects/lispAtom";
import * as path from 'path';



export enum AnnoIcon {
    METHOD = '$(symbol-method)',
    STRUCT = '$(symbol-struct)',
    ATTRIBUTE = '$(symbol-property)',
    MEMBER = '$(symbol-enum-member)',
	ERROR = '$(error)',
	WARNING = '$(warning)',
	USER = '$(account)'
}

namespace MarkdownHelpers {
	export const divider: string = '\n ------ ';

    export function bold(text: string): string {
        return `**${text}**`;
    }

	export function italic(text: string): string {
        return `*${text}*`;
    }

	export function webLink(text: string, url: string): string {
        return `[${text}](${url})`;
    }

	export function fileLink(text: string, filePath: string, line: number): string {
		// TODO: there is a syntax for file links within vscode, but wasting far too much time trying to make it work;
		//  	 possibly need newer VSCode target version & @Types update.
		//return `[${text}](vscode://${filePath}:${line})`;

		return text;


		//// MISC Stuff I've Tried
		//const normal = path.replace(/ /g, '%20');
		//const normal = DocumentServices.normalizeFilePath(path).replace(/ /g, '%20');
		//const thisLink = `[${atom.symbol}](file://${normal}:${atom.line})`;
		//const thisLink = `[${atom.symbol}](vscode://${normal})`;
		//md['baseUri'] = vscode.Uri.file(dirname(path));
    }

	export function bullet(text: string): string {
		return ` - ${text}`;
	}

	export function addParam(source: LibObjects.WebHelpValueType, active: boolean): string {
		return `${divider}\n${webHelpValueTypeHandler(source, 'Param', active)}`;
	}

	export function addReturn(source: LibObjects.WebHelpValueType): string {
		return `${divider}\n${webHelpValueTypeHandler(source, 'Returns', false)}`;
	}

	function webHelpValueTypeHandler(item: LibObjects.WebHelpValueType, label: string, active: boolean): string {
		let typeString = '';
		const types = item.typeNames.split(/,| /g).filter(x => x.length > 0);
		if (types.length >= 1) {
			const last = types.length - 1;
			const year = AutoLispExt.Resources.WebHelpContainer.year;
			for (let i = 0; i < types.length; i++) {
				const name = types[i];
				const def = AutoLispExt.Resources.WebHelpContainer.objects.get(name.toLowerCase());
				if (!def) {
					typeString += name;
				} else {
					typeString += webLink(def.id, def.getHelpLink(year));
				}

				if (i !== last) {
					typeString += ', ';
				}
			}
		} else {
			typeString = 'nil';
		}

		const enums = item.enums.filter(x => x.trim().length > 0);

		if (active) {
			return enums.length >= 1
				? `@${label}: **${item.id}**&lt;${item.primitive}&gt;\n\nTypes: ${typeString}\n\n - ${enums.join('\n - ')}`
				: `@${label}: **${item.id}**&lt;${item.primitive}&gt;}\n\nTypes: ${typeString}`;
		}

		return enums.length >= 1
			? `@${label}: ${item.id}&lt;${item.primitive}&gt;\n\nTypes: ${typeString}\n\n - ${enums.join('\n - ')}`
			: `@${label}: ${item.id}&lt;${item.primitive}&gt;\n\nTypes: ${typeString}`;
	}
}




export namespace Annotation {

	// TODO: later versions of VSCode.MarkdownString allow HTML and would give us a lot more layout/presentation control

	export function asMarkdown(source: string): vscode.MarkdownString;
    export function asMarkdown(source: LispAtom, paramIndex?: number, args?: LispAtom[], docs?: ILispDocs, path?: string): vscode.MarkdownString;
    export function asMarkdown(source: LibObjects.WebHelpFunction, paramIndex?: number): vscode.MarkdownString;
    export function asMarkdown(source: LibObjects.WebHelpDclAtt): vscode.MarkdownString;
    export function asMarkdown(source: LibObjects.WebHelpDclTile): vscode.MarkdownString;
    export function asMarkdown(source: string | LispAtom | LibObjects.WebHelpFunction | LibObjects.WebHelpObject | LibObjects.WebHelpDclAtt | LibObjects.WebHelpDclTile,
							   paramIndex?: number, args?: LispAtom[], docs?: ILispDocs, path?: string): vscode.MarkdownString {
		if (source instanceof LibObjects.WebHelpFunction) {
			return FunctionMarkdown(source, paramIndex ?? -1);
		}
		if (source instanceof LibObjects.WebHelpDclAtt) {
			return DclAttMarkdown(source);
		}
		if (source instanceof LibObjects.WebHelpDclTile) {
			return DclTileMarkdown(source);
		}
		if (source instanceof LispAtom) {
			return UserMarkdown(source, paramIndex ?? -1, args ?? [], docs, path);
		}

		const typ = typeof source;
		if (typ === 'string') {
			return EnumMarkdown(source as string);
		}

		return null;
    }

	function FunctionMarkdown(source: LibObjects.WebHelpFunction, paramIndex: number): vscode.MarkdownString {
		const lines = [];
		let year = AutoLispExt.Resources.WebHelpContainer.year;
		let url = source.getHelpLink(year);
		lines.push(`${AnnoIcon.METHOD} ${MarkdownHelpers.webLink(MarkdownHelpers.bold(source.id), url)} [${source.platforms}]\n`);
		lines.push(source.description);
		lines.push(MarkdownHelpers.divider);
		lines.push(source.signature.replace(/\</g, '&lt;').replace(/\>/g, '&gt;'));

		if (source.arguments.length > 0) {
			for (let i = 0; i < source.arguments.length; i++) {
				const arg = source.arguments[i];
				lines.push(MarkdownHelpers.addParam(arg, i === paramIndex));
			}
		}

		lines.push(MarkdownHelpers.addReturn(source.returnType));

		const result = new vscode.MarkdownString(lines.join('\n'));
		result.isTrusted = true;
		result.supportThemeIcons = true;
		return result;
	}


	function DclAttMarkdown(source: LibObjects.WebHelpDclAtt) : vscode.MarkdownString {
		const lines = [];
		let year = AutoLispExt.Resources.WebHelpContainer.year;		
		let url = source.getHelpLink(year);		
		lines.push(`${AnnoIcon.ATTRIBUTE} ${MarkdownHelpers.webLink(MarkdownHelpers.bold(source.id), url)} [${source.platforms}]\n`);
		lines.push(source.description);
		lines.push(MarkdownHelpers.divider);
		lines.push(source.signature);
		lines.push(MarkdownHelpers.divider);
		lines.push(`Type: ${source.valueType.primitive}`);

		if (source.valueType.enums.length > 0) {
			source.valueType.enums.forEach(e => {
				lines.push(MarkdownHelpers.bullet(e));
			});
		}
		const result = new vscode.MarkdownString(lines.join('\n'));
		result.isTrusted = true;
		result.supportThemeIcons = true;
		return result;
	}


	function DclTileMarkdown(source: LibObjects.WebHelpDclTile) : vscode.MarkdownString {
		const lines = [];
		let year = AutoLispExt.Resources.WebHelpContainer.year;
		let url = source.getHelpLink(year);

		lines.push(`${AnnoIcon.STRUCT} ${MarkdownHelpers.webLink(MarkdownHelpers.bold(source.id), url)} [${source.platforms}]\n`);
		lines.push(source.description);
		lines.push(MarkdownHelpers.divider);

		lines.push('Signatures:');
		if (source.id !== 'dialog'){
			lines.push(MarkdownHelpers.bullet(`${source.id};`));
		}
		if (source.attributes.length > 0) {
			lines.push(MarkdownHelpers.bullet(`: ${source.id} { ${MarkdownHelpers.italic('attributes?')} }`));
		}
		if (source.id === 'dialog' || source.attributes.some(x => x.match(/children/i))) {
			lines.push(MarkdownHelpers.bullet(`: ${source.id} { ${MarkdownHelpers.italic('attributes?')} ${MarkdownHelpers.italic('tiles?')} }`));
		}

		if (source.attributes.length > 0) {
			let text = `${MarkdownHelpers.divider}\nAttributes: `;
			const last = source.attributes.length - 1;
			for (let i = 0; i < source.attributes.length; i++) {
				const att = source.attributes[i];
				const libItem = AutoLispExt.Resources.WebHelpContainer.dclAttributes.get(att.toLowerCase());
				const itemLink = !libItem ? libItem : MarkdownHelpers.webLink(att, libItem.getHelpLink(year));
				text += i === last ? itemLink : `${itemLink}, `;
			}
			lines.push(text);
		}
		const result = new vscode.MarkdownString(lines.join('\n'));
		result.isTrusted = true;
		result.supportThemeIcons = true;
		return result;
	}


	function EnumMarkdown(source: string) : vscode.MarkdownString {
		if (!source) {
			return null;
		}
		const result = new vscode.MarkdownString(`${AnnoIcon.MEMBER} ${MarkdownHelpers.bold(source)} [WIN|MAC?]\n\nEnumerated Value`);
		result.isTrusted = true;
		result.supportThemeIcons = true;
	}




// TODO: handle ACTIVE index
	function UserMarkdown(source: LispAtom, index: number, args: LispAtom[], docs: ILispDocs, sourceFile: string): vscode.MarkdownString {
		const lines = [];
		lines.push(`${AnnoIcon.USER} ${MarkdownHelpers.fileLink(MarkdownHelpers.bold(source.symbol), sourceFile, source.line)} [?]\n`);
		if (docs?.description) {
			lines.push(docs.description.value);
		}

		lines.push(MarkdownHelpers.divider);

		let sig = '';
		const sigIndex = lines.length; // placeholder index
		lines.push(sig);
		lines.push(MarkdownHelpers.divider);

		if (docs?.params) {
			sig = extractDynamicSignature(source, args, index, docs, lines);
		} else {
			sig  = extractGenericSignature(source, args, index);
		}
		lines[sigIndex] = sig; // because extractDynamicSignature() adds additional lines

		lines.push(MarkdownHelpers.divider);

		if (docs?.remarks) {
			lines.push(`@Remarks: ${docs.remarks.value}`);
			lines.push(MarkdownHelpers.divider);
		}

		if (docs?.returns) {
			lines.push(`@Returns: ${docs.returns.value}`);
		} else {
			lines.push(`${AnnoIcon.WARNING} @Returns: Undocumented`);
		}

		lines.push(MarkdownHelpers.divider);
		lines.push(`Source: ${MarkdownHelpers.italic(path.basename(sourceFile))}`);

		const result = new vscode.MarkdownString(lines.join('\n'));
		result.isTrusted = true;
		result.supportThemeIcons = true;
		return result;
	}

	function extractGenericSignature(source: LispAtom, args: LispAtom[], index: number) {
		let sig = `(${source.symbol}`;
		for (let i = 0; i < args.length; i++) {
			const id = i === index ? MarkdownHelpers.bold(args[i].symbol) : args[i].symbol;
			sig += ` ${id}`;
		}
		return `${sig})`;
	}

	function extractDynamicSignature(source: LispAtom, args: LispAtom[], index: number, docs: ILispDocs, lines: any[]) {
		let sig = `(${source.symbol}`;
		const expect = args.map(x => x.symbol.toLowerCase());
		for (let i = 0; i < docs.params.length; i++) {
			const param = docs.params[i];

			let id = args.length < i ? args[i].symbol : param.name;
			if (i === index) {
				id = MarkdownHelpers.bold(id);
			}

			if (i >= expect.length || param.name.toLowerCase() !== expect[i]) {
				lines.push(`${AnnoIcon.WARNING} @Param: ${id}\n\n${param.value}\n${MarkdownHelpers.divider}`);
			} else {
				lines.push(`@Param: ${id}\n\n${param.value}\n${MarkdownHelpers.divider}`);
			}

			sig += ` ${id}`;
		}
		if (args.length > docs.params.length) {
			for (let i = docs.params.length; i < args.length; i++) {
				const id = index === i ? MarkdownHelpers.bold(args[i].symbol) : args[i].symbol;
				lines.push(`${AnnoIcon.WARNING} @Param: ${id}\n\nUndocumented\n${MarkdownHelpers.divider}`);
				sig += ` ${id}`;
			}
		}
		sig += ')';
		return sig;
	}
}


