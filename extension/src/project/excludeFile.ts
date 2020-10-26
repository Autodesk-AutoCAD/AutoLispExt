import { LspFileNode, ProjectTreeProvider } from './projectTree';
import { pathEqual } from '../utils';
import { AutoLispExt } from '../extension';

export async function excludeFromProject(selected: LspFileNode) {
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        let msg = AutoLispExt.localize("autolispext.project.excludefile.openproject", "A project must be open before you can exclude a file.");
        return Promise.reject(msg);
    }

    let index2Del = -1;
    for (let i = 0; i < ProjectTreeProvider.instance().projectNode.sourceFiles.length; i++) {
        let fileNode = ProjectTreeProvider.instance().projectNode.sourceFiles[i];

        if(pathEqual(selected.filePath, fileNode.filePath, false) == false)
            continue;

        //found it
        index2Del = i;
        break;
    }

    if (index2Del < 0) {
        let msg = AutoLispExt.localize("autolispext.project.excludefile.filenotexist", "File to exclude doesn't exist in the current project.");
        return Promise.reject(msg);
    }

    ProjectTreeProvider.instance().projectNode.sourceFiles.splice(index2Del, 1);

    ProjectTreeProvider.instance().projectNode.projectModified = true;

    return Promise.resolve();
}