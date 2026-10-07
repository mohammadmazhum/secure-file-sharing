pipeline {
  agent any

  environment {
    REGISTRY   = 'YOUR_DOCKERHUB_USER'          // Docker Hub username
    SERVER_IMG = "${REGISTRY}/secureshare-server"
    CLIENT_IMG = "${REGISTRY}/secureshare-client"
    TAG        = "${env.BUILD_NUMBER}"
  }

  options { timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install & Check') {
      parallel {
        stage('Server') {
          steps {
            dir('server') {
              sh 'npm ci || npm install'
              sh 'find src -name "*.js" -exec node --check {} \\;'   // syntax check (add real tests here)
            }
          }
        }
        stage('Client') {
          steps {
            dir('client') {
              sh 'npm ci || npm install'
              sh 'npm run build'
            }
          }
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        sh "docker build -t ${SERVER_IMG}:${TAG} -t ${SERVER_IMG}:latest ./server"
        sh "docker build -t ${CLIENT_IMG}:${TAG} -t ${CLIENT_IMG}:latest ./client"
      }
    }

    stage('Push Images') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh 'echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin'
          sh "docker push ${SERVER_IMG}:${TAG} && docker push ${SERVER_IMG}:latest"
          sh "docker push ${CLIENT_IMG}:${TAG} && docker push ${CLIENT_IMG}:latest"
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when { branch 'main' }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          sh '''
            sed -i "s|YOUR_DOCKERHUB_USER|${REGISTRY}|g" k8s/*.yaml
            kubectl apply -f k8s/
            kubectl -n secureshare set image deployment/server server=${SERVER_IMG}:${TAG}
            kubectl -n secureshare set image deployment/client client=${CLIENT_IMG}:${TAG}
            kubectl -n secureshare rollout status deployment/server --timeout=120s
            kubectl -n secureshare rollout status deployment/client --timeout=120s
          '''
        }
      }
    }
  }

  post {
    always  { sh 'docker logout || true' }
    success { echo 'Deployed build ${TAG}' }
    failure { echo 'Pipeline failed, check the stage logs above' }
  }
}
