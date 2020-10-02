del out /S /Q /F

call npm run compile

echo copying acadProcessFinder.exe...
copy utils\acadProcessFinder\bin\acadProcessFinder.exe out\process
echo copying webHelpAbstraction.json...
copy extension\src\help\webHelpAbstraction.json out\help
