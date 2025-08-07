import { getExtensionSettingString } from '../resources';
import { ReadonlyDocument } from '../project/readOnlyDocument';
import { IJsonLoadable } from "../resources";
import { WebHelpDclAtt, WebHelpDclTile, WebHelpEntity, WebHelpFunction, WebHelpObject } from './documentationObjects';
import {DocumentServices} from "../services/documentServices";

let _instance: WebHelpLibrarySingleton;

// This container object represents all of the normalized data extracted from help.autodesk.com/view/OARX/
export class WebHelpLibrarySingleton implements IJsonLoadable {
    dclAttributes: Map<string, WebHelpDclAtt> = new Map();
    dclTiles: Map<string, WebHelpDclTile> = new Map();
    objects: Map<string, WebHelpObject> = new Map();
    functions: Map<string, WebHelpFunction> = new Map();
    ambiguousFunctions: Map<string, WebHelpFunction[]> = new Map();
    enumerators: Map<string, string> = new Map();
    private _jsonYear: string = '';
    private _testYear: string = null;

    private constructor() {}

    static get Instance(): WebHelpLibrarySingleton {
        if (_instance instanceof WebHelpLibrarySingleton) {
            return _instance;
        }
        return _instance = new WebHelpLibrarySingleton();
    }

    get year(): string {
        return this._testYear ?? getExtensionSettingString('help.TargetYear');
    }

    set year(value: string) {
        this._testYear = value;
    }
    

    get jsonCreatedWithVersionYear(): string {
        return this._jsonYear;
    }


    // consumes a JSON converted object into the _instance
    loadFromJsonObject(obj: object): void{
        // Issue #70, A user configured extension setting was requested by Issue #70 and deprecated the use of the embedded json year
        //            However, this was left available in case we would like to setup a unit test that insures the JSON isn't stale.
        this._jsonYear = obj['year'] ?? '2021';

        Object.keys(obj["dclAttributes"]).forEach(key => {
            let newObj = new WebHelpDclAtt(obj["dclAttributes"][key]);
            this.dclAttributes.set(key, newObj);
        });
        Object.keys(obj["dclTiles"]).forEach(key => {
            let newObj = new WebHelpDclTile(obj["dclTiles"][key]);
            this.dclTiles.set(key, newObj);
        });
        Object.keys(obj["objects"]).forEach(key => {
            let newObj = new WebHelpObject(obj["objects"][key]);
            this.objects.set(key, newObj);
        });
        Object.keys(obj["functions"]).forEach(key => {
            let newObj = new WebHelpFunction(obj["functions"][key]);
            this.functions.set(key, newObj);
        });
        Object.keys(obj["ambiguousFunctions"]).forEach(key => {
            let newLst = [];
            obj["ambiguousFunctions"][key].forEach(element => {
                newLst.push(new WebHelpFunction(element));
            });
            this.ambiguousFunctions.set(key, newLst);
        });
        Object.keys(obj["enumerators"]).forEach(key => {
            this.enumerators.set(key, obj["enumerators"][key]);
        });
        // The obj["events"] dictionary also exists but wasn't used because we really don't have a purpose for them right now.
    }


    // Searches the library dictionaries for a reference to the provided symbol name.
    // If found, yields help URL relevant to that symbol, but otherwise outputs a filetypes contextual default help URL.
    // Also removed all reference to ActiveEditor and added a filePath arg so the function would be easier
    // to test and then becomes recyclable for use in markdown generation.
    getWebHelpUrlBySymbolName(item: string, file: string|ReadonlyDocument|DocumentServices.Selectors): string {
        const lowerKey = item.toLowerCase().trim();
        const selector = typeof file === 'string' 
            ? DocumentServices.getSelectorType(file)
            : file instanceof ReadonlyDocument 
                ? DocumentServices.getSelectorType(file.fileName)
                : file;
        if (selector === DocumentServices.Selectors.LSP) {
            return this.processLSP(lowerKey, selector);
        } else if (selector === DocumentServices.Selectors.DCL) {
            return this.processDCL(lowerKey);
        }
        return WebHelpEntity.getDefaultHelpLink(this.year);
    }

    private processDCL(key: string): string {
        if (this.dclTiles.has(key)){
            return this.dclTiles.get(key).getHelpLink(this.year);
        } else if (this.dclAttributes.has(key)){
            return this.dclAttributes.get(key).getHelpLink(this.year);
        }
        return WebHelpEntity.createHelpLink("F8F5A79B-9A05-4E25-A6FC-9720216BA3E7", this.year); // DCL General Landing Page
    }

    private processLSP(key: string, selector: DocumentServices.Selectors): string {
        if (this.objects.has(key)){
            return this.objects.get(key).getHelpLink(this.year);
        } else if (this.functions.has(key)){
            return this.functions.get(key).getHelpLink(this.year);
        } else if (this.ambiguousFunctions.has(key)){
            return this.ambiguousFunctions.get(key)[0].getHelpLink(this.year);
        } else if (this.enumerators.has(key)){
            return this.getWebHelpUrlBySymbolName(this.enumerators.get(key), selector);
        } else {
            return WebHelpEntity.createHelpLink("4CEE5072-8817-4920-8A2D-7060F5E16547", this.year);  // LSP General Landing Page
        }
    }
}


