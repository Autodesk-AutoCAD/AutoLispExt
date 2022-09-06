import * as LibObjects from '../help/documentationObjects';
import {ILispDocs} from '../parsing/comments';
import * as vscode from "vscode";
import {AutoLispExt} from "../context";
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

	export function emphasis(text: string): string {
        return `\`${text}\``;
    }

	export function webLink(text: string, url: string): string {
        return `[${text}](${url})`;
    }

	export function fileLink(text: string, filePath: string, line: number): string {
		return text;

		// TODO: there is a syntax for file links within vscode, but wasting far too much time trying to make it work;
		//  	 possibly need newer VSCode target version & @Types update.
		//return `[${text}](vscode://${filePath}:${line})`;

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
		return `${divider}\n${webHelpValueTypeHandler(source, italic('param'), active)}`;
	}

	export function addReturn(source: LibObjects.WebHelpValueType): string {
		return `${divider}\n${webHelpValueTypeHandler(source, italic('returns'), false)}`;
	}

	function webHelpValueTypeHandler(item: LibObjects.WebHelpValueType, label: string, active: boolean): string {
		let typeString = '';
		const types = item.typeNames.split(/,| /g).filter(x => x.length > 0);
		if (types.length >= 1) {
			const last = types.length - 1;
			const year = AutoLispExt.WebHelpLibrary.year;
			for (let i = 0; i < types.length; i++) {
				const name = types[i];
				const def = AutoLispExt.WebHelpLibrary.objects.get(name.toLowerCase());
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

		if (label.includes('returns')) {
			return enums.length >= 1
			? `@${label} — &lt;${item.primitive}&gt;\n\nTypes: ${typeString}\n\n - ${enums.join('\n - ')}`
			: `@${label} — &lt;${item.primitive}&gt;\n\nTypes: ${typeString}`;
		}

		const id = active ? MarkdownHelpers.bold(MarkdownHelpers.emphasis(item.id)) : MarkdownHelpers.emphasis(item.id);

		return enums.length >= 1
			? `@${label} — ${id}&lt;${item.primitive}&gt;\n\nTypes: ${typeString}\n\n - ${enums.join('\n - ')}`
			: `@${label} — ${id}&lt;${item.primitive}&gt;\n\nTypes: ${typeString}`;
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

		if (source) {
			return EnumMarkdown(source.toString());
		}

		return null;
    }

	function FunctionMarkdown(source: LibObjects.WebHelpFunction, paramIndex: number): vscode.MarkdownString {
		const lines = [];
		let year = AutoLispExt.WebHelpLibrary.year;
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
		let year = AutoLispExt.WebHelpLibrary.year;
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
		let year = AutoLispExt.WebHelpLibrary.year;
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
				const libItem = AutoLispExt.WebHelpLibrary.dclAttributes.get(att.toLowerCase());
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
		const result = new vscode.MarkdownString(`${AnnoIcon.MEMBER} ${MarkdownHelpers.bold(source)} [WIN|?]\n\nEnumerated Value`);
		result.isTrusted = true;
		result.supportThemeIcons = true;
		return result;
	}


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

		sig = docs?.params
			? extractDynamicSignature(source, args, index, docs, lines)
			: extractGenericSignature(source, args, index);

		lines[sigIndex] = sig; // because extractDynamicSignature() adds additional lines


		if (docs?.returns) {
			lines.push(`@${MarkdownHelpers.italic('returns')} — ${docs.returns.value}`);
		} else {
			lines.push(`@${MarkdownHelpers.italic('returns')} — ${AnnoIcon.WARNING} Undocumented`);
		}

		if (docs?.remarks) {
			lines.push(MarkdownHelpers.divider);
			lines.push(`@${MarkdownHelpers.italic('remarks')} — ${docs.remarks.value}`);
		}

		lines.push(MarkdownHelpers.divider);
		lines.push(`${MarkdownHelpers.italic('source')} — ${path.basename(sourceFile)}`);

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
			const annoId = index === i ? MarkdownHelpers.bold(MarkdownHelpers.emphasis(id)) : MarkdownHelpers.emphasis(id);
			const sigId = index === i ? MarkdownHelpers.bold(id) : id;

			if (i >= expect.length || param.name.toLowerCase() !== expect[i]) {
				lines.push(`@${MarkdownHelpers.italic('param')} — ${AnnoIcon.WARNING} ${annoId} ${param.value}\n${MarkdownHelpers.divider}`);
			} else {
				lines.push(`@${MarkdownHelpers.italic('param')} — ${annoId} ${param.value}\n${MarkdownHelpers.divider}`);
			}

			sig += ` ${sigId}`;
		}
		if (args.length > docs.params.length) {
			for (let i = docs.params.length; i < args.length; i++) {
				const id = args[i].symbol;
				const annoId = index === i ? MarkdownHelpers.bold(MarkdownHelpers.emphasis(id)) : MarkdownHelpers.bold(id);
				const sigId = index === i ? MarkdownHelpers.bold(id) : id;
				lines.push(`@${MarkdownHelpers.italic('param')} — ${AnnoIcon.WARNING} ${annoId} Undocumented\n${MarkdownHelpers.divider}`);
				sig += ` ${sigId}`;
			}
		}
		
		sig += ')';
		return sig;
	}
}


