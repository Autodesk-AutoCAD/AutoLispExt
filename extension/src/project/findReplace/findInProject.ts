import { SearchOption, getSearchOption } from './options';
import { ProjectNode, ProjectTreeProvider } from '../projectTree';
import { findInFile } from './ripGrep';
import { FileNode, FindingNode, SearchTreeProvider } from './searchTree';
import * as vscode from 'vscode'

const fs = require('fs')

export async function findInProject() {
    //check if there's a opened project
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        vscode.window.showInformationMessage("Please open or create a project first"); //TBD: localize
        return;
    }

    //get search option
    let opt = await getSearchOption('Find in Project', 'type keyword, and press ENTER'); //TBD: localize
    if (opt.completed == false)
        return;

    opt.isReplace = false;

    //find in project
    let finder = new FindInProject();
    await finder.execute(opt, ProjectTreeProvider.instance().projectNode);

    //update the UI
    SearchTreeProvider.instance.reset(finder.resultByFile, opt);
}

export class FindInProject {

    public keyword: string = '';
    public projectName: string = '';
    public resultByFile: FileNode[] = [];

    public async execute(searchOption: SearchOption, prjNode: ProjectNode) {
        try {
            this.keyword = searchOption.keyword;
            this.projectName = prjNode.projectName;

            this.resultByFile.splice(0, this.resultByFile.length);

            if (prjNode.sourceFiles.length <= 0) {
                return Promise.resolve();
            }

            for (let srcFile of prjNode.sourceFiles) {
                if (fs.existsSync(srcFile.filePath) == false)
                    continue;

                try {
                    let ret = await findInFile(searchOption, srcFile.filePath);
                    if (ret.failed || ret.killed || ret.timedOut || (ret.code != 0))
                        return Promise.reject(ret.stderr);

                    let findings = this.parseResult(ret.stdout, srcFile.filePath);
                    if (findings.length <= 0)
                        continue;

                    let fileNode = new FileNode()
                    fileNode.filePath = srcFile.filePath;
                    fileNode.shortPath = srcFile.getDisplayText();
                    fileNode.findings = findings;

                    this.resultByFile.push(fileNode);
                }
                catch (ex) {
                    if (ex.hasOwnProperty('stderr') && (!ex.stderr) && (ex.code == 1) && ex.failed) {
                        continue;//the ripgrep throws exception when nothing is found
                    }

                    throw ex;
                }

            }

            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(err);
        }
    }

    private parseResult(result: string, file: string) {
        let stdout = result.split('\r\n').join('\n');

        let lines = stdout.split('\n');

        let findings: FindingNode[] = [];

        for (let oneLilne of lines) {
            if (oneLilne.length <= 4)
                continue;

            let cells = oneLilne.split(':');
            let line = Number(cells[0]);
            let col = Number(cells[1]);
            let text = cells[2];

            let single = new FindingNode();
            single.line = line;
            single.column = col;
            single.text = text;
            single.filePath = file;

            findings.push(single);
        }

        return findings;
    }

}
