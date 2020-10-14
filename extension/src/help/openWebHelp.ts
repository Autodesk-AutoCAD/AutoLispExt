import * as vscode from 'vscode';
import { IJsonLoadable, webHelpContainer } from "../resources";


// Triggers VSCode to open the official web documentation URL related to the currently selected symbol
// Note: this function is directly referenced by projectCommands.ts and the the package.json contributes (commands & menus) section.
export async function openWebHelp() {
	const editor: vscode.TextEditor = vscode.window.activeTextEditor;
	let selected: string = editor.document.getText(editor.selection);	
	if (selected === "") {
		await vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch');
		selected = editor.document.getText(editor.selection);
	}
	let urlPath: string = webHelpContainer.getWebHelpUrlBySymbolName(selected);
	if (urlPath.trim() !== ""){
		vscode.env.openExternal(vscode.Uri.parse(urlPath));
	}
}


// This container object represents all of the normalized data extracted from help.autodesk.com/view/OARX/
export class WebHelpLibrary implements IJsonLoadable {
	dclAttributes: Dictionary<WebHelpDclAtt> = {};
	dclTiles: Dictionary<WebHelpDclTile> = {};
	objects: Dictionary<WebHelpObject> = {};
	functions: Dictionary<WebHelpFunction> = {};
	ambiguousFunctions: Dictionary<WebHelpFunction[]> = {};
	enumerators: Dictionary<string> = {};	
	
	// consumes a JSON converted object into the WebHelpLibrary
	loadFromJsonObject(obj: object): void{		
		Object.keys(obj["dclAttributes"]).forEach(key => {
			let newObj = new WebHelpDclAtt(obj["dclAttributes"][key]);
			this.dclAttributes[key] = newObj;
		});
		Object.keys(obj["dclTiles"]).forEach(key => {
			let newObj = new WebHelpDclTile(obj["dclTiles"][key]);
			this.dclTiles[key] = newObj;
		});
		Object.keys(obj["objects"]).forEach(key => {
			let newObj = new WebHelpObject(obj["objects"][key]);
			this.objects[key] = newObj;
		});
		Object.keys(obj["functions"]).forEach(key => {
			let newObj = new WebHelpFunction(obj["functions"][key]);
			this.functions[key] = newObj;
		});
		Object.keys(obj["ambiguousFunctions"]).forEach(key => {
			let newLst = [];
			obj["ambiguousFunctions"][key].forEach(element => {
				newLst.push(new WebHelpFunction(element));
			});
			this.ambiguousFunctions[key] = newLst;
		});
		this.enumerators = obj["enumerators"];
		// The obj["events"] dictionary also exists but wasn't used because we really don't have a purpose for them right now.
	}


	// Searches the library dictionaries for a reference to the provided symbol name. If found, yields help URL relevant to that symbol, but otherwise outputs a filetype contextual default help URL
	getWebHelpUrlBySymbolName(item: string): string {
		let symbolProfile: string = item.toLowerCase().trim();
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return; // No Document
		} else if (editor.document.fileName.slice(-4).toUpperCase() === ".LSP") {
			if (symbolProfile in this.objects){
				return this.objects[symbolProfile].getHelpLink();
			} else if (symbolProfile in this.functions){        
				return this.functions[symbolProfile].getHelpLink();
			} else if (symbolProfile in this.ambiguousFunctions){
				return this.ambiguousFunctions[symbolProfile][0].getHelpLink();
			} else if (symbolProfile in this.enumerators){
				return this.getWebHelpUrlBySymbolName(this.enumerators[symbolProfile]);
			} else {
				return WebHelpEntity.createHelpLink("4CEE5072-8817-4920-8A2D-7060F5E16547");  // LSP General Landing Page
			}
		} else if (editor.document.fileName.slice(-4).toUpperCase() === ".DCL") {
			if (symbolProfile in this.dclTiles){        
				return this.dclTiles[symbolProfile].getHelpLink();
			} else if (symbolProfile in this.dclAttributes){        
				return this.dclAttributes[symbolProfile].getHelpLink();
			} else {
				return WebHelpEntity.createHelpLink("F8F5A79B-9A05-4E25-A6FC-9720216BA3E7"); // DCL General Landing Page
			}
		}
		return WebHelpEntity.getDefaultHelpLink();
	}
}


// All sub-entities of the WebHelpLibrary class are catagorized by one of these contextual types. These relate to which part of the documentation generated them and
// what type of behavior or signature each of them individually represents regarding that documentation
enum WebHelpCategory {
	OBJECT = 0,
	METHOD = 1,
	PROPGETTER = 2,
	PROPSETTER = 3,
	FUNCTION = 4,
	ENUM = 5,
	DCLTILE = 6,
	DCLATT = 7,
	EVENT = 8
}


