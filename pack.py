import os
import os.path 
import shutil, errno


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

def makepackage_vsix():
	vsce = os.path.join(os.path.curdir, 'node_modules', '.bin', 'vsce')
	os.system(vsce + " package")


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
