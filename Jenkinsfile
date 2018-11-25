node {
    def imageName = "jcantosz/node-sample"

    def serverUrl = "https://192.168.99.100:8443"
    def registryURI = "https://registry-1.docker.io"
    def vaultURI = "http://vault:8200/v1"
    def clairURI = "http://clair:6060"
    def registrySecret = "dockerhub"

    def dockerImage

    def deployEnv
    def gitCommit

    stage("Check out") {
        def scmData = checkout scm

        gitCommit = scmData.GIT_COMMIT

        if ( scmData.GIT_BRANCH == "develop" ){
          deployEnv = "staging"
        } else if ( scmData.GIT_BRANCH == "master" ){
          deployEnv = "production"
        }
    }

    stage("Build"){
        dockerImage = docker.build("${imageName}:${gitCommit}", "--pull .")
    }

    stage("Test"){
        dockerImage.withRun('--name test --network test'){
            sh "echo \$(curl -sL test:3000)"
            sh "echo \$(curl -sL test:3000/es)"
        }
    }

    stage("Push") {
        docker.withRegistry(registryURI, registrySecret){
            dockerImage.push()
            dockerImage.push(deployEnv)
        }
    }

    stage("Image scan gate (critical and above)"){
        withCredentials([usernamePassword(credentialsId: registrySecret,
                usernameVariable: 'DOCKER_USER',
                passwordVariable: 'DOCKER_PASSWORD'
                )]) {

            // https://github.com/optiopay/klar
            def scanStatus = sh(returnStatus:true, script:"""
                echo "Scan results gate"
                export CLAIR_ADDR=${clairURI}
                export CLAIR_TIMEOUT=10
                export CLAIR_THRESHOLD=0
                export CLAIR_OUTPUT=Critical
                klar ${imageName}:${gitCommit}
            """)

            if(scanStatus != 0){
                currentBuild.result = 'FAILURE'
                error "Docker Image did not pass Clair testing."
            }

        }
    }

    stage("Translate secrets"){
        withCredentials([usernamePassword(credentialsId: 'vault-role',
                usernameVariable: 'ROLE_ID',
                passwordVariable: 'SECRET_ID'
                )]) {

            // For example purposes only -- there are better ways to do this
            sh """
              export TOKEN=\$(curl \\
                  --request POST \\
                  --data "{\\"role_id\\": \\"${ROLE_ID}\\", \\"secret_id\\": \\"${SECRET_ID}\\"}" \\
                  ${vaultURI}/auth/approle/login \\
                  | jq -r '.auth | .client_token')

                # For helm to read from a file, the file must be in helms root
                curl --header "X-Vault-Token: \${TOKEN}" \
                    ${vaultURI}/secret/data/jenkins/${deployEnv} \
                    | jq -r .data.data.foo > helm/secrets.toml
            """
        }
    }
    stage("Deploy"){
        withKubeConfig([credentialsId: 'kubernetes-sa',
                serverUrl: serverUrl
                ]) {
            sh """
                helm init --client-only

                helm upgrade \
                  ${deployEnv} \
                  --namespace ${deployEnv} \
                  --install \
                  --wait \
                  --values ./helm/values-${deployEnv}.yaml \
                  --set image.tag=${gitCommit} \
                  ./helm
            """
        }
    }
    stage("Clean up"){
        sh """
            rm -rf ./*
        """
    }
}
