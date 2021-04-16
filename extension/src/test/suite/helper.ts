import * as vscode from 'vscode';

export async function sleep(ms: number) {
	console.log(`sleep for ${ms} ms for the extension activated`);
	return new Promise(resolve => setTimeout(resolve, ms));
}

//usage of this princ is princ({str}) which will pass an object instead of value only
export function princ(str : any){
	var name = Object.keys(str)[0];
    var value = str[name];
	console.log(`-----the ${name} is ${value.toString()}-----`);
}
//This method is to read a file and return the vscode.TextDocument object 
export async function readFile2TextDocument(filepath: string) : Promise<vscode.TextDocument | undefined> {
	let doc : vscode.TextDocument;
	try {
        return doc = await vscode.workspace.openTextDocument(filepath);
      } catch (error) {
        return undefined;
      }
}
