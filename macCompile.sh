#!/bin/sh

echo ""
echo "********************************************************************"
echo "NOTE: there's no need of this shell for Jenkins; it's dev env only."

rgPath="./node_modules/vscode-ripgrep/bin/rg"
rgAppPath="./node_modules/vscode-ripgrep/bin/rg.app"

if [ -f "$rgPath" ]; then
    echo "removing rg ..."
	rm "$rgPath"
fi

if [ -f "$rgAppPath" ]; then
	echo "removing rg.app ..."
	rm "$rgAppPath"
fi

echo "copying rg.app from  utils to target folder ..."
cp ./utils/vscode-ripgrep/ripgrep-v11.0.1-2-x86_64-apple-darwin/rg.app ./node_modules/vscode-ripgrep/bin

echo ""
echo "removing out ..."
rm -rf out

echo ""
echo "start to compile AutoLispExt ..."
npm run compile

echo "done."
echo "********************************************************************"
echo ""