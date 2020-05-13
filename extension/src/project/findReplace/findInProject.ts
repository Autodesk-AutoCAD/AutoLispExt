import { SearchOption, getSearchOption } from './options';
import { ProjectNode, ProjectTreeProvider } from '../projectTree';
import { findInFile } from './ripGrep';
import { FileNode, FindingNode, SearchTreeProvider, SummaryNode } from './searchTree';
import { saveUnsavedDoc2Tmp } from '../../utils';

import * as vscode from 'vscode'
import * as os from 'os';
import { applyReplacementInFile } from './applyReplacement';
import { setIsSearching } from './clearResults';

const fs = require('fs-extra')

export async function findInProject() {
    //check if there's a opened project
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        vscode.window.showInformationMessage("Please open or create a project first"); //TBD: localize
        return;
    }

    //get search option
    let opt = await getSearchOption('Find in Project', 'type keyword, and press ENTER'); //TBD: localize
    if (opt.isKeywordProvided() == false)
        return;

    opt.isReplace = false;
    opt.stopRequested = false;

    //find in project
    let finder = new FindInProject();
    await finder.execute(opt, ProjectTreeProvider.instance().projectNode);

    //update the UI
    SearchTreeProvider.instance.reset(finder.resultByFile, finder.summaryNode, opt);
}

export class FindInProject {

    public keyword: string = '';
    public projectName: string = '';
    public resultByFile: FileNode[] = [];
    public summaryNode: SummaryNode = null;

    public async execute(searchOption: SearchOption, prjNode: ProjectNode) {
        if (os.platform() == 'win32') {
            if (os.arch() != 'x64') {
                return Promise.reject('Find & Replace only works on x64 system'); //TBD: localization work
            }
        }

        setIsSearching(true);

        try {
            this.keyword = searchOption.keyword;
            this.projectName = prjNode.projectName;

            this.resultByFile.splice(0, this.resultByFile.length);
            this.summaryNode = new SummaryNode();
            this.summaryNode.makeTooltip(searchOption, prjNode);

            //update the search tree with some progress
            this.summaryNode.summary = 'In progress ... ';//TBD: localization
            SearchTreeProvider.instance.reset(this.resultByFile, this.summaryNode, searchOption);

            if (prjNode.sourceFiles.length <= 0) {
                return Promise.resolve();//there's no source file in this project
            }

            let totalFiles = 0;
            let totalLines = 0;

            let timeStarted = Date.now();

            for (let srcFile of prjNode.sourceFiles) {
                if (SearchOption.activeInstance.stopRequested)
                    break;

                if (fs.existsSync(srcFile.filePath) == false)
                    continue;

                let file2Search = saveUnsavedDoc2Tmp(srcFile.filePath);
                try {
                    let ret = await findInFile(searchOption, file2Search);
                    if (ret.failed || ret.killed || ret.timedOut || (ret.code != 0))
                        return Promise.reject(ret.stderr);

                    if (SearchOption.activeInstance.stopRequested)
                        break; //if user has requested to stop, there's no need to create finding nodes

                    let findings = this.parseResult(ret.stdout, srcFile.filePath);
                    if (findings.length <= 0)
                        continue;

                    let fileNode = new FileNode()
                    fileNode.filePath = srcFile.filePath;
                    fileNode.shortPath = srcFile.getDisplayText();
                    fileNode.findings = findings;

                    this.resultByFile.push(fileNode);

                    if (searchOption.isReplace)
                        await applyReplacementInFile(fileNode);

                    totalFiles++;
                    totalLines += findings.length;

                    let now = Date.now();
                    if (now - timeStarted < 500)
                        continue;//less than 0.5 second since the last UI update

                    //update the search tree with some progress
                    timeStarted = now;

                    this.summaryNode.summary = 'In progress ... ' //TBD: localization
                        + `Found ${totalLines} line(s) in ${totalFiles} file(s):`;//TBD: localization
                    SearchTreeProvider.instance.reset(this.resultByFile, this.summaryNode, searchOption);
                }
                catch (ex) {
                    if (ex.hasOwnProperty('stderr') && (!ex.stderr) && (ex.code == 1) && ex.failed) {
                        continue;//the ripgrep throws exception when nothing is found
                    }

                    throw ex;
                }
                finally {
                    if ((file2Search != srcFile.filePath) && fs.existsSync(file2Search)) {
                        //the file searched is a temp file; remove it;
                        fs.removeSync(file2Search);
                    }
                }
            }

            if (SearchOption.activeInstance.stopRequested)
                this.summaryNode.summary = 'Stopped. '; //TBD: localization
            else
                this.summaryNode.summary = '';

            if (totalLines <= 0) {
                this.summaryNode.summary += 'No results found.' //TBD: localization
            }
            else {
                this.summaryNode.summary += `Found ${totalLines} line(s) in ${totalFiles} file(s):`;//TBD: localization
            }

            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(err);
        }
        finally {
            setIsSearching(false);
        }
    }

    private parseResult(result: string, file: string) {
        let stdout = result.split('\r\n').join('\n');

        let lines = stdout.split('\n');

        let findings: FindingNode[] = [];

        for (let oneLilne of lines) {
            if (oneLilne.length <= 8)
                continue;

            let cells = oneLilne.split(':');
            // cells[0] is drive letter, cells[1] is file path
            // cells[2] is line number, cells[3] is column number by bytes, the rest is text.
            let line = Number(cells[2]);
            let text = cells[4];
            for (let i = 5; i < cells.length; i++) {
                text = text.concat(':');
                text = text.concat(cells[i]);
            }

            //get column by character index instead of byte index
            let colInBytes = Number(cells[3]);
            let col = -1;
            let bytes = 1;
            for (let j = 0; j < text.length; j++) {
                if (bytes == colInBytes) {
                    col = j + 1;
                    break;
                }
                let code = text.charCodeAt(j);
                if (code <= 0x007f) {
                    bytes += 1;
                } else if (code <= 0x07ff) {
                    bytes += 2;
                } else if (code <= 0xffff) {
                    bytes += 3;
                } else {
                    bytes += 4;
                }
            }

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
