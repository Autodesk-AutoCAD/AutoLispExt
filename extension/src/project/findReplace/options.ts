import * as vscode from 'vscode';
import { optionButton } from './optionButton';
import { IconUris } from '../icons';

export class SearchOption {
    static activeInstance: SearchOption = new SearchOption;//the one bound to search UI

    matchCase: boolean = false;
    matchWholeWord: boolean = false;
    useRegularExpr: boolean = false;

    keyword: string;
    completed: boolean = false;

    isReplace: boolean = false;
    replacement: string = null;

    stopRequested: boolean = false;

    isKeywordProvided(): boolean {
        if (!this.completed)
            return false;

        if (!this.keyword)
            return false;

        return true;
    }
}


export async function getSearchOption(title: string, hint: string) {
    const quickpick = vscode.window.createQuickPick();

    try {
        await new Promise<SearchOption>(resolve => {

            quickpick.title = title;
            quickpick.placeholder = hint;
            quickpick.buttons = optionButton.getButtons();
            quickpick.value = null;
            quickpick.ignoreFocusOut = true;

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
                    else if (btn.name == optionButton.name_Close) {
                        SearchOption.activeInstance.completed = false;
                        quickpick.hide();
                    }
                }
            });

            quickpick.onDidAccept(async () => {
                SearchOption.activeInstance.completed = true;
                SearchOption.activeInstance.keyword = quickpick.value;

                if (quickpick.value)
                    resolve(SearchOption.activeInstance);
            })

            quickpick.onDidHide(async () => {
                if (SearchOption.activeInstance.completed)//it will get here on both ENTER and on ESC
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

export async function getString(title: string, hint: string) {
    const quickpick = vscode.window.createQuickPick();

    let ret = undefined;
    try {
        await new Promise<string>(resolve => {

            quickpick.title = title
            quickpick.placeholder = hint;
            quickpick.value = '';
            quickpick.ignoreFocusOut = true;

            // TODO: do localization latter, now it has no enu\out\project\findReplace\options.i18n.json
            //let closeTooltip = AutoLispExt.localize("autolispext.project.findreplace.optionbutton.close", "Close");
            let closeTooltip = "Close";
            let closeBtn = new optionButton(IconUris.closeUri(), null, true, closeTooltip, optionButton.name_Close);
            quickpick.buttons = [closeBtn];

            quickpick.onDidAccept(async () => {
                ret = quickpick.value;

                resolve(ret);
            });
            quickpick.onDidHide(async () => {
                if (ret != undefined)//it will get here on both ENTER and on ESC
                    return;

                resolve(undefined);
            });

            quickpick.onDidTriggerButton(async e => {
                if (e instanceof optionButton) {
                    let btn = e as optionButton;

                    if (btn.name == optionButton.name_Close) {
                        quickpick.hide();
                    }
                }
            });

            quickpick.show();
        });
    }
    finally {
        quickpick.dispose();
    }

    return ret;
}
