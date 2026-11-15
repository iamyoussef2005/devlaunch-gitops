# DevLaunch GitOps

This repository holds the desired state for the local demo API. The intended remote is `https://github.com/iamyoussef2005/devlaunch-gitops.git` on branch `main`; it must be created and published before Argo CD can read it. Publication and every push require the owner's approval. This repo includes its own copy of `charts/service-chart`, with no dependencies on the DevLaunch checkout at render time. Update the source chart in DevLaunch first, then copy its files here, review the changes and publish them through Git. Chart copies can drift; compare them when updating.

Terraform owns namespace `devlaunch-apps`, `application-quota`, `container-defaults` and ServiceAccount `devlaunch-app`. Argo CD's `devlaunch-local` project allows this repository to manage only Deployments and Services in that namespace; it cannot create the namespace or manage Terraform resources through this Application. The controller's upstream installation still has broad Kubernetes permissions; the AppProject limits this Application and does not reduce controller RBAC. The Application uses automated sync, self-heal and prune. Removing an Application-managed object from Git can therefore delete it; review changes before pushing.

## Prerequisites

- Start the `devlaunch` kind cluster and Argo CD. Review and obtain approval for the Day 3 Terraform plan, then apply it; verify the namespace and account exist.
- The local image tag `devlaunch-demo-api:1.0.0-d25f3832a5da` refers to the image built for this local test. It is an immutable-by-convention versioned tag, not a registry-enforced digest. Never overwrite it with different content. Load it onto every kind node before deploying; this example uses `imagePullPolicy: Never`. The image must remain available on the host if it must be reloaded. Future registry delivery should use an image digest and appropriate credentials.
- Publish this repository on the stated GitHub account only after approval. A public repo lets Argo CD read it without credentials. For a private repo, configure read-only repository access separately in Argo CD without putting credentials in Git.

After explicitly approving public creation and the initial push, from this repository root the GitHub CLI commands are:

```bash
gh repo create iamyoussef2005/devlaunch-gitops --public
git push -u origin main
```

The first local commit and `origin` URL are already prepared. Confirm the new remote is public and accessible from the cluster before bootstrapping. If the account or repository name changes, update both Application and AppProject source URLs before committing.

## Bootstrap once after publishing

Run from this repository root after reviewing the files and verifying the remote and branch exist:

```bash
kubectl --context kind-devlaunch get namespace devlaunch-apps
kubectl --context kind-devlaunch -n devlaunch-apps get serviceaccount devlaunch-app
kubectl --context kind-devlaunch apply -f applications/project.yaml
kubectl --context kind-devlaunch apply -f applications/demo-api.yaml
kubectl --context kind-devlaunch -n argocd get application demo-api -w
```

This one-time bootstrap creates the AppProject and Application only. Subsequent application changes are made in Git, not through `kubectl apply` or `helm install`. Argo CD renders the chart using the values file within this repository and reconciles the Deployment and Service. No Application finalizer is included: deleting the Application does not automatically cascade-delete its workloads.

## Prove synchronization and self-heal

Once the Application is Synced and Healthy at one replica, request approval, change `replicaCount` to `2` in `environments/local/demo-api-values.yaml`, commit and push to `main`. Wait for the Application to show the new commit and for both pods to become Ready. If a refresh is needed, use `kubectl --context kind-devlaunch -n argocd annotate application demo-api argocd.argoproj.io/refresh=hard --overwrite`; this refreshes Argo CD and does not apply application manifests.

```bash
kubectl --context kind-devlaunch -n argocd get application demo-api -o wide
kubectl --context kind-devlaunch -n devlaunch-apps rollout status deployment/demo-api-demo-api
kubectl --context kind-devlaunch -n devlaunch-apps get pods,services
kubectl --context kind-devlaunch -n devlaunch-apps port-forward --address 127.0.0.1 service/demo-api-demo-api 8080:80
```

In a second terminal, run `curl --fail http://127.0.0.1:8080/health` and `curl --fail http://127.0.0.1:8080/ready`. Stop the port-forward with Ctrl+C. To demonstrate self-healing only after the Git-defined two replicas are healthy, run `kubectl --context kind-devlaunch -n devlaunch-apps scale deployment/demo-api-demo-api --replicas=1`, then watch `kubectl --context kind-devlaunch -n devlaunch-apps get deployment demo-api-demo-api -w`. Argo CD should restore the Git-defined count of two. Do not scale Terraform-owned resources.

## Troubleshooting

If Argo CD cannot fetch the repository, confirm the remote URL, `main` branch, network access and repository visibility or read-only credentials. If the Application is OutOfSync or Degraded, inspect `kubectl --context kind-devlaunch -n argocd describe application demo-api`; verify AppProject source, destination and resource restrictions, and that the values path resolves within this repo. If pods are pending or images fail, check the Terraform namespace and quota, account, `kubectl describe pod`, and the image tag on the kind node. A `Never` pull policy requires the exact image to be loaded before scheduling. Consult the DevLaunch Argo CD troubleshooting guide for controller health.
