import { SearchTreeProvider } from './searchTree';
import { FindInProject } from './findInProject';
import { ProjectTreeProvider } from '../projectTree';
import { getSearchOption, getString } from './options';
import * as vscode from 'vscode';
import { AutoLispExt } from '../../extension';

export async function replaceInProject() {
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        let msg = AutoLispExt.localize("autolispext.project.findreplace.replace.openproject", "A project must be open before you can replace a text string.");
        vscode.window.showInformationMessage(msg);
        return;
    }

    //get find options: keyword, match case, etc.
    let title = AutoLispExt.localize("autolispext.project.findreplace.replace.title", "Replace in Project");
    let keywordHint = AutoLispExt.localize("autolispext.project.findreplace.replace.hint.keyword", "Type a text string to find, and press Enter.");
    let opt = await getSearchOption(title, keywordHint);
    if (opt.isKeywordProvided() == false)
        return;

    let replacementHint = AutoLispExt.localize("autolispext.project.findreplace.replace.hint.replacement", "Type a text string to replace with, and press Enter.");
    //get the replacment of given keyword
    let repl = await getString(title, replacementHint);
    if (repl == undefined)
        return;

    //get the plan of replace in project
    opt.isReplace = true;
    opt.replacement = repl;
    opt.stopRequested = false;

    let finder = new FindInProject();
    await finder.execute(opt, ProjectTreeProvider.instance().projectNode);

    //update the search tree
    //note that we want to do it even if the user has stopped the request;
    //all matches found before the point of time should be replaced.
    SearchTreeProvider.instance.reset(finder.resultByFile, finder.summaryNode, opt);

}