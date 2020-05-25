import { OpenProjectFile } from './openProject';
import { ProjectTreeProvider } from './projectTree';
import * as vscode from 'vscode';

export function RefreshProject(){
	if (!ProjectTreeProvider.hasProjectOpened()) {
		return;
	}
	let prjFilePath = ProjectTreeProvider.instance().projectNode.projectFilePath;
	let prjNode = OpenProjectFile(vscode.Uri.file(prjFilePath));
	ProjectTreeProvider.instance().updateData(prjNode);
}
