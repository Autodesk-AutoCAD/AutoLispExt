import * as vscode from 'vscode';
import { optionButton } from './optionButton';

export class SearchOption {
    static matchCase: boolean = false;
    static matchWholeWord: boolean = false;
    static useRegularExpr: boolean = false;

    keyword: string;
    completed: boolean = false;
}


export async function getSearchOption(title: string, hint: string) {
    const quickpick = vscode.window.createQuickPick();

    let searchOptInst: SearchOption = new SearchOption();

    try {
        await new Promise<SearchOption>(resolve => {

            quickpick.title = title;
            quickpick.placeholder = hint;
            quickpick.buttons = optionButton.getButtons();
            quickpick.onDidAccept(async () => {
                searchOptInst.keyword = quickpick.value;
                searchOptInst.completed = true;
            });

            quickpick.onDidTriggerButton(async e => {
                if (e instanceof optionButton) {
                    let btn = e as optionButton;

                    if (btn.name == optionButton.name_MatchCase) {
                        SearchOption.matchCase = !SearchOption.matchCase;
                        quickpick.buttons = optionButton.getButtons();

                        return;
                    }
                    else if (btn.name == optionButton.name_MatchWord) {
                        SearchOption.matchWholeWord = !SearchOption.matchWholeWord;
                        quickpick.buttons = optionButton.getButtons();

                        return;
                    }
                    else if (btn.name == optionButton.name_UseRegularExpr) {
                        SearchOption.useRegularExpr = !SearchOption.useRegularExpr;
                        quickpick.buttons = optionButton.getButtons();

                        return;
                    }
                }
            });

            quickpick.onDidAccept(async () => {
                searchOptInst.completed = true;
                searchOptInst.keyword = quickpick.value;

                resolve(searchOptInst);
            })

            quickpick.onDidHide(async () => {
                if (searchOptInst.completed)
                    return;

                resolve(searchOptInst);
            });

            quickpick.show();
        });
    }
    finally {
        quickpick.dispose();
    }

    return Promise.resolve(searchOptInst);
}
