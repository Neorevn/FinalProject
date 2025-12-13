# DevOps Engineering Challenge
## Full-Stack Application with Complete CI/CD Pipeline

---

Build and deploy a full-stack web application with a complete DevOps infrastructure including containerization, CI/CD pipelines, orchestration, infrastructure as code, and monitoring.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    INFRASTRUCTURE                                    │
│                                  (Terraform Managed)                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌──────────────────────────────────────────────────────────────────────────────┐  │
│   │                         KUBERNETES CLUSTER                                    │  │
│   │                                                                               │  │
│   │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │  │
│   │   │    FRONTEND     │    │    BACKEND      │    │    DATABASE     │         │  │
│   │   │    (React/Vue)  │───▶│    (Flask)      │───▶│  (MongoDB)   │         │  │
│   │   │                 │    │                 │    │                 │         │  │
│   │   │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │         │  │
│   │   │  │ Container │  │    │  │ Container │  │    │  │ Container │  │         │  │
│   │   │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │         │  │
│   │   │                 │    │                 │    │                 │         │  │
│   │   │  Deployment     │    │  Deployment     │    │  StatefulSet    │         │  │
│   │   │  Service        │    │  Service        │    │  Service        │         │  │
│   │   │  HPA            │    │  HPA            │    │  PVC            │         │  │
│   │   └─────────────────┘    └─────────────────┘    └─────────────────┘         │  │
│   │                                                                               │  │
│   │   ┌─────────────────────────────────────────────────────────────────────┐   │  │
│   │   │                      MONITORING STACK                                │   │  │
│   │   │                                                                      │   │  │
│   │   │   ┌─────────────────┐         ┌─────────────────┐                   │   │  │
│   │   │   │   PROMETHEUS    │────────▶│    GRAFANA      │                   │   │  │
│   │   │   │                 │         │                 │                   │   │  │
│   │   │   │  - Metrics      │         │  - Dashboards   │                   │   │  │
│   │   │   │  - Alerts       │         │  - Alerts       │                   │   │  │
│   │   │   │  - Scraping     │         │  - Visualize    │                   │   │  │
│   │   │   └─────────────────┘         └─────────────────┘                   │   │  │
│   │   │                                                                      │   │  │
│   │   └─────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                               │  │
│   │   ┌─────────────────┐                                                        │  │
│   │   │ INGRESS CTRL    │  ◀── External Traffic                                  │  │
│   │   │ (nginx/traefik) │                                                        │  │
│   │   └─────────────────┘                                                        │  │
│   │                                                                               │  │
│   └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                        ▲
                                        │
                                        │ Deploy
                                        │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD PIPELINE (Jenkins)                                │
│                                                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│   │  Clone   │───▶│  Build   │───▶│  Test    │───▶│  Push    │───▶│  Deploy  │     │
│   │  Repos   │    │  Images  │    │  Apps    │    │  to Reg  │    │  to K8s  │     │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        ▲
                                        │ Webhook Trigger
                                        │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB REPOSITORIES                                     │
│                                                                                      │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                 │
│   │   FRONTEND      │    │   BACKEND       │    │   DEVOPS        │                 │
│   │   REPO          │    │   REPO          │    │   REPO          │                 │
│   │                 │    │                 │    │                 │                 │
│   │ - React/Vue     │    │ - Flask API     │    │ - Terraform     │                 │
│   │ - Dockerfile    │    │ - Dockerfile    │    │ - K8s manifests │                 │
│   │ - nginx.conf    │    │ - requirements  │    │ - *Jenkinsfile  │                 │
│   │                 │    │ - tests         │    │ - Helm charts   │                 │
│   │                 │    │ - *Jenkinsfil   │    │ - Monitoring    │                 │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘                 │
│                                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

### Repository 1: `frontend-app`

```
frontend-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   │   └── api.js              # API calls to backend
│   ├── App.js
│   └── index.js
├── public/
│   └── index.html
├── tests/
│   └── App.test.js
├── Dockerfile                   # Multi-stage build
├── nginx.conf                   # Production nginx config
├── .dockerignore
├── package.json
├── .env.example
└── README.md
```

