import * as vscode from 'vscode';
import { optionButton } from './optionButton';

export class SearchOption {
    static activeInstance:SearchOption = new SearchOption;//the one bound to search UI

    matchCase: boolean = false;
    matchWholeWord: boolean = false;
    useRegularExpr: boolean = false;

    keyword: string;
    completed: boolean = false;
}


export async function getSearchOption(title: string, hint: string) {
    const quickpick = vscode.window.createQuickPick();

    try {
        await new Promise<SearchOption>(resolve => {

            quickpick.title = title;
            quickpick.placeholder = hint;
            quickpick.buttons = optionButton.getButtons();
            quickpick.onDidAccept(async () => {
                SearchOption.activeInstance.keyword = quickpick.value;
                SearchOption.activeInstance.completed = true;
            });

            quickpick.onDidTriggerButton(async e => {
                if (e instanceof optionButton) {
                    let btn = e as optionButton;

                    if (btn.name == optionButton.name_MatchCase) {
                        SearchOption.activeInstance.matchCase = !SearchOption.activeInstance.matchCase;
                        quickpick.buttons = optionButton.getButtons();

                        return;
                    }
                    else if (btn.name == optionButton.name_MatchWord) {
                        SearchOption.activeInstance.matchWholeWord = !SearchOption.activeInstance.matchWholeWord;
                        quickpick.buttons = optionButton.getButtons();

                        return;
                    }
                    else if (btn.name == optionButton.name_UseRegularExpr) {
                        SearchOption.activeInstance.useRegularExpr = !SearchOption.activeInstance.useRegularExpr;
                        quickpick.buttons = optionButton.getButtons();

                        return;
                    }
                }
            });

            quickpick.onDidAccept(async () => {
                SearchOption.activeInstance.completed = true;
                SearchOption.activeInstance.keyword = quickpick.value;

                resolve(SearchOption.activeInstance);
            })

            quickpick.onDidHide(async () => {
                if (SearchOption.activeInstance.completed)
                    return;

                resolve(SearchOption.activeInstance);
            });

            quickpick.show();
        });
    }
    finally {
        quickpick.dispose();
    }

    return Promise.resolve(SearchOption.activeInstance);
}
