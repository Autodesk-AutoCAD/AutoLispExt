import { SearchTreeProvider, SummaryNode } from './searchTree';
import { SearchOption } from './options';

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

export function stopSearching() {
    SearchOption.activeInstance.stopRequested = true;
}