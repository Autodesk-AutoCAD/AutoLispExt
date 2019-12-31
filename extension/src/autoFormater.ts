import * as vscode from 'vscode';
import {LispParser} from "./format/formatter"

////////////////////////////////////////////////////////////////////////////////////////////
/////////              The basic idea of the format algorithm                //////////////
//////////////////////////////////////////////////////////////////////////////////////////
// The base logic for the format: I calculate all the bracket pairs and how many parent
// bracket it has (level).
// After this, I would calculate the whitespace number before every line
// 1. the line start with bracket:  whitespace number would be the 2 * level;
// 2. the line start with comment charactor: whitespace number would be same as the line before it;
// 3. the line start with a common charactor: whitespace number would be 2 * level of the line before it;
// Notice: I would filter the bracket in the commented line and the block commented areas;

//Indicates the single symbol and its' position
class Bracket{
	public left: string;
	public right: string;

	constructor(l, r){
		this.left = l;
		this.right = r;
	}
}

let bracketMap: Bracket[] = [new Bracket("(", ")"), new Bracket("[", "]")];

class SymbolPos{
	public symbol:string;
	public row: number;
	public column: number;

	constructor(s, r, c){
		this.symbol = s;
		this.row = r;
		this.column = c;
	}
}

class Matcher{
	public startPosSymbol:SymbolPos;
	public endPosSymbol:SymbolPos;
	public level:number;			//how many bracket before
	public ifStartNewLine:boolean;		//if start as a new line
	public ifEndNewLine:boolean;		//if end as a new line
	public bracket:Bracket;

	constructor(start, end, level, ifStartNewLine, ifEndNewLine, bracket){
		this.startPosSymbol = start;
		this.endPosSymbol = end;
		this.level = level;
		this.ifStartNewLine = ifStartNewLine;
		this.ifEndNewLine = ifEndNewLine;
		this.bracket = bracket;
	}
}

class BracketMatcherCache{
	public tmpMatcherList:SymbolPos[] = [];

	//add bracket into the stack
	public filterBracket(bracketItem:SymbolPos): any{
		let matcher:Matcher = null;

		//we would not take the commented bracket into consideration
		if(AutoFormater.ifCommentedLineCache || AutoFormater.ifCommentedBlockCache || AutoFormater.ifStringAreaCache)
			return matcher;

		//Step1. get the machted bracket
		let matchedBracket:Bracket = this.getTheMatchedBracket(bracketItem);

		//Step2. Handle the bracket
		// 1. left bracket: add into the cache
		// 2. right bracket: take out from the cache and create the matcher object
		matcher = this.getTheMatcher(bracketItem, matchedBracket);

		return matcher;
	}

	private getTheMatchedBracket(bracketItem: SymbolPos):Bracket{
		let matchedBracket:Bracket = null;
		for(let i = 0; i < bracketMap.length; i++){
			let bracket = bracketMap[i];
			if(bracketItem.symbol === bracket.left || bracketItem.symbol === bracket.right){
				matchedBracket = bracket;
				break;
			}
		}

		return matchedBracket;
	}

	private getTheMatcher(bracketItem:SymbolPos, matchedBracket: Bracket):Matcher{
		let matcher:Matcher = null;

		if(matchedBracket !== null){
			if(bracketItem.symbol === matchedBracket.left){
				this.tmpMatcherList.push(bracketItem);
			}else if(bracketItem.symbol === matchedBracket.right){
				if (this.tmpMatcherList.length == 0)
				{	// only right bracket. This is not right.
					vscode.window.showErrorMessage("Unbalanced token found.");
					return null;
				}
				for(let k = this.tmpMatcherList.length - 1; k >= 0; k--){
					if(this.tmpMatcherList[k].symbol === matchedBracket.left){
						let ifStartNewLine = true;
						let ifEndNewLine = true;
						if(k > 0 && this.tmpMatcherList[k-1].row === this.tmpMatcherList[k].row){
							ifStartNewLine = false;
						}
						if(bracketItem.row === this.tmpMatcherList[this.tmpMatcherList.length - 1].row){
							ifEndNewLine = false;
						}
						matcher = new Matcher(this.tmpMatcherList[k], bracketItem, k, ifStartNewLine, ifEndNewLine, matchedBracket);
						this.tmpMatcherList = this.tmpMatcherList.filter((ele, index, arr)=>{return (index != k);});
						break;
					}
				}
			}
		}

		return matcher;
	}

}
enum BeginEndType {
    BracketBegin = 1,
    BracketEnd,
    NoBracket
}
class BlackSpaceNum{
	public spaceNum: number;
	public bracketEnd:BeginEndType;
	public closeSpaceNum:number;		//only describe the close bracket's blank space number
	public maxOpenSpaceNum:number;		//only describe the max level bracket's black space number in the line

	constructor(num, csNum, mosNum, beType){
		this.spaceNum = num;
		this.closeSpaceNum = csNum;
		this.maxOpenSpaceNum = mosNum;
		this.bracketEnd = beType;
	}
}

