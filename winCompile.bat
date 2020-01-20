del extension\out /S /Q /F

call npm run compile

echo copying acadProcessFinder.exe...
copy %CBIN%\acadProcessFinder.exe extension\out\process