### Repository 2: `backend-api`

```
backend-api/
├── app/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py           # Health check endpoints
│   │   └── api.py              # Main API routes
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py           # SQLAlchemy models
│   ├── config.py               # Configuration management
│   └── metrics.py              # Prometheus metrics
├── tests/
│   ├── __init__.py
│   ├── test_health.py
│   └── test_api.py
├── migrations/                 
├── Dockerfile
├── .dockerignore
├── requirements.txt
├── wsgi.py                     
├── .env.example
└── README.md
```

### Repository 3: `devops-infra`

```
devops-infra/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   └── prod/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── terraform.tfvars
│   ├── modules/
│   │   ├── kubernetes/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── networking/
│   │   └── database/
│   └── providers.tf
│
├── kubernetes/
│   ├── namespaces/
│   │   └── namespace.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── configmap.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   ├── configmap.yaml
│   │   └── secret.yaml
│   ├── database/
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   ├── pvc.yaml
│   │   └── secret.yaml
│   ├── ingress/
│   │   └── ingress.yaml
│   └── monitoring/
│       ├── prometheus/
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   ├── configmap.yaml
│       │   └── clusterrole.yaml
│       └── grafana/
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── configmap.yaml
│           └── dashboards/
│               ├── flask-dashboard.json
│               └── kubernetes-dashboard.json
│
├── jenkins/
│   ├── Jenkinsfile              # Main pipeline
│   ├── Jenkinsfile.frontend     # Frontend-specific pipeline
│   ├── Jenkinsfile.backend      # Backend-specific pipeline
│   └── jenkins-config/
│       └── plugins.txt
│
├── helm/                        # (Optional - Bonus Challenge)
│   ├── frontend/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   └── backend/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│
├── scripts/
│   ├── setup.sh
│   ├── deploy.sh
│   └── cleanup.sh
│
└── README.md
```

---

## 📝 Detailed Requirements

### 1. Frontend Application

| Requirement | Details |
|-------------|---------|
| Framework | React.js or Vue.js |
| Features | - Display data from backend API<br>- CRUD operations<br>- Responsive design |
| Dockerfile | Multi-stage build (build → nginx) |
| Health Check | `/health` endpoint via nginx |
| Environment | Configurable API URL via env variables |

**Dockerfile Requirements:**
- Stage 1: Build the application
- Stage 2: Serve with nginx
- Expose port 80
- Use non-root user

---

### 2. Backend Application (Flask)

| Requirement | Details |
|-------------|---------|
| Framework | Flask with Flask-RESTful |
| Database | MongoDB with SQLAlchemy |
| Features | - RESTful API endpoints<br>- CRUD operations<br>- Database migrations |
| Health Endpoints | `/health` - Basic health<br>`/health/ready` - Readiness (DB connected)<br>`/health/live` - Liveness |
| Metrics | Prometheus metrics at `/metrics` |
| WSGI Server | Gunicorn |

**Required Endpoints:**
```
GET    /api/items          # List all items
POST   /api/items          # Create item
GET    /api/items/<id>     # Get single item
PUT    /api/items/<id>     # Update item
DELETE /api/items/<id>     # Delete item
GET    /health             # Health check
GET    /health/ready       # Readiness probe
GET    /health/live        # Liveness probe
GET    /metrics            # Prometheus metrics
```

**Prometheus Metrics to Expose:**
- `http_requests_total` (counter)
- `http_request_duration_seconds` (histogram)
- `http_requests_in_progress` (gauge)
- `db_connections_active` (gauge)

---

### 3. Docker Requirements

#### Frontend Dockerfile
```dockerfile
# Requirements:
# - Multi-stage build
# - Node.js for building
# - Nginx for serving
# - Non-root user
# - Health check instruction
# - Optimized layer caching
```

#### Backend Dockerfile
```dockerfile
# Requirements:
# - Python 3.11+ base image
# - Non-root user
# - Health check instruction
# - Gunicorn as WSGI server
# - Proper signal handling
# - Optimized layer caching
```