export class AutoFormater{
	public static matcherList: Matcher[] = [];
	public static bracketMatcherCache:BracketMatcherCache = new BracketMatcherCache();
	public static ifCommentedLineCache:boolean = false;
	public static ifCommentedBlockCache:boolean = false;
	public static ifStringAreaCache:boolean = false;
	public static isEscapingMode = false;
	public static lastSpaceNumTypeCache:BlackSpaceNum = new BlackSpaceNum(0, 0, 0, BeginEndType.NoBracket);

	public static getFullDocRange(editor:vscode.TextEditor):vscode.Range{
		return editor.document.validateRange(
			new vscode.Range(
				new vscode.Position(0,0),
				new vscode.Position(Number.MAX_VALUE, Number.MAX_VALUE)
			)
		);
	}
	
	public static getSelectedDocRange(editor: vscode.TextEditor): vscode.Range {
		let startPos = new vscode.Position(editor.selection.start.line, editor.selection.start.character);
		let endPos = new vscode.Position(editor.selection.end.line, editor.selection.end.character);
		return editor.document.validateRange(
			new vscode.Range(
				startPos,
				endPos
			)
		);
	}

	///execute the document format based on the flag
	//1. editor：choosed editor
	//2. ifFullFormat: true - format the full document;  false - format the selected document
	public static excuteFormatDoc(editor: vscode.TextEditor, ifFullFormat:boolean):string{
		
		let textString = editor.document.getText();
		// get selection string
		if (!ifFullFormat)
		{
			textString = "";
			for (let row=editor.selection.start.line; row <=editor.selection.end.line; row++)
				textString +=editor.document.lineAt(row).text + LispParser.getEOL(editor.document);
		}

		//get all matcher list
		this.calculateBracketMatchList(textString, ifFullFormat? 0 : editor.selection.start.line);

		//execute format: only handle the selected document
		let newDoc:string = "";
		for(let row = 0; row < editor.document.lineCount; row++){
			if((row >= editor.selection.start.line && row <= editor.selection.end.line) || ifFullFormat){
				let lineInfo =  editor.document.lineAt(row).text;
				let newLineInfo = this.addWhiteSpace(lineInfo, this.calculateSpaceNum(row));
				newDoc += newLineInfo + LispParser.getEOL(editor.document);
			}
		}
		newDoc = newDoc.substring(0, newDoc.length -1);
		this.matcherList = [];
		this.lastSpaceNumTypeCache = new BlackSpaceNum(0, 0, 0, BeginEndType.NoBracket);

		return newDoc;
	}

	//calculate the current document's bracket pair list
	private static calculateBracketMatchList(doc:string, row_current:number){
		let column_current = 0;

		//get all matcher list
		for(let index = 0; index < doc.length; index++){
			let charItem = doc[index];
			let matcher = this.bracketMatcherCache.filterBracket(new SymbolPos(charItem, row_current, column_current));
			if(matcher !== null){
				this.matcherList.push(matcher);
			}

			if(charItem === "\n"){
				row_current++;
				column_current = 0;
				this.ifCommentedLineCache = false;
			}else{
				if(charItem === ";"){
					if(this.judgeIfLineComment(doc, index)){
						this.ifCommentedLineCache = true;
					}
				}else{
					// judge if in BlockComment area
					let blockCommentType = this.judgeBlockCommentStartEnd(doc, index);
					if( blockCommentType === 1){
						//block comment start
						this.ifCommentedBlockCache = true;
					}else if(blockCommentType === 2){
						//block comment end
						this.ifCommentedBlockCache = false;
					}

					// judge if in String area
					let stringAreaType = this.judgeStringAreaStartEnd(doc, index);
					if( stringAreaType === 1){
						this.ifStringAreaCache = true;
					}else if(stringAreaType === 2){
						this.ifStringAreaCache = false;
					}

				}
				column_current++;
			}
		}
		if(this.bracketMatcherCache.tmpMatcherList.length != 0)
			vscode.window.showErrorMessage("Unbalanced token found.");
		this.bracketMatcherCache = new BracketMatcherCache();
		this.ifCommentedLineCache = false;
		this.ifCommentedBlockCache = false;
		this.ifStringAreaCache = false;
		this.isEscapingMode = false;
	}

	//judge if line comment
	private static judgeIfLineComment(doc:string, index:number):boolean{
		let ifLineComment:boolean = false;

		if(!this.ifStringAreaCache 
			&& !this.ifCommentedLineCache 
			&& !this.ifCommentedBlockCache 
			&& (index + 1 !== doc.length && doc[index+1] !== "|") 
			&& (index !== 0 && doc[index - 1] !== "|")){
			ifLineComment = true;
		}

		return ifLineComment;
	}

	// judge if block comment
	// return 0 - not block comment
	//        1 - block comment start
	//        2 - block comment end
	private static judgeBlockCommentStartEnd(doc:string, index:number):number{
		let blockCommentType:number = 0;

		if(doc[index] === "|"){
			if(!this.ifStringAreaCache 
				&& !this.ifCommentedLineCache 
				&& !this.ifCommentedBlockCache 
				&& (index !== 0 && (doc[index-1] === ";" || doc[index - 1] === "#"))){
				blockCommentType = 1;
			}else if(this.ifCommentedBlockCache 
				&& (index + 1 !== doc.length && (doc[index+1] === ";" || doc[index+1] === "#"))){
				blockCommentType = 2;
			}
		}

		return blockCommentType
	}

