import * as vscode from 'vscode';
import { IconUris } from '../icons';
import { SearchOption } from './options';
import { AutoLispExt } from '../../extension';

export class optionButton implements vscode.QuickInputButton {
    public constructor(iconUriOn: vscode.Uri, iconUriOff: vscode.Uri, isOn: boolean,
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
            let matchCase = AutoLispExt.localize("autolispext.project.findreplace.optionbutton.matchcase", "Match Case");
            optionButton.matchCaseBtn =
                new optionButton(IconUris.matchCase(true), IconUris.matchCase(false), SearchOption.activeInstance.matchCase,
                    matchCase,
                    optionButton.name_MatchCase);

            let matchWholeWord = AutoLispExt.localize("autolispext.project.findreplace.optionbutton.matchwholeword", "Match Whole Word");
            optionButton.matchWordBtn =
                new optionButton(IconUris.matchWord(true), IconUris.matchWord(false), SearchOption.activeInstance.matchWholeWord,
                    matchWholeWord,
                    optionButton.name_MatchWord);

            let regExp = AutoLispExt.localize("autolispext.project.findreplace.optionbutton.regexp", "Use Regular Expression");
            optionButton.useRegularExprBtn =
                new optionButton(IconUris.useRegularExpr(true), IconUris.useRegularExpr(false), SearchOption.activeInstance.useRegularExpr,
                    regExp,
                    optionButton.name_UseRegularExpr);

            let closeTooltip = AutoLispExt.localize("autolispext.project.findreplace.optionbutton.close", "Close");
            optionButton.closeBtn = new optionButton(IconUris.closeUri(), null, true, closeTooltip, optionButton.name_Close);
        }

        let len = optionButton.buttons.length;
        optionButton.buttons.splice(0, len);

        optionButton.buttons.push(optionButton.matchCaseBtn.updateStatus(SearchOption.activeInstance.matchCase));
        optionButton.buttons.push(optionButton.matchWordBtn.updateStatus(SearchOption.activeInstance.matchWholeWord));
        optionButton.buttons.push(optionButton.useRegularExprBtn.updateStatus(SearchOption.activeInstance.useRegularExpr));
        optionButton.buttons.push(optionButton.closeBtn.updateStatus(true));

        return optionButton.buttons;
    }

    public static name_MatchCase: string = "matchcase";
    public static name_MatchWord: string = "matchword";
    public static name_UseRegularExpr: string = "useregularexpr";
    public static name_Close: string = "close";

    private static matchCaseBtn: optionButton = null;
    private static matchWordBtn: optionButton = null;
    private static useRegularExprBtn: optionButton = null;
    private static closeBtn: optionButton = null;

    private static buttons: vscode.QuickInputButton[] = [];
}
