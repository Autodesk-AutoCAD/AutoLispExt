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
    print("          complete gulp build")
    print("===============================================")
    print("\n\n")

    src = os.path.join(os.path.curdir, 'utils',
                       'acadProcessFinder', 'bin', 'acadProcessFinder.exe')
    dst = os.path.join(os.path.curdir, 'out', 'process')
    try:
        shutil.copy(src, dst)
        print("===============================================")
        print("          copied acadProcessFinder.exe")
        print("===============================================")
        print("\n\n")
    except IOError, e:
        print "Unable to copy file. %s" % e


def makepackage_vsix():
    vsce = os.path.join(os.path.curdir, 'node_modules', '.bin', 'vsce')
    outputpath = os.path.join(os.path.curdir, 'autolispext.vsix')
    subprocess.call([vsce, 'package', '-o', outputpath], shell=True) # nosec


if __name__ == "__main__":
    init()

    print("===============================================")
    print("      generate vsix package start")
    print("===============================================")
    print("\n\n")
    makepackage_vsix()
    print("===============================================")
    print("            congratulations!!")
    print("      generate vsix package completed!!")
    print("===============================================")
    print("\n\n")
