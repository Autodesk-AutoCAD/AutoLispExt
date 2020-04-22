import * as vscode from 'vscode';
import { IconUris } from '../project/icons';
import { SearchOption } from './options';

export class optionButton implements vscode.QuickInputButton {
    private constructor(iconUriOn: vscode.Uri, iconUriOff: vscode.Uri, isOn: boolean,
        tooltip: string, type: string) {
        this.iconPathOn = iconUriOn;
        this.iconPathOff = iconUriOff;

        this.updateStatus(isOn);

        this.tooltip = tooltip;
        this.name = type;
    }

    public iconPath: vscode.Uri = null;
    public tooltip?: string = null;

    public name: string = null;

    private iconPathOn: vscode.Uri = null;
    private iconPathOff: vscode.Uri = null;

    private updateStatus(isOn: boolean): optionButton {
        if (isOn)
            this.iconPath = this.iconPathOn;
        else
            this.iconPath = this.iconPathOff;

        return this;
    }

    public static getButtons() {
        if (!optionButton.matchCaseBtn) {
            optionButton.matchCaseBtn =
                new optionButton(IconUris.matchCase(true), IconUris.matchCase(false), SearchOption.matchCase,
                    'Match Case', //TBD: localize
                    optionButton.name_MatchCase);

            optionButton.matchWordBtn =
                new optionButton(IconUris.matchWord(true), IconUris.matchWord(false), SearchOption.matchWholeWord,
                    'Match Whole Word', //TBD: localize
                    optionButton.name_MatchWord);

            optionButton.useRegularExprBtn =
                new optionButton(IconUris.useRegularExpr(true), IconUris.useRegularExpr(false), SearchOption.useRegularExpr,
                    'Use Regular Expression', //TBD: localize
                    optionButton.name_UseRegularExpr);
        }

        let len = optionButton.buttons.length;
        optionButton.buttons.splice(0, len);

        optionButton.buttons.push(optionButton.matchCaseBtn.updateStatus(SearchOption.matchCase));
        optionButton.buttons.push(optionButton.matchWordBtn.updateStatus(SearchOption.matchWholeWord));
        optionButton.buttons.push(optionButton.useRegularExprBtn.updateStatus(SearchOption.useRegularExpr));

        return optionButton.buttons;
    }

    public static name_MatchCase: string = "matchcase";
    public static name_MatchWord: string = "matchword";
    public static name_UseRegularExpr: string = "useregularexpr";

    private static matchCaseBtn: optionButton = null;
    private static matchWordBtn: optionButton = null;
    private static useRegularExprBtn: optionButton = null;

    private static buttons: vscode.QuickInputButton[] = [];
}