---

### 4. Kubernetes Requirements

#### Deployments
| Component | Requirements |
|-----------|--------------|
| Frontend | - Replicas: 2 (min)<br>- Resource limits/requests<br>- Liveness/Readiness probes<br>- Rolling update strategy |
| Backend | - Replicas: 2 (min)<br>- Resource limits/requests<br>- Liveness/Readiness probes<br>- Rolling update strategy<br>- Environment from ConfigMap/Secret |
| Database | - StatefulSet with 1 replica<br>- Persistent Volume Claim<br>- Credentials from Secret |

#### Services
| Component | Type | Port |
|-----------|------|------|
| Frontend | ClusterIP | 80 |
| Backend | ClusterIP | 5000 |
| Database | ClusterIP (Headless) | 5432 |
| Prometheus | ClusterIP | 9090 |
| Grafana | NodePort/LoadBalancer | 3000 |

#### Additional Requirements
- **Ingress Controller**: Route traffic to frontend and backend
- **HPA**: Auto-scale frontend and backend (CPU 70%)
- **ConfigMaps**: Application configuration
- **Secrets**: Database credentials, API keys
- **NetworkPolicies**: (Bonus) Restrict pod communication

---

### 5. Jenkins CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        JENKINS PIPELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ Checkout │──▶│  Build   │──▶│   Test   │──▶│   Scan   │         │
│  │   Code   │   │  Image   │   │   App    │   │  Image   │         │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘         │
│                                                      │               │
│                                                      ▼               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │  Notify  │◀──│  Deploy  │◀──│  Push    │◀──│   Tag    │         │
│  │  Slack   │   │  to K8s  │   │  Image   │   │  Image   │         │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Pipeline Stages:**

| Stage | Description |
|-------|-------------|
| 1. Checkout | Clone all three repositories |
| 2. Build | Build Docker images for frontend and backend |
| 3. Test | Run unit tests for both applications |
| 4. Scan | (Bonus) Security scan with Trivy |
| 5. Tag | Tag images with build number and git SHA |
| 6. Push | Push images to container registry |
| 7. Deploy | Apply Kubernetes manifests |
| 8. Verify | Health check deployed services |
| 9. Notify | (Bonus) Send Slack notification |

**Pipeline Requirements:**
- Triggered by GitHub webhooks
- Separate pipelines for dev/prod environments
- Environment-specific variables
- Rollback capability
- Build artifacts archived

---

### 6. Terraform Requirements

**Infrastructure to Provision:**

| Resource | Details |
|----------|---------|
| Kubernetes Cluster | Managed K8s (EKS/GKE/AKS) or Minikube config |
| VPC/Network | Subnets, security groups |
| Container Registry | ECR/GCR/ACR |
| IAM/Service Accounts | Proper permissions |

**Terraform Requirements:**
- Modular structure
- Remote state (S3/GCS)
- State locking (DynamoDB)
- Workspace support (dev/prod)
- Output values for CI/CD integration

---

### 7. Monitoring Stack

#### Prometheus
| Requirement | Details |
|-------------|---------|
| Targets | Frontend, Backend, Kubernetes nodes |
| Scrape Interval | 15s |
| Retention | 15 days |
| Alerts | - High CPU usage<br>- Pod restarts<br>- API errors<br>- Database connection issues |

#### Grafana
| Requirement | Details |
|-------------|---------|
| Dashboards | - Application metrics<br>- Kubernetes cluster<br>- Database performance |
| Data Sources | Prometheus |
| Alerts | Email/Slack integration |

**Required Dashboards:**
1. **Application Dashboard**
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Active connections

2. **Kubernetes Dashboard**
   - Pod status
   - Resource usage
   - Node health
   - Deployment status

---

## 🎯 Deliverables Checklist

### Required Deliverables

- [ ] **Frontend Repository**
  - [ ] Working React/Vue application
  - [ ] Dockerfile (multi-stage)
  - [ ] Unit tests
  - [ ] README with setup instructions

