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

    /**
     * Check out the code and determine the branch
    **/
    stage("Check out") {
        def scmData = checkout scm

        gitCommit = scmData.GIT_COMMIT

        if ( scmData.GIT_BRANCH == "develop" ){
          deployEnv = "staging"
        } else if ( scmData.GIT_BRANCH == "master" ){
          deployEnv = "production"
        } else{
          deployEnv = "none"
          error "Building unknown brnach ${scmData.GIT_BRANCH}"
        }
    }

    /**
     * Build the docker image using the git commit as a tag
    **/
    stage("Build"){
        dockerImage = docker.build("${imageName}:${gitCommit}", "--pull .")
    }

    /**
     * Test the image
    **/
    stage("Test"){
        dockerImage.withRun('--name test --network test'){
            sh """
              RES=\$(curl -s -o /dev/null -w "%{http_code}" test:3000)
              if [ "\$RES" != "200" ]; then
                echo "Expecting 200, but got \$RES"
                exit 1
              fi
            """
            sh "echo \$(curl -sL test:3000)"

            sh """
              RES=\$(curl -s -o /dev/null -w "%{http_code}" test:3000/es)
              if [ "\$RES" != "200" ]; then
                echo "Expecting 200, but got \$RES"
                exit 1
              fi
            """
            sh "echo \$(curl -sL test:3000/es)"
        }
    }

    /**
     * Push the image to the registry
    **/
    stage("Push") {
        docker.withRegistry(registryURI, registrySecret){
            dockerImage.push()
            dockerImage.push(deployEnv)
        }
    }

    /**
     * Run image scan with clair (klar uses DOCKER_USER & DOCKER_PASSWORD for private registries)
    **/
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

    /**
     * Pull secrets from Vault into a file for use with Helm
    **/
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

    /**
     * Helm Deploy
    **/
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

    /**
     * Clean Jenkins Workspace
    **/
    stage("Clean up"){
        sh """
            rm -rf ./*
        """
    }
}
