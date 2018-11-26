# helm-deploy-demo
A demo application and Jenkinsfile for a deployment using helm.

This is demoware. The methodologies should be refined before using this for actual systems.

The Jenkins Pipeline:
1. Builds a docker image
1. Runs tests against that image
1. Pushes that image to a private Docker repository
1. Scans that image for Vulnerabilities using Clair
1. Gathers secrets from Vault
1. Deploys to Kubernetes using Helm

