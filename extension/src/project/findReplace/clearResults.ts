import { SearchTreeProvider } from './searchTree';

export function clearSearchResults() {
	SearchTreeProvider.instance.clear();
}