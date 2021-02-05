import { Sexpression } from '../format/sexpression';
import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export class ProjectDefinition {
    static key_name: string = ":NAME";
    static key_own_list: string = ":OWN-LIST";
    static key_fas_dir: string = ":FAS-DIRECTORY";
    static key_tmp_dir: string = ":TMP-DIRECTORY";
    static key_proj_keys: string = ":PROJECT-KEYS";
    static key_cxt_id: string = ":CONTEXT-ID";

    static key_expr_name: string = "VLISP-PROJECT-LIST";

    static standardKeys: string[] = [
        ProjectDefinition.key_name,
        ProjectDefinition.key_own_list,
        ProjectDefinition.key_fas_dir,
        ProjectDefinition.key_tmp_dir,
        ProjectDefinition.key_proj_keys,
        ProjectDefinition.key_cxt_id
    ];

    metaData: object = {};

    public static CreateEmpty(prjName: string): ProjectDefinition {
        if (!prjName)
            return null;

        let ret = new ProjectDefinition();
        ret.metaData[ProjectDefinition.key_name] = prjName;
        ret.metaData[ProjectDefinition.key_own_list] = 'nil';
        ret.metaData[ProjectDefinition.key_fas_dir] = 'nil';
        ret.metaData[ProjectDefinition.key_tmp_dir] = 'nil';
        ret.metaData[ProjectDefinition.key_proj_keys] = '(:BUILD (:standard))';
        ret.metaData[ProjectDefinition.key_cxt_id] = ':AUTOLISP';

        return ret;
    }

    public static Create(prjExpr: Sexpression): ProjectDefinition {
        if (!prjExpr)
            return null;

        let atomNum = prjExpr.atoms.length;
        if (atomNum % 2 != 1) {
            //project expression is something like (VLISP-PROJECT-LIST key1 value1 key2 value2)
            console.log("Malformed project expression.");
            return null;
        }

        if ((prjExpr.atoms[0].isLeftParen() == false) ||
            (prjExpr.atoms[atomNum - 1].isRightParen() == false))
            return null;

        let ret = new ProjectDefinition();

        let pairNum = (atomNum - 1) / 2 - 1;
        for (let i = 0; i < pairNum; i++) {
            let keyIndex = 2 + i * 2;
            let valueIndex = 2 + i * 2 + 1;

            let key = prjExpr.atoms[keyIndex].symbol.toUpperCase();
            let value = prjExpr.atoms[valueIndex].symbol;

            if (prjExpr.atoms[valueIndex] instanceof Sexpression) {
                value = Sexpression.getRawText(prjExpr.atoms[valueIndex] as Sexpression);
            }

            ret.metaData[key] = value;
        }

        return ret;
    }

    public get Name(): string {
        if (!this.metaData.hasOwnProperty(ProjectDefinition.key_name))
            return null;

        return this.metaData[ProjectDefinition.key_name];
    }

    public getProperty(key: string): string {
        if (this.metaData.hasOwnProperty(key))
            return this.metaData[key];

        return "nil";
    }

    public hasProperty(key: string): boolean {
        if (this.metaData.hasOwnProperty(key))
            return true;

        return false;
    }

    public static isStandardProperty(key: string): boolean {
        let upper = key.toUpperCase();

        for (let sKey of ProjectDefinition.standardKeys) {
            if (upper == sKey)
                return true;
        }

        return false;
    }
}
