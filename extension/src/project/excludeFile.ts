import { LspFileNode, ProjectTreeProvider } from './projectTree';

export async function excludeFromProject(selected: LspFileNode) {
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        return Promise.reject("Please open a project first."); //TBD: localize
    }

    let selectedUpperPath = selected.filePath.toUpperCase();

    let index2Del = -1;
    for (let i = 0; i < ProjectTreeProvider.instance().projectNode.sourceFiles.length; i++) {
        let fileNode = ProjectTreeProvider.instance().projectNode.sourceFiles[i];
        let upperPath = fileNode.filePath.toUpperCase();
        if (upperPath != selectedUpperPath)
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