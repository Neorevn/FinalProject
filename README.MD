# DevOps Final Project: Full-Stack Office Application

A complete, production-ready DevOps implementation for a full-stack web application. This project demonstrates Infrastructure as Code (IaC), Containerization, Orchestration, CI/CD, and Monitoring on AWS.

## 🏗️ Architecture

*   **Frontend**: React.js (served via Nginx)
*   **Backend**: Flask API (Gunicorn)
*   **Database**: MongoDB (StatefulSet)
*   **Infrastructure**: AWS EKS, VPC, IAM (Terraform)
*   **Orchestration**: Kubernetes (Helm & Manifests)
*   **CI/CD**: Jenkins (Build, Test, Scan, Push, Deploy)
*   **Monitoring**: Prometheus & Grafana

## 📂 Repository Structure

```
FInalProject/
├── backend-api/       # Flask Application & Dockerfile
├── frontend-app/      # React Application & Dockerfile
├── devops-infra/      # Infrastructure & Deployment Config
│   ├── helm/          # Helm Charts (Frontend & Backend)
│   ├── jenkins/       # CI/CD Pipelines
│   ├── kubernetes/    # K8s Manifests (DB, Monitoring)
│   └── terraform/     # IaC for AWS EKS
└── README.MD          # Documentation
```

## 🚀 Deployment Guide

### Prerequisites
Ensure you have the following tools installed:

*   **Docker Desktop** (Required for running Jenkins locally)
*   **AWS CLI** (Run `aws configure` after installation)
*   **Terraform**
*   **kubectl**
*   **Helm**

**Setup Jenkins:**
```bash
docker run -u root --rm -d -p 8080:8080 -p 50000:50000 -v jenkins-data:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock --name jenkins jenkins/jenkins:lts-jdk17
```
Get password: docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
Go to http://localhost:8080, paste password, and install "Suggested plugins". +3. Install Extra Plugins:
Manage Jenkins > Plugins > Available: Docker Pipeline, Kubernetes CLI, AWS Credentials. +4. Configure Credentials:
Manage Jenkins > Credentials > System > Global credentials > Add Credentials:
   *   **`aws-creds`**: *AWS Credentials* (Access Key ID & Secret Access Key).
   *   **`docker-hub-creds`**: *Username with password* (DockerHub Login).
   *   **`kubeconfig-creds`**: *Secret file* (Upload `~/.kube/config` generated in Step 2).
   *   **`mongo-uri`**: *Secret text* (Value: `mongodb://office-db-0.office-db-headless:27017/officedb`).
   *   **`flask-secret-key`**: *Secret text* (Value: `supersecretkey`).
   *   **`discord-webhook-url`**: *Secret text* (Your Discord Webhook URL).

**Quick Install (Windows):**
```bash
choco install awscli terraform kubernetes-cli kubernetes-helm
```

**Quick Install (macOS via Homebrew):**
```bash
brew install awscli terraform kubectl helm
```


### 1. Provision Infrastructure
Create the VPC and EKS Cluster using Terraform.

```bash
cd devops-infra/terraform/environments/dev
terraform init
terraform apply -auto-approve
```

### 2. Configure kubectl
Connect your local `kubectl` to the new EKS cluster.

```bash
aws eks update-kubeconfig --region us-east-1 --name office-app-dev-cluster
```

### 3. Deploy Dependencies
Deploy the Database and Monitoring stack using raw manifests.

```bash
# Return to root
cd ../../../..

# Deploy MongoDB
kubectl apply -f devops-infra/kubernetes/database/

# Deploy Prometheus & Grafana
kubectl apply -f devops-infra/kubernetes/monitoring/
```

### 4. Deploy Applications (Helm)
Deploy the Frontend and Backend using Helm Charts.

```bash
# Install Backend
helm upgrade --install office-backend ./devops-infra/helm/backend

# Install Frontend
helm upgrade --install office-frontend ./devops-infra/helm/frontend
```

## 🌐 How to Access

### Frontend Application
Get the external LoadBalancer URL:
```bash
kubectl get svc office-frontend
```
*Copy the `EXTERNAL-IP` and paste it into your browser.*

### Monitoring (Grafana)
For security and cost savings, Grafana is not exposed publicly. Access it via port-forwarding:

1.  **Start Port-Forward:**
    ```bash
    kubectl port-forward svc/grafana 3000:80
    ```
2.  **Access:** Open http://localhost:3000
3.  **Credentials:** `admin` / `admin` (skip password change if prompted)

**Note:** If you see "No Data", generate traffic by refreshing the Frontend application a few times.

## 🛠️ CI/CD Pipeline
This project uses Jenkins for automated delivery.
*   **Trigger:** GitHub Webhook
*   **Stages:** Checkout -> Test -> Build -> Scan (Trivy) -> Push (DockerHub) -> Deploy (Helm/K8s) -> Verify -> Notify (Discord)

## 🧹 Cleanup
To avoid AWS charges, destroy resources in this specific order:

1.  **Delete K8s Resources:**
    ```bash
    helm uninstall office-frontend office-backend
    kubectl delete -f devops-infra/kubernetes/monitoring/
    kubectl delete -f devops-infra/kubernetes/database/
    ```

2.  **Destroy Infrastructure:**
    ```bash
    cd devops-infra/terraform/environments/dev
    terraform destroy -auto-approve
    ```