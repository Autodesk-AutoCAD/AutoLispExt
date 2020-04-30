import { LspFileNode, ProjectTreeProvider } from './projectTree';
import { pathEqual } from '../utils';

export async function excludeFromProject(selected: LspFileNode) {
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        return Promise.reject("Please open a project first."); //TBD: localize
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
        return Promise.reject("The file to exclude doesn't belong to current project.");
    }

    ProjectTreeProvider.instance().projectNode.sourceFiles.splice(index2Del, 1);

    ProjectTreeProvider.instance().projectNode.projectModified = true;

    return Promise.resolve();
}