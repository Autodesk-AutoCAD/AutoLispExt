class ProductProcessPathPid{
	public path:string;
	public pid:number;
	constructor(pa: string, pi:number){
		this.path = pa;
		this.pid = pi;
	}
}

export class ProcessPathCache{
	public static globalProductPath:string = "";
	public static globalProductProcessPathArr:ProductProcessPathPid[] = []; 
	public static globalParameter:string = "";
	public static globalLispAdapterPath:string="";

	constructor(){
		ProcessPathCache.globalProductPath = "";
		ProcessPathCache.globalProductProcessPathArr = [];
		ProcessPathCache.globalParameter = "";
		ProcessPathCache.globalLispAdapterPath = "";
	}

	public static addGlobalProductProcessPathArr(path:string, pid:number){
		let exist = false;
		ProcessPathCache.globalProductProcessPathArr.forEach(function(item){
			if(item.pid === pid){
				exist = true;
			}
		});
		if(!exist){
			let newPathPid = new ProductProcessPathPid(path, pid);
			ProcessPathCache.globalProductProcessPathArr.push(newPathPid);
		}
	}
	public static clearProductProcessPathArr(){
		ProcessPathCache.globalProductProcessPathArr = [];
	}
	public static chooseProductPathByPid(pid:number){
		ProcessPathCache.globalProductProcessPathArr.forEach(function(item){
			if(item.pid === pid){
				ProcessPathCache.globalProductPath = item.path;
			}
		});
	}
}