// mostly used as decoration
interface Dictionary<T> {
	[Key: string]: T;
}


// this "Type" representation is fundemental building block for objects that derive from WebHelpEntity and 
// will play an integral role to enhancing intellisense suggestions
class WebHelpValueType {
	id: string;				// typically indicative of the "name" that was used in the signature area of the documentation
	typeNames: string;		// Often equal to id, but could be the underlying type name of an enum or object
	primitive: string;		// Always a lower case representation, but could also be a truly primitive type such as enum or object when the previous two held identifiers
	enums: string[];		// When representing an enum, this should be populated with "known" possible values and is to be used for enhancing inteli-sense
}


// Generic base type containing all the underlying data specific to making the "Open Web Help" context menu option functional
// Note that enum names are directly represented by this generic class and contain a named redirect to the help documentation that referenced them.
class WebHelpEntity {	
	id: string;
	category: WebHelpCategory;	
	guid: string;
	description: string;
	platforms: string;
	constructor(template: object)
	{
		this.category = template["category"];
		this.description = template["description"];
		this.guid = template["guid"];
		this.id = template["id"];
		this.platforms = template["platforms"];
	}


	getHelpLink(): string {
		return WebHelpEntity.getDefaultHelpLink() + "?guid=GUID-" + this.guid;
	}

	static createHelpLink(guid: string): string {
		return WebHelpEntity.getDefaultHelpLink() + "?guid=GUID-" + guid;
	}

	static getDefaultHelpLink(): string {
		let lang: string = WebHelpEntity.getLanguageUrlDomain();
		let year: number = new Date().getFullYear() + 1;
		return "https://help.autodesk.com/view/OARX/" + year.toString() + lang;
	}

	static getLanguageUrlDomain(): string {
		switch (vscode.env.language.toLowerCase()) {			
			case "de": return "/DEU/";
			case "es": return "/ESP/";
			case "fr": return "/FRA/";
			case "hu": return "/HUN/";
			case "ja": return "/JPN/";
			case "en": return "/ENU/";
			case "ko": return "/KOR/";
			case "pt": return "/PTB/";
			case "br": return "/PTB/";
			case "pt-br": return "/PTB/";
			case "ru": return "/RUS/";
			case "zh": return "/CHS/";
			case "chs": return "/CHS/";
			case "cn": return "/CHS/";
			case "zh-cn": return "/CHS/";
			case "zh-hans": return "/CHS/";
			case "cht": return "/CHT/";
			case "tw": return "/CHT/";
			case "zh-tw": return "/CHT/";
			case "zh-hant": return "/CHT/";
			default: return "/ENU/";
		}
	}
}


// While not directly accessible through OpenWebHelp function since object names aren't directly used in lisp, these do cronical what each object has for methods & properties.
// Expected to be used for future development of intellisense behaviors
class WebHelpObject extends WebHelpEntity {	
	properties: string[];
	methods: string[];		
	constructor(template: object){
		super(template);
		this.methods = template["methods"];
		this.properties = template["properties"];
	}	
}


// This encapsulates a single symbol signature from the official online help documentation. Anything of type function, method or property generated (at least) one of these objects.
// Note: Some "methods" contained multiple signatures and wound up being filed in WebHelpLibrary.ambiguousFunctions dictionary<key: string, signatures: WebHelpFunction[]>
// 		 An example of this is the Vla-Add 
class WebHelpFunction extends WebHelpEntity {
	arguments: WebHelpValueType[];
	returnType: WebHelpValueType;
	validObjects: string[];
	signature: string;	
	constructor(template: object){
		super(template);
		this.arguments = template["arguments"];
		this.returnType = template["returnType"];
		this.signature = template["signature"];
		this.validObjects = template["validObjects"];
	}
}

// The signatures were only very mildly processed to remove irregularities, but mostly represent exactly what the official documentation provided.
// The attributes field is purely a list of normalized names. Use webHelpContainer<WebHelpLibrary>[dclAttributes][name] to query data about a specific attribute type.
class WebHelpDclTile extends WebHelpEntity {
	attributes: string[];	
	signature: string;	
	constructor(template: object){
		super(template);
		this.attributes = template["attributes"];
		this.signature = template["signature"];
	}	
}


// The signatures were very mildly processed to remove irregularities, but mostly represent exactly what the official documentation provided.
// The valueTypes were reigidly handled/specified by the abstraction generator
class WebHelpDclAtt extends WebHelpEntity {	
	valueType: WebHelpValueType;
	signature: string;		
	constructor(template: object){
		super(template);
		this.valueType = template["valueType"];
		this.signature = template["signature"];
	}	
}