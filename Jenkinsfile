node {
    imageName = "jcantosz/node-sample"

    serverUrl = "https://192.168.99.100:8443"
    registryURI = "https://registry-1.docker.io"
    vaultURI = "http://vault:8200/v1"
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
    stage("scan"){
        // ---------------------------
        // Add clair scanning
        // ---------------------------
    }

    stage("push") {
        docker.withRegistry(registryURI, registrySecret){
            dockerImage.push()
        }
    }

    stage("translate secrets"){
        withCredentials([usernamePassword(credentialsId: 'vault-role',
                usernameVariable: 'ROLE_ID',
                passwordVariable: 'SECRET_ID'
                )]) {

            sh """
              export TOKEN=\$(curl \\
                  --request POST \\
                  --data "{\\"role_id\\": \\"${ROLE_ID}\\", \\"secret_id\\": \\"${SECRET_ID}\\"}" \\
                  ${vaultURI}/auth/approle/login \\
                  | jq -r '.auth | .client_token')

                curl --header "X-Vault-Token: \${TOKEN}" \
                    ${vaultURI}/secret/data/jenkins/production \
                    | jq -r .data.data.foo > helm/secrets.toml
            """
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
    stage("clean up"){
        sh """
            rm -rf ./*
        """
    }
}
