import { SearchTreeProvider } from './searchTree';
import { applyReplacement } from './applyReplacement';
import { FindInProject } from './findInProject';
import { ProjectTreeProvider } from '../projectTree';
import { getSearchOption, getString } from './options';

import * as vscode from 'vscode'

export async function replaceInProject() {
    if (ProjectTreeProvider.hasProjectOpened() == false) {
        vscode.window.showInformationMessage("Please open or create a project first"); //TBD: localize
        return;
    }

    //get find options: keyword, match case, etc.
    let opt = await getSearchOption('Replace in Project', 'type keyword, and press ENTER'); //TBD: localize
    if (opt.isKeywordProvided() == false)
        return;

    //get the replacment of given keyword
    let repl = await getString('Replace in Project', 'type replacement, and press ENTER');//TBD: localize
    if (repl == undefined)
        return;

    //get the plan of replace in project
    opt.isReplace = true;
    opt.replacement = repl;
    opt.stopRequested = false;

    let finder = new FindInProject();
    await finder.execute(opt, ProjectTreeProvider.instance().projectNode);

    //execute the planned replacement
    await applyReplacement(finder);

    //update the search tree
    //note that we want to do it even if the user has stopped the request;
    //all matches found before the point of time should be replaced.
    SearchTreeProvider.instance.reset(finder.resultByFile, finder.summaryNode, opt);

}