	// to check if given char is string starter/terminator
	// return 0 - not string starter/terminator
	//        1 - string starting "
	//        2 - string ending  "
	private static judgeStringAreaStartEnd(doc:string, index:number):number{
		let stringAreaType:number = 0;

		if(this.isEscapingMode){
			//last char is '\' inside a plain text string, which is used to escape current
			//letter, so current letter is still inside a string
			this.isEscapingMode = false;
			return stringAreaType;
		}

		if(doc[index] === '"'){
			if(!this.ifCommentedLineCache && !this.ifCommentedBlockCache){
				if(!this.ifStringAreaCache) stringAreaType = 1;
				else stringAreaType = 2;
			}
		}
		else if(doc[index] === '\\'){
			if(this.ifStringAreaCache && (this.isEscapingMode === false)) {
				//it's inside a text string, and current letter is not being escaped,
				//so this '\' means to escape the next letter
				this.isEscapingMode = true;
			}
		}

		return stringAreaType;
	}

	//caculate the final space number at the head of the given row
	// 1. row: the row number of the document, start from zero.
	private static calculateSpaceNum(row:number):BlackSpaceNum{
		let spaceNum = -1;
		let closeSpaceNum = -1;
		let maxOpenSpaceNum = -1;
		let beType = BeginEndType.NoBracket;
		for(let i = 0; i < this.matcherList.length; i++){
			let item = this.matcherList[i];
			if(item.ifStartNewLine && item.startPosSymbol.row === row){
				spaceNum = item.level * 2;
				beType = item.startPosSymbol.row === item.endPosSymbol.row ? BeginEndType.BracketEnd : BeginEndType.BracketBegin;
				break;
			}else if(item.ifEndNewLine && item.endPosSymbol.row === row){
				spaceNum = item.level * 2;
				beType = BeginEndType.BracketEnd;
				break;
			}
		}

		if(beType === BeginEndType.BracketEnd){
			for(let i = 0; i < this.matcherList.length; i++){
				let item = this.matcherList[i];
				if(item.ifStartNewLine && item.endPosSymbol.row === row)
					closeSpaceNum = item.level * 2;
			}
		}else if(beType === BeginEndType.BracketBegin){
			for(let i = 0; i < this.matcherList.length; i++){
				let item = this.matcherList[i];
				if(item.startPosSymbol.row === row && item.endPosSymbol.row !== row){
					maxOpenSpaceNum = item.level * 2 > maxOpenSpaceNum ? item.level * 2 : maxOpenSpaceNum;
				}
			}
		}

		return new BlackSpaceNum(spaceNum, closeSpaceNum, maxOpenSpaceNum, beType);
	}

	//format a single line
	//1. txt: the text of the line
	//2. spaceNum: the space number before the line
	private static addWhiteSpace(txt:string, snType:BlackSpaceNum):string{
		let space_return_cache = "";
		let str_return_cache = "";
		let txt_return = "";
		for(let i = 0; i < snType.spaceNum; i++){
			space_return_cache += " ";
		}

		let started = false;
		let firstStartChar = "";
		let secondStartChar = "";
		for(let i = 0; i < txt.length; i++){
			if(started === false){
				if(txt[i] !== " " && txt[i] !== "\t" ){
					started = true;
					firstStartChar = txt[i];
					secondStartChar = ((i != txt.length - 1) ? txt[i+1] : "");
				}
			}
			if(started){
				str_return_cache += txt[i];
			}
		}

		let ifStartWithBracket = false;
		let ifStartWithSQuoteBracket = false;
		for(let i = 0; i < bracketMap.length; i++){
			if(firstStartChar === bracketMap[i].right || firstStartChar === bracketMap[i].left){
				ifStartWithBracket = true;
				break;
			}
			if(firstStartChar === "'" && secondStartChar === bracketMap[i].left){
				ifStartWithSQuoteBracket = true;
				break;
			}
		}
		if(!ifStartWithBracket){
			//start with '(
			if(ifStartWithSQuoteBracket){
				txt_return = space_return_cache.substr(0, space_return_cache.length - 1) + str_return_cache;
			}else{
				let totalSpaceNum = 0;
				if(this.lastSpaceNumTypeCache.bracketEnd === BeginEndType.BracketEnd){
					totalSpaceNum = this.lastSpaceNumTypeCache.closeSpaceNum;
				}else if(this.lastSpaceNumTypeCache.bracketEnd === BeginEndType.BracketBegin){
					totalSpaceNum = this.lastSpaceNumTypeCache.maxOpenSpaceNum + 2;
				}
				for(let i = 0; i < totalSpaceNum; i++){
					txt_return += " ";
				}
				
				txt_return += str_return_cache;
			}			
		}else{
			//start with (
			txt_return = space_return_cache + str_return_cache;
		}

		if(snType.spaceNum !== -1){
			this.lastSpaceNumTypeCache = snType;
		}
		return txt_return;
	}
}