import os
import os.path 
import shutil, errno
import platform

# init
def init():
	os.system("npm install --unsafe-perm")

	print("===============================================")
	print("             complete npm install")
	print("===============================================")
	print("\n\n")

	os.system("npm run compile")

	print("===============================================")
	print("          complete npm run compile")
	print("===============================================")
	print("\n\n")

	if platform.system() == "Windows":
		src = os.path.join(os.path.curdir, 'utils', 'acadProcessFinder', 'bin', 'acadProcessFinder.exe')
		dst = os.path.join(os.path.curdir, 'extension', 'out', 'process')
		shutil.copy(src, dst)
		print("===============================================")
		print("          copied acadProcessFinder.exe")
		print("===============================================")
		print("\n\n")

def makepackage_vsix():
	vsce = os.path.join(os.path.curdir, 'node_modules', '.bin', 'vsce')
	output_opt = " -o " + os.path.join(os.path.curdir, 'autolispext.vsix')
	os.system(vsce + " package" + output_opt)


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
