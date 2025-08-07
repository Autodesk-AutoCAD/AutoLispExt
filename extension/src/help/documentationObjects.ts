import * as vscode from 'vscode';

// All sub-entities of the WebHelpLibrary class are categorized by one of these contextual types. These relate to which part of the documentation generated them and
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


// this "Type" representation is fundamental building block for objects that derive from WebHelpEntity and
// will play an integral role to enhancing intellisense suggestions
export class WebHelpValueType {
	id: string;				// typically indicative of the "name" that was used in the signature area of the documentation
	typeNames: string;		// Often equal to id, but could be the underlying type name of an enum or object
	primitive: string;		// Always a lower case representation, but could also be a truly primitive type such as enum or object when the previous two held identifiers
	enums: string[];		// When representing an enum, this should be populated with "known" possible values and is to be used for enhancing inteli-sense
}


// Generic base type containing all the underlying data specific to making the "Open Web Help" context menu option functional
// Note that enum names are directly represented by this generic class and contain a named redirect to the help documentation that referenced them.
export class WebHelpEntity {
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


	getHelpLink(year): string {
		return WebHelpEntity.getDefaultHelpLink(year) + "?guid=GUID-" + this.guid;
	}

	static createHelpLink(guid: string, year: string): string {
		return WebHelpEntity.getDefaultHelpLink(year) + "?guid=GUID-" + guid;
	}

	static getDefaultHelpLink(year: string): string {
		let lang: string = WebHelpEntity.getLanguageUrlDomain();
		return "https://help.autodesk.com/view/OARX/" + year + lang;
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


// While not directly accessible through OpenWebHelp function since object names aren't directly used in lisp, these do chronicle what each object has for methods & properties.
// Expected to be used for future development of intellisense behaviors
export class WebHelpObject extends WebHelpEntity {
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
export class WebHelpFunction extends WebHelpEntity {
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
export class WebHelpDclTile extends WebHelpEntity {
	attributes: string[];	
	signature: string;	
	constructor(template: object){
		super(template);
		this.attributes = template["attributes"];
		this.signature = template["signature"];
	}	
}


// The signatures were very mildly processed to remove irregularities, but mostly represent exactly what the official documentation provided.
// The valueTypes were rigidly handled/specified by the abstraction generator
export class WebHelpDclAtt extends WebHelpEntity {
	valueType: WebHelpValueType;
	signature: string;		
	constructor(template: object){
		super(template);
		this.valueType = template["valueType"];
		this.signature = template["signature"];
	}	
}