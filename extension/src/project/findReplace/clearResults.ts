import { SearchTreeProvider, SummaryNode } from './searchTree';
import { SearchOption } from './options';
import * as vscode from 'vscode';
import { AutoLispExt } from '../../extension';

export function clearSearchResults() {
    SearchTreeProvider.instance.clear();
}

export function clearSearchResultWithError(err) {
    try {
        SearchTreeProvider.instance.clear();

        let summary = new SummaryNode();
        summary.summary = err;
        summary.makeTooltip(SearchTreeProvider.instance.lastSearchOption, null);

        SearchTreeProvider.instance.reset(null, summary, SearchTreeProvider.instance.lastSearchOption);
    }
    catch {
        //it's an error handler, let's not fail again
    }
}

let isSearching: boolean = false;

//if it's searching, show a message and return true;
//return false otherwise;
//this method is expected to never throw error, as it will be the first method to call in many use cases
export function getWarnIsSearching(): boolean {
    if (isSearching) {
        let msg = AutoLispExt.localize("autolispext.project.findReplace.clearresults.issearching", "A search is in progress, wait until the current search has completed and try again.");
        vscode.window.showInformationMessage(msg);
        return true;
    }

    return false;
}

//this method is expected to never throw error
export function setIsSearching(val: boolean) {
    isSearching = val;
}

//to set a flag which can stop the searching as soon as possible
export function stopSearching() {
    SearchOption.activeInstance.stopRequested = true;
}