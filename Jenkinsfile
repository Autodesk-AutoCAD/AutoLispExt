#!groovy

@Library('PSL')
import ors.utils.common_scm
import ors.utils.common_shell

properties([
    [
        $class: 'ParametersDefinitionProperty', parameterDefinitions:
        [
            [
                $class      : 'StringParameterDefinition',
                defaultValue: 'https://art-bobcat.autodesk.com:443/artifactory/team-autocad-npm/autolispext/-/autolispext-1.0.10-40.tgz!/package/autolispext.vsix',
                description : 'The Uri of autolispext.vsix on Artifactory',
                name        : 'vsixUri',
                required    : false
            ],
            [
                $class      : 'BooleanParameterDefinition',
                defaultValue: false,
                description : 'Checked to publish to VS Code Market; unchecked to build source code; be careful with this option!',
                name        : 'publish2VsCodeMarket',
                required    : false
            ]
        ]
    ]
])

// ******* constants *******
def dockerRegistry = 'autodesk-docker.art-bobcat.autodesk.com:10873'
def artifactoryCredsId = 'local-svc_p_ors_art'
def dotnetImageFullName = "$dockerRegistry/autolisp-ext/build:2.0"
echo "Starting build #$BUILD_NUMBER (on '$BRANCH_NAME' branch)."

def publish2VsCode() {
    echo "downloading .vsix from Artifactory..."

    downScript = '''
    cd $WORKSPACE
    python publish.py down ${vsixUriOnArtifactory}
    ls -lh
    '''

    sh downScript

    echo "npm install vsce into current folder ..."
    npmScript = '''
    cd $WORKSPACE
    npm config set registry https://art-bobcat.autodesk.com/artifactory/api/npm/team-autocad-npm-virtual
    npm install --prefix . vsce
    '''
    sh npmScript

    echo "publishing autolispext.vsix"

    //running vsce to publish the autolispext.vsix to VS Code market with PAT (the access token)
    //if it successes, end users will see it on VS Code and on the following page:
    //https://marketplace.visualstudio.com/items?itemName=Autodesk.autolispext

    //it only runs on master branch;
    //for other branches, it only prints the publish script to Jenkins Console

    //so if you want to test your change in this stage, don't do it on master branch
    pubScript = '''
    cd $WORKSPACE
    ./node_modules/.bin/vsce publish --packagePath autolispext.vsix -p ${PAT_TOKEN}
    '''

    if(env.BRANCH_NAME == "master") {
        sh pubScript
    }
    else {
        echo "folowing script doesn't run on wip branch:"
        echo pubScript
    }
}

def publish2Artifactory() {
    //only publish the master branch
    if (env.BRANCH_NAME == "master" || env.BRANCH_NAME.startsWith("release"))
    {
        // // sign before publishing
        // withCredentials([string(credentialsId: 'PFX_PWD', variable: 'PFX_PASSWORD'), usernamePassword(credentialsId: 'INTEGRATARTAPI', passwordVariable: 'INTEGRATAPI', usernameVariable: 'INTEGRATUSER')]) {
        //     signScript = '''
        //     cd $WORKSPACE
        //     curl -k -u $INTEGRATUSER:$INTEGRATAPI -O https://art-bobcat.autodesk.com/artifactory/team-engsol-certs-generic/win/2020/autodesk.pfx
        //     ~/.dotnet/tools/OpenVsixSignTool sign --certificate ./autodesk.pfx --password "$PFX_PASSWORD" --timestamp http://timestamp.digicert.com -ta sha256 -fd sha256 ./autolispext.vsix
        //     '''
        //     sh signScript
        // }

        withCredentials([file(credentialsId: "ACAD_NPM_CONFIG_FILE", variable: 'NPM_CONFIG_FILE')]) {
            publishScript = '''
            cp -rf $NPM_CONFIG_FILE $WORKSPACE/.npmrc
            cd $WORKSPACE
            PACKAGE_VERSION=`node -pe "require('./package.json').version"`
            BUILD_VERSION="${PACKAGE_VERSION}-${BUILD_NUMBER}"
            echo "Publishing to artifactory, version: ${BUILD_VERSION}"
            npm version --no-git-tag-version ${BUILD_VERSION}
            npm publish
            '''
            println publishScript
            sh publishScript
        }
    }
}


timestamps {

    node ('cloud&&centos') {

        String vsixUriOnArtifactory = params.vsixUri

        def common_shell = new ors.utils.common_shell(steps, env)

        stage ('Grab sources') {

            def common_scm = new ors.utils.common_scm(steps, env)
            checkout scm
        }

        def dotnetImage
        stage ('Get builder image') {

            def retryCount = 0
            
            // Artifactory is unstable. Retry several times (just in case)
            retry (5) {

                sleep 5 * retryCount * retryCount // 0, 5, 20, 45, 80 seconds
                retryCount++

                docker.withRegistry("https://$dockerRegistry/", artifactoryCredsId) {

                    dotnetImage = docker.image(dotnetImageFullName)
                    dotnetImage.pull()
                }
            }
        }

        dotnetImage.inside("-u root:root") {
            withEnv([
                'CI=1',
                "vsixUriOnArtifactory=${vsixUriOnArtifactory}"
                ]) {

                stage ('Build') {

                    if(!params.publish2VsCodeMarket) {
                        sh """
                        cd $WORKSPACE
                        npm config set registry https://art-bobcat.autodesk.com/artifactory/api/npm/team-autocad-npm-virtual
                        python pack.py
                        ls -lh
                        """
                    }
                }

                // stage ('Run tests') {
                //     sh "npm run test"
                // }

                stage ('Publish') {
                    if(params.publish2VsCodeMarket) {
                        withCredentials(([[$class: 'StringBinding', credentialsId: "PAT_TOKEN", variable: "PAT_TOKEN"]])) {
                            publish2VsCode()
                        }
                    }
                    else {
                        publish2Artifactory()
                    }
                }

            }
        }
        if(!params.publish2VsCodeMarket) {
            stage ('Whitesource check'){
                scan = new ors.security.CommonAppsec(steps, env)
                scan.run_oast_scan(
                    "repo": "AutoLispExt",
                    "branch": env.BRANCH_NAME,
                    "mainline": "master",
                    "team": "AutoCAD",
                    "scan_dir": ["$WORKSPACE/vendor/npm-cache"],
                    "fail_on_oast": "True",
                    "excludes":"lodash*.tgz", //this is used by devDependency. Need to update later when new verison is available.
                    "includes": "*.tgz"
                    )
            }
        }
    }
}
