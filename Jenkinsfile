node {
    imageName = "jcantosz/node-sample"

    serverUrl = "https://192.168.99.100:8443"
    registryURI = "https://registry-1.docker.io"
    registrySecret = "dockerhub"
    def dockerImage
    stage("Check out") {
        def scmData = checkout scm

        if ( scmData.GIT_BRANCH == "develop" ){
          deployEnv = "staging"
        } else if ( scmData.GIT_BRANCH == "master" ){
          deployEnv = "production"
        }
    }

    stage("build"){
        dockerImage = docker.build("${imageName}:${deployEnv}", "--pull .")
    }

    stage("push") {
        docker.withRegistry(registryURI, registrySecret){
            dockerImage.push()
        }
    }

    stage("deploy"){
        withKubeConfig([credentialsId: 'kubernetes-sa',
                serverUrl: serverUrl
                ]) {
            sh """
                helm init --client-only

                helm upgrade \
                  ${deployEnv} \
                  --namespace ${deployEnv} \
                  --install \
                  --values ./helm/values-${deployEnv}.yaml \
                  ./helm
            """
        }
    }
}
