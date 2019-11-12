#!groovy

@Library('PSL')
import ors.utils.common_scm
import ors.utils.common_shell

// ******* constants *******
def dockerRegistry = 'autodesk-docker.art-bobcat.autodesk.com:10873'
def artifactoryCredsId = 'local-svc_p_ors_art'
def dotnetImageFullName = "$dockerRegistry/autolisp-ext/build:1.0"
echo "Starting build #$BUILD_NUMBER (on '$BRANCH_NAME' branch)."

timestamps {

    node ('cloud&&centos') {

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
                'CI=1'
                ]) {

                stage ('Build') {
                    sh """
                    cd $WORKSPACE
                    npm config set registry https://art-bobcat.autodesk.com/artifactory/api/npm/team-autocad-npm-virtual
                    python pack.py
                    """
                }

                // stage ('Run tests') {
                //     sh "npm run test"
                // }

                stage ('Publish') {
                    //only publish the master branch
                    if (env.BRANCH_NAME == "master")
                    {
                        withCredentials([file(credentialsId: "ACAD_NPM_CONFIG_FILE", variable: 'NPM_CONFIG_FILE')]) {
                            sh """
                            cp -rf $NPM_CONFIG_FILE $WORKSPACE/.npmrc
                            cd $WORKSPACE

                            PACKAGE_VERSION=`node -pe "require('./package.json').version"`
                            BUILD_VERSION="${PACKAGE_VERSION}-${env.BUILD_NUMBER}"
                            echo "Publishing to artifactory, version: ${BUILD_VERSION}"
                            npm version --no-git-tag-version ${BUILD_VERSION}
                            npm publish
                            """
                        }
                    }
                }
            }
        }
    }
}
