# Kubernetes Manifests

This folder contains deployment manifests for local Kubernetes experimentation.

## Secret Handling

Do not commit real credentials in this directory.

Use one of these approaches instead:

1. Create the secret directly with `kubectl`
2. Copy `secret.example.yaml` to an untracked local file such as `secret.local.yaml`
3. Apply your local file manually after replacing the placeholders

Example:

```bash
kubectl -n formflow create secret generic formflow-backend-secrets \
  --from-literal=DATABASE_URL="postgresql://<db-user>:<db-password>@<db-host>:5432/<db-name>?schema=public" \
  --from-literal=REDIS_URL="redis://<redis-host>:6379" \
  --from-literal=JWT_ACCESS_SECRET="<generate-a-long-random-secret>"
```

If a real secret was ever committed to git, rotate it before using it again.
