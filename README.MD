# DevOps Final Project: Full-Stack Office Application

<p align="center">
  <img src="https://github.com/user-attachments/assets/b1a86c2b-b383-42e6-895d-7671097311b8" width="400" alt="Officer Logo">
</p>

A complete, production-ready DevOps implementation for a full-stack web application. This project demonstrates Infrastructure as Code (IaC), Containerization, Orchestration, CI/CD, and Monitoring on AWS.

<p align="center">
  <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React">
  <img src="https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white" alt="Flask">
  <img src="https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes">
  <img src="https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS">
  <img src="https://img.shields.io/badge/terraform-%235835CC.svg?style=for-the-badge&logo=terraform&logoColor=white" alt="Terraform">
  <img src="https://img.shields.io/badge/jenkins-%232C5263.svg?style=for-the-badge&logo=jenkins&logoColor=white" alt="Jenkins">
  <img src="https://img.shields.io/badge/HELM-%230F1689.svg?style=for-the-badge&logo=helm&logoColor=white" alt="Helm">
  <img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=Prometheus&logoColor=white" alt="Prometheus">
  <img src="https://img.shields.io/badge/grafana-%23F46800.svg?style=for-the-badge&logo=grafana&logoColor=white" alt="Grafana">
  <img src="https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx">
</p>

##  Application Overview
The **Office Management System** is a 3-tier web application designed to demonstrate a complete DevOps lifecycle. It simulates an internal enterprise tool for managing office resources.

**Key Features:**
*   **Interactive UI**: A React-based frontend for viewing and managing inventory.
*   **REST API**: A Python Flask backend handling business logic and data processing.
*   **Data Persistence**: MongoDB storage for reliable data retention.
*   **Observability**: Built-in health checks and metrics for monitoring system status.

## 🏗️ Architecture & Design
The system follows a microservices-oriented design, decoupling the user interface from the data layer to allow independent scaling and deployment.

*   **Frontend (React.js)**: A Single Page Application (SPA) served via **Nginx**. It consumes the backend API to render dynamic content.
*   **Backend (Flask)**: A lightweight Python API running on **Gunicorn**. It processes requests and interacts with the database.
*   **Database (MongoDB)**: A NoSQL document store deployed as a **StatefulSet** to ensure data persistence across pod restarts.
*   **Infrastructure**: AWS EKS (Elastic Kubernetes Service), VPC, and IAM roles provisioned via **Terraform**.
*   **Orchestration**: Kubernetes manages the container lifecycle, configured via **Helm Charts** and manifests.
*   **CI/CD**: **Jenkins** automates the pipeline: Build -> Test -> Scan -> Push -> Deploy.
*   **Monitoring**: **Prometheus** scrapes metrics from the application, while **Grafana** visualizes system health.

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
*   **`Get password`**: docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
*   **`Go to`** http://localhost:8080, paste password, and install "Suggested plugins". 
*   **`Install`** Extra Plugins:
Manage Jenkins > Plugins > Available: Docker Pipeline, Kubernetes CLI, AWS Credentials. 
*   **`Configure Credentials`**:
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

### 🚀 Automated CI/CD Setup
To set up the automated pipeline with separate jobs for Frontend, Backend, and Deployment:

#### 1. Configure GitHub Webhook
1.  Go to your GitHub Repository > **Settings** > **Webhooks**.
2.  Click **Add webhook**.
3.  **Payload URL**: `http://<YOUR_JENKINS_IP>:8080/github-webhook/` (Ensure the trailing slash is present).
4.  **Content type**: `application/json`.
5.  **Which events?**: Just the `push` event.
6.  Click **Add webhook**.

#### 2. Create Jenkins Jobs
Create 3 separate Pipeline jobs in Jenkins.

**For `office-frontend` and `office-backend`:**
1.  **New Item** > **Pipeline**.
2.  **Build Triggers** > Check **GitHub hook trigger for GITScm polling**.
3.  **Pipeline** > **Definition**: `Pipeline script from SCM`.
4.  **SCM**: `Git` (Enter your Repo URL).
5.  **Script Path**: `devops-infra/jenkins/Jenkinsfile.frontend` (or `.backend`).

**For `office-deploy`:**
1.  **New Item** > **Pipeline**.
2.  **Build Triggers** > **Leave unchecked** (Manual trigger only).
3.  **Pipeline** > **Definition**: `Pipeline script from SCM`.
4.  **SCM**: `Git` (Enter your Repo URL).
5.  **Script Path**: `devops-infra/jenkins/Jenkinsfile.deploy`.

| Job Name | Script Path | Description |
| :--- | :--- | :--- |
| **office-frontend** | `devops-infra/jenkins/Jenkinsfile.frontend` | Builds & Tests Frontend on changes to `frontend-app/` |
| **office-backend** | `devops-infra/jenkins/Jenkinsfile.backend` | Builds & Tests Backend on changes to `backend-api/` |
| **office-deploy** | `devops-infra/jenkins/Jenkinsfile.deploy` | **Manual Job**: Deploys the latest code to EKS. |

#### 3. Important Configuration
*   Edit the `Jenkinsfile.deploy`s and update `DOCKER_HUB_USER` to your username.
*   Ensure Jenkins has the `aws-creds`, `docker-hub-creds`, and `kubeconfig-creds` configured.

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
