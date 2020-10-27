import { SearchOption, getSearchOption } from './options';
import { ProjectNode, ProjectTreeProvider } from '../projectTree';
import { findInFile } from './ripGrep';
import { FileNode, FindingNode, SearchTreeProvider, SummaryNode } from './searchTree';
import { saveOpenDoc2Tmp } from '../../utils';
import * as vscode from 'vscode';
import * as os from 'os';
import { applyReplacementInFile } from './applyReplacement';
import { setIsSearching } from './clearResults';
import { AutoLispExt } from '../../extension';
import { detectEncoding } from './encoding';
import * as fs from 'fs-extra';
import * as osLocale from 'os-locale';

const encodings = new Map([["zh-CN", "gb2312"], ["zh-TW", "big5"], ["ja-JP", "shift-jis"], ["ko-KR", "ksc5601"]]);

export async function findInProject() {
    //check if there's a opened project
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        let msg = AutoLispExt.localize("autolispext.project.find.openproject", "A project must be open before you can search for a text string.");
        vscode.window.showInformationMessage(msg);
        return;
    }

    //get search option
    let title = AutoLispExt.localize("autolispext.project.find.title", "Find in Project");
    let hint = AutoLispExt.localize("autolispext.project.find.hint", "Type a text string to find, and press Enter.");
    let opt = await getSearchOption(title, hint);
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

    private timeStarted = undefined;

    public async execute(searchOption: SearchOption, prjNode: ProjectNode) {
        if (os.platform() == 'win32') {
            if (os.arch() != 'x64') {
                let msg = AutoLispExt.localize("autolispext.project.find.supportos", "Find & Replace is supported only on 64-bit systems.");
                return Promise.reject(msg);
            }
        }

        this.timeStarted = Date.now();

        setIsSearching(true);

        try {
            this.keyword = searchOption.keyword;
            this.projectName = prjNode.projectName;

            this.resultByFile.splice(0, this.resultByFile.length);
            this.summaryNode = new SummaryNode();
            // make default tooltip
            this.summaryNode.makeTooltip(searchOption, prjNode);

            //update the search tree with some progress
            let summary = AutoLispExt.localize("autolispext.project.find.inprogress", "In progress... ");
            this.summaryNode.summary = summary;
            SearchTreeProvider.instance.reset(this.resultByFile, this.summaryNode, searchOption);

            let exceedMaxResults = false;
            let totalFiles = 0;
            let totalLines = 0;

            let found = AutoLispExt.localize("autolispext.project.find.found", "Found ");
            let lines = AutoLispExt.localize("autolispext.project.find.results", " result(s) in ");
            let files = AutoLispExt.localize("autolispext.project.find.files", " file(s):");
            for (let srcFile of prjNode.sourceFiles) {
                if (SearchOption.activeInstance.stopRequested)
                    break;

                this.updateProgress(summary, found, lines, files, totalLines, totalFiles, searchOption);

                if (fs.existsSync(srcFile.filePath) == false)
                    continue;

                let file2Search = saveOpenDoc2Tmp(srcFile.filePath);
                try {
                    let encodingName = detectEncoding(file2Search);

                    let ret = null;
                    if (encodingName) {
                        ret = await this.findWithEncoding(searchOption, file2Search, encodingName);
                    }

                    if (!ret) {
                        //try to find with system locale:
                        ret = await this.findWithLocale(searchOption, file2Search);
                    }

                    if (!ret)
                        continue;

                    if (ret.failed || ret.killed || ret.timedOut || (ret.code != 0))
                        return Promise.reject(ret.stderr);

                    if (SearchOption.activeInstance.stopRequested)
                        break; //if user has requested to stop, there's no need to create finding nodes

                    let findings = this.parseResult(ret.stdout, srcFile.filePath);
                    if (findings.length <= 0)
                        continue;

                    if (totalLines + findings.length > 10000) {
                        exceedMaxResults = true;
                        break;
                    }

                    let fileNode = new FileNode()
                    fileNode.filePath = srcFile.filePath;
                    fileNode.shortPath = srcFile.getDisplayText();
                    fileNode.findings = findings;

                    this.resultByFile.push(fileNode);

                    if (searchOption.isReplace)
                        await applyReplacementInFile(fileNode);

                    totalFiles++;
                    totalLines += findings.length;
                } catch (ex) {
                    if (ex.message === "stdout maxBuffer exceeded") {
                        exceedMaxResults = true;
                        break;
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

            if (SearchOption.activeInstance.stopRequested) {
                this.summaryNode.summary = AutoLispExt.localize("autolispext.project.find.stopped", "Find stopped. ");
            } else {
                this.summaryNode.summary = '';
            }

            if (exceedMaxResults) {
                this.summaryNode.summary += AutoLispExt.localize("autolispext.project.find.exceedmaxresults", "Limit of search results exceeded. Refine your search to narrow down the results. ");
            }

            if (totalLines <= 0) {
                if (!exceedMaxResults) {
                    this.summaryNode.summary += AutoLispExt.localize("autolispext.project.find.noresults", "No results found.");
                }
            }
            else {
                this.summaryNode.summary += found + `${totalLines}` + lines + `${totalFiles}` + files;
            }
            // update tooltip after search is done
            this.summaryNode.makeTooltip(searchOption, prjNode);
            return Promise.resolve();
        }
        catch (err) {
            return Promise.reject(err);
        }
        finally {
            setIsSearching(false);
        }
    }

    private updateProgress(summary: string, found: string, lines: string, files: string,
        totalLines: number, totalFiles: number, searchOption: SearchOption) {

        let now = Date.now();
        if (now - this.timeStarted < 500)
            return;//less than 0.5 second since the last UI update

        //update the search tree with some progress
        this.timeStarted = now;

        this.summaryNode.summary = summary
            + found + `${totalLines}` + lines + `${totalFiles}` + files;
        SearchTreeProvider.instance.reset(this.resultByFile, this.summaryNode, searchOption);
    }

    private async findWithEncoding(searchOption: SearchOption, file2Search: string, encoding: string = "utf8") {
        try {
            let ret = await findInFile(searchOption, file2Search, encoding);
            return ret;
        } catch (ex) {
            if (ex.hasOwnProperty('stderr') && (!ex.stderr) && (ex.code == 1) && ex.failed) {
                return null;
            }
            throw ex;
        }
    }

    //for Mac OS, the "system locale" is determined by both of the preferred language + region
    //e.g., to get "zh-CN" from osLocale() on Mac OS, the settings are:
    //  1. preferred language: Simplified Chinese
    //  2. region: China Mainland
    private async findWithLocale(searchOption: SearchOption, file2Search: string) {
        const loc = await osLocale();
        let encoding = encodings.get(loc);

        if (!encoding) {
            encoding = "windows-1252";
        }

        let ret = await this.findWithEncoding(searchOption, file2Search, encoding);
        return ret;
    }

    private parseResult(result: string, file: string) {
        let stdout = result.split('\r\n').join('\n');

        let lines = stdout.split('\n');

        let findings: FindingNode[] = [];

        for (let oneLine of lines) {
            if (!oneLine) {
                console.log("an empty match is not expected.");
                continue;
            }

            //it's [line]:[column]:[text]
            let cells = oneLine.split(':');

            if ((!cells) || (cells.length < 3)) {
                console.log("a match is in unexpected format.");
                continue;
            }

            let line = Number(cells[0]);
            let colInBytes = Number(cells[1]);

            cells.splice(0, 2);
            let text = cells.join(':');//it's possible that the matched line text contains ":"

            //get column by character index instead of byte index
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
