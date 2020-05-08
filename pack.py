import os
import subprocess
import os.path
import shutil
import errno
import shlex
import platform

# init


def init():
    print("===============================================")
    print("             try to install gulp-cli globally")
    os.system("npm install --global gulp-cli") # nosec

    os.system("npm install --unsafe-perm") # nosec

    print("===============================================")
    print("             complete npm install")
    print("===============================================")
    print("\n\n")

    # "build" means to generate i18n content
    os.system("gulp build") # nosec

    print("===============================================")
    print("          complete i18n build")
    print("===============================================")
    print("\n\n")

    copyAcadProcFinder()

    copyRipGrep()

def copyRipGrep():
    #copy exe of vscode-ripgrep into bin folder for both Windows and Mac
    srcWin = os.path.join(os.path.curdir, 'utils', 'vscode-ripgrep', 'ripgrep-v11.0.1-2-x86_64-pc-windows-msvc', 'rg.exe')
    srcOSX = os.path.join(os.path.curdir, 'utils', 'vscode-ripgrep', 'ripgrep-v11.0.1-2-x86_64-apple-darwin', 'rg')
    dst = os.path.join(os.path.curdir, 'node_modules', 'vscode-ripgrep', 'bin')

    removeFile(dst, 'rg.exe')
    removeFile(dst, 'rg')
    copyFile(srcWin, dst, 'copied rg.exe for Windows')
    copyFile(srcOSX, dst, 'copied rg for OS X')


def copyAcadProcFinder():
    src = os.path.join(os.path.curdir, 'utils',
                       'acadProcessFinder', 'bin', 'acadProcessFinder.exe')
    dst = os.path.join(os.path.curdir, 'out', 'process')

    copyFile(src, dst, 'copied acadProcessFinder.exe')


def removeFile(dir, filename):
    filepath = os.path.join(dir, filename)
    if os.path.exists(filepath):
        os.remove(filepath)

def copyFile(src, dst, description):
    try:
        shutil.copy(src, dst)
        print("===============================================")
        print("          " + description)
        print("===============================================")
        print("\n\n")
    except IOError, e:
        print "Unable to copy file. %s" % e

def makepackage_vsix():
    print("===============================================")
    print("start to make vsix package")
    vsce = os.path.join(os.path.curdir, 'node_modules', '.bin', 'vsce')
    output_opt = " -o " + os.path.join(os.path.curdir, 'autolispext.vsix')
    os.system(vsce + " package" + output_opt) # nosec
    if (os.path.exists('autolispext.vsix')):
        print("It created autolispext.vsix file sucessfully")
    else:
        print("It failed to create autolispext.vsix file")
    print("end tp make visx file")
    print("===============================================")

if __name__ == "__main__":
    init()

    print("===============================================")
    print("      generate vsix package start")
    print("===============================================")
    print("\n\n")
    makepackage_vsix()
    print("\n\n")
