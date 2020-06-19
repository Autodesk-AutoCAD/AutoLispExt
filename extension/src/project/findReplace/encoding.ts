import * as jschardet from "jschardet"
import * as fs from "fs"

//encodings that are listed on jschardet, but proved unsupported by ripgrep:
let unsupportedEncodings = ["EUC-TW", "HZ-GB-2312", "ISO-2022-CN", "ISO-2022-KR", "MacCyrillic", "IBM-855"]

// the caller should make sure the file does exists.
export function detectEncoding(filePath: string): string {
    try {
        let buf = fs.readFileSync(filePath);
        let ret = jschardet.detect(buf);

        // jschardet supports a few encodings, e.g. UTF-32, which are not supported by rg.exe;
        // passing them to rg.exe will cause handled error, which will clean up the search tree;
        // so let's erase the result.
        if(ret && ret.encoding)
        {
            if(ret.encoding.startsWith("UTF-32"))
                return null;

            if(unsupportedEncodings.indexOf(ret.encoding) >= 0)
                return null;
        }

        return ret.encoding;
    }
    catch (err) {
        console.log(err);
    }

    return null;
}