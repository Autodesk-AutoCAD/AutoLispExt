import * as vscode from 'vscode';
import { webHelpContainer } from "../completion/autocompletionProvider"; // Currently where all ./data/ files are being loaded & was maintained for symmetry


// Triggers VSCode to open the official web documentation URL related to the currently selected symbol
// Note: this function is directly referenced by projectCommands.ts and the the package.json contributes (commands & menus) section.
export function openWebHelp() {
	const editor: vscode.TextEditor = vscode.window.activeTextEditor;
	let selected: string = editor.document.getText(editor.selection);	
	let urlPath: string = webHelpContainer.getWebHelpUrlBySymbolName(selected);
	vscode.env.openExternal(vscode.Uri.parse(urlPath));
}


// This container object represents all the normalized data extracted from help.autodesk.com/view/OARX/
export class WebHelpLibrary{
	objects: Dictionary<WebHelpObject> = {};
	functions: Dictionary<WebHelpFunction> = {};
	ambiguousFunctions: Dictionary<WebHelpFunction[]> = {};
	enumerators: Dictionary<WebHelpEntity> = {};	
	
	// consumes a JSON converted object into the WebHelpLibrary
	load(obj: object): void{		
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
		Object.keys(obj["enumerators"]).forEach(key => {
			let newObj = new WebHelpEntity(obj["enumerators"][key]);
			this.enumerators[key] = newObj;
		});
	}
	getDefaultHelpLink(): string{
		let year: number = new Date().getFullYear() + 1;
		return "https://help.autodesk.com/view/OARX/" + year.toString() + "/ENU/";
	}

	// Searches the library dictionaries for a reference to the provided symbol name. If found, yields help URL relevant to that symbol, but otherwise outputs generalized help URL
	getWebHelpUrlBySymbolName(item: string): string {
		let symbolProfile: string = item.toLowerCase();
		if (symbolProfile in this.functions){        
			return this.functions[symbolProfile].getHelpLink();
		} else if (symbolProfile in this.enumerators){
			return this.enumerators[symbolProfile].getHelpLink();
		} else if (symbolProfile in this.ambiguousFunctions){
			return this.ambiguousFunctions[symbolProfile][0].getHelpLink();
		} else if (symbolProfile in this.objects){
			return this.objects[symbolProfile].getHelpLink();
		} else{
			return this.getDefaultHelpLink();
		}
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
	ENUM = 5
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
// Note that enum names are directly represented by this generic class and contain a GUID redirect to the help documentation that referenced them.
class WebHelpEntity {	
	id: string;
	category: WebHelpCategory;	
	guid: string;
	description: string;
	constructor(template: object)
	{
		this.category = template["category"];
		this.description = template["description"];
		this.guid = template["guid"];
		this.id = template["id"];
	}
	getHelpLink(): string{
		let year: number = new Date().getFullYear() + 1;
		return "https://help.autodesk.com/view/OARX/" + year.toString() + "/ENU/?guid=GUID-" + this.guid;
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