- [ ] **Backend Repository**
  - [ ] Working Flask API
  - [ ] Dockerfile
  - [ ] Unit tests
  - [ ] Prometheus metrics endpoint
  - [ ] Health check endpoints
  - [ ] README with setup instructions

- [ ] **DevOps Repository**
  - [ ] Terraform configurations
  - [ ] Kubernetes manifests
  - [ ] Jenkinsfile(s)
  - [ ] Prometheus configuration
  - [ ] Grafana dashboards
  - [ ] README with deployment instructions

### Bonus Challenges

- [ ] Helm charts for deployments
- [ ] GitOps with ArgoCD
- [ ] SSL/TLS with cert-manager
- [ ] Network policies
- [ ] Pod security policies
- [ ] Horizontal Pod Autoscaler fine-tuning
- [ ] Database backup strategy
- [ ] Log aggregation (EFK/Loki)
- [ ] Distributed tracing (Jaeger)
- [ ] Service mesh (Istio/Linkerd)

---

## 🔄 Data Flow Diagram

```
                                    EXTERNAL USER
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   LOAD BALANCER     │
                              │   (Ingress)         │
                              └─────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │   /             │  │   /api/*        │  │   /grafana      │
          │   Frontend      │  │   Backend       │  │   Monitoring    │
          └─────────────────┘  └─────────────────┘  └─────────────────┘
                    │                    │                    │
                    │                    ▼                    │
                    │          ┌─────────────────┐            │
                    │          │   MongoDB       │            │
                    │          │   Database      │            │
                    │          └─────────────────┘            │
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │    PROMETHEUS       │
                              │    (Scrapes all     │
                              │     services)       │
                              └─────────────────────┘
```

---

## 📊 Environment Variables

### Frontend
```env
REACT_APP_API_URL=http://backend-service:5000
REACT_APP_ENV=production
```

### Backend
```env
FLASK_ENV=production
DATABASE_URL=postgresql://user:pass@db-service:5432/appdb
SECRET_KEY=your-secret-key
PROMETHEUS_MULTIPROC_DIR=/tmp
```

### Database
```env
MongoDB_USER=appuser
MongoDB_PASSWORD=securepassword
MongoDB_DB=appdb
```

---

## 🚀 Getting Started Commands

```bash
# Clone all repositories
git clone https://github.com/your-org/frontend-app.git
git clone https://github.com/your-org/backend-api.git
git clone https://github.com/your-org/devops-infra.git

# Local development with Docker Compose
cd devops-infra
docker-compose up -d

# Deploy to Kubernetes
kubectl apply -f kubernetes/namespaces/
kubectl apply -f kubernetes/database/
kubectl apply -f kubernetes/backend/
kubectl apply -f kubernetes/frontend/
kubectl apply -f kubernetes/monitoring/
kubectl apply -f kubernetes/ingress/

# Terraform deployment
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

---

## 📚 Evaluation Criteria

| Category | Weight | Criteria |
|----------|--------|----------|
| **Code Quality** | 20% | Clean code, documentation, best practices |
| **Docker** | 15% | Optimized images, security, multi-stage builds |
| **Kubernetes** | 25% | Proper resource management, probes, scaling |
| **CI/CD** | 20% | Complete pipeline, automated testing, deployment |
| **Terraform** | 10% | Modular, reusable, proper state management |
| **Monitoring** | 10% | Metrics, dashboards, alerts |

---

## ⏰ Timeline Suggestion

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | 2-3 days | Frontend + Backend applications working locally |
| Phase 2 | 2 days | Dockerfiles and local testing |
| Phase 3 | 3-4 days | Kubernetes manifests and deployment |
| Phase 4 | 2-3 days | Jenkins pipeline setup |
| Phase 5 | 2 days | Terraform infrastructure |
| Phase 6 | 2 days | Monitoring setup |
| Phase 7 | 1-2 days | Documentation and cleanup |

**Total Estimated Time: 2-3 weeks**

---

## 📞 Questions?

If you have any questions about the requirements, please reach out .

**Good luck!** 🎉