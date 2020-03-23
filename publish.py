import os
import os.path 
import shutil, errno
import platform
import sys

def download_artifactory_vsix():
    if len(sys.argv) < 2:
        sys.exit(2)

    vsixUri = sys.argv[2]

    print("downloading " + vsixUri);

    os.system("curl -k -O " + vsixUri) # nosec

    fileSize = os.path.getsize('autolispext.vsix')

    print ("executed; file size: " + str(fileSize))

    if fileSize < 102400:
        print ("ERROR: file size of autolispext.vsix is too small; the downloading failed.")
        sys.exit(3)

if __name__ == "__main__":
    argLen = len(sys.argv)

    if argLen < 1:
        sys.exit(1)

    print("argv[1] = " + sys.argv[1])

    if sys.argv[1] == "down":
        download_artifactory_vsix()
