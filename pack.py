import os
import os.path 
import shutil, errno
import platform

# init
def init():
	print("===============================================")
	print("             try to install gulp-cli globally")
	os.system("npm install --global gulp-cli")

	os.system("npm install --unsafe-perm")

	print("===============================================")
	print("             complete npm install")
	print("===============================================")
	print("\n\n")

    # "build" means to generate i18n content
	os.system("gulp build")

	print("===============================================")
	print("          complete gulp build")
	print("===============================================")
	print("\n\n")

	src = os.path.join(os.path.curdir, 'utils', 'acadProcessFinder', 'bin', 'acadProcessFinder.exe')
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
	output_opt = " -o " + os.path.join(os.path.curdir, 'autolispext.vsix')
	os.system("gulp package" + output_opt)


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
