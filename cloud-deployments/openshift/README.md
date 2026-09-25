> [!IMPORTANT]
> This is a community-maintained template and is not officially supported by the Mission LLM team. You could encounter issues or even deployment failures in future versions of Mission LLM. We do our best to keep this template and all community contributions backwards compatible, but we cannot guarantee it.

# OpenShift Deployment Template for Mission LLM

This directory contains a specialized Dockerfile and entrypoint script for deploying Mission LLM on **Red Hat OpenShift** clusters.

## Why This Template Exists

OpenShift has a unique security model that differs from standard Docker/Kubernetes deployments:

1. **Arbitrary UIDs**: OpenShift runs containers with randomly assigned user IDs (UIDs) that don't exist in `/etc/passwd`
2. **GID 0 Requirement**: All containers run with GID 0 (root group) as the primary group
3. **Restricted SCCs**: The default Security Context Constraints (SCCs) prevent containers from running as specific users

These requirements are incompatible with the standard Mission LLM Docker image, which uses a fixed `missionllm` user with UID/GID 1000.

## Key Differences from Standard Dockerfile

| Feature | Standard Docker | OpenShift Template |
|---------|-----------------|-------------------|
| File ownership | `missionllm:missionllm` | `missionllm:0` (root group) |
| File permissions | Standard | Group-writable (`g+w`) |
| `/etc/passwd` | Read-only | Group-writable for UID injection |
| Supplementary groups | None | Added to group 0 |
| Entrypoint | Standard | Handles arbitrary UID scenarios |

## When to Use This Template

Use this template **only** if you are deploying to:
- Red Hat OpenShift (any version)
- OKD (OpenShift Origin)
- Any Kubernetes cluster with OpenShift-style restricted SCCs

**Do NOT use this for:**
- Standard Docker deployments
- Docker Compose
- Generic Kubernetes (use the standard image with appropriate `securityContext`)
- Cloud container services (AWS ECS, Google Cloud Run, Azure Container Instances)

## Building the Image

From the repository root:

```bash
docker build -f cloud-deployments/openshift/Dockerfile -t missionllm:openshift .
```

For multi-architecture builds:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f cloud-deployments/openshift/Dockerfile \
  -t your-registry/missionllm:openshift \
  --push .
```

## Deploying to OpenShift

### Using `oc` CLI

```bash
# Create a new project (namespace)
oc new-project missionllm

# Create a deployment
oc new-app your-registry/missionllm:openshift

# Expose the service
oc expose svc/missionllm --port=3001

# Set required environment variables
oc set env deployment/missionllm \
  STORAGE_DIR=/app/server/storage \
  JWT_SECRET=$(openssl rand -hex 32)
```

### Using a DeploymentConfig YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: missionllm
spec:
  replicas: 1
  selector:
    matchLabels:
      app: missionllm
  template:
    metadata:
      labels:
        app: missionllm
    spec:
      containers:
      - name: missionllm
        image: your-registry/missionllm:openshift
        ports:
        - containerPort: 3001
        env:
        - name: STORAGE_DIR
          value: /app/server/storage
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: missionllm-secrets
              key: jwt-secret
        volumeMounts:
        - name: storage
          mountPath: /app/server/storage
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: missionllm-storage
```

## Persistent Storage

OpenShift PersistentVolumeClaims work with this image. Ensure the PVC is created before deployment:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: missionllm-storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Troubleshooting

### Permission Denied Errors

If you see permission errors, verify:
1. You're using this OpenShift-specific image, not the standard one
2. The PVC has correct access modes
3. No custom SCCs are overriding the default behavior

### User Not Found in passwd

The entrypoint script automatically handles this by injecting a passwd entry at runtime. If issues persist, check that `/etc/passwd` is group-writable in your image.
