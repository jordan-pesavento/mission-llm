# Mission LLM

Mission LLM is Sigmatech's private, self-hosted AI platform. It gives teams one place to chat with their documents, run AI agents, and work with local or cloud language models, while the data stays on infrastructure you control.

- Source: https://gitlab.kuler.dev/kuler/products/mission-llm
- Issues: https://gitlab.kuler.dev/kuler/products/mission-llm/-/issues

## Capabilities

- Workspaces that ingest documents (PDF, DOCX, TXT, and more) and answer with source citations.
- AI agents with tools, a no-code agent flow builder, MCP server support, and scheduled tasks.
- Local and cloud model providers, including llama.cpp-compatible local models, Ollama, LM Studio, OpenAI, Azure OpenAI, AWS Bedrock, Anthropic, Google Gemini, and generic OpenAI-compatible endpoints.
- A built-in embedder and LanceDB vector store by default, with support for PGVector, Qdrant, Milvus, Chroma, Weaviate, Pinecone, and others.
- Multi-user mode with role-based access.
- A developer API for integrations, documented as OpenAPI under `server/swagger`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `server/` | Node.js Express API, Prisma (SQLite by default), and the LLM, embedding, and vector database integrations. Port 3001. |
| `collector/` | Node.js service that parses and processes uploaded documents. Port 8888. |
| `frontend/` | Vite and React web app. Port 3000 in development. |
| `docker/` | Dockerfile, compose file, and the [Docker guide](docker/HOW_TO_USE_DOCKER.md). |
| `cloud-deployments/` | Deployment templates for AWS, GCP, DigitalOcean, Helm, Kubernetes, and others. |
| `extras/` | Supporting tools, such as the translation helper. |
| `scripts/rebrand.mjs` | Re-applies Mission LLM branding after an upstream merge. See [below](#rebranding-after-an-upstream-merge). |
| `embed/`, `browser-extension/` | Git submodules that still point at the upstream repositories. Not needed for local development. |
| `open-computer/` | Experimental upstream agent environment, licensed separately under AGPL-3.0. |

## Local development quickstart

### Prerequisites

- Node.js 18 or newer. Verified on Node 24.
- Yarn classic 1.x. If Yarn refuses to install because of an incompatible engine for your Node version, rerun the install with `--ignore-engines`.
- Git and a Bash-compatible shell for the commands below (Git Bash works on Windows).

### 1. Clone

```bash
git clone https://gitlab.kuler.dev/kuler/products/mission-llm.git
cd mission-llm
```

### 2. Install dependencies

```bash
(cd server && yarn install)
(cd collector && yarn install)
(cd frontend && yarn install)
```

Add `--ignore-engines` to each `yarn install` if Yarn rejects your Node version.

### 3. Create the environment files

```bash
cp server/.env.example server/.env.development
cp collector/.env.example collector/.env
cp frontend/.env.example frontend/.env
```

The server reads `server/.env.development` when it runs in development mode. Edit that file:

- Replace the placeholder values of `JWT_SECRET`, `SIG_KEY`, and `SIG_SALT` with strong random strings. `SIG_KEY` and `SIG_SALT` need at least 32 characters. Generate one value per key with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- Add `DISABLE_TELEMETRY="true"`.

The default `frontend/.env` already points the web app at `http://localhost:3001/api`, and the collector defaults to port 8888.

### 4. Prepare the database

```bash
cd server
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ..
```

This creates the SQLite database at `server/storage/missionllm.db`.

### 5. Run

From the repository root, in three separate terminals:

```bash
yarn dev:server      # API on http://localhost:3001
yarn dev:collector   # document collector on http://localhost:8888
yarn dev:frontend    # web app on http://localhost:3000
```

Open http://localhost:3000 and complete onboarding.

The root `yarn setup` script is inherited from upstream and runs `prisma migrate dev` instead of `prisma migrate deploy`. The manual steps above are the verified path.

## Deployment

- Docker: [docker/HOW_TO_USE_DOCKER.md](docker/HOW_TO_USE_DOCKER.md)
- Without Docker: [BARE_METAL.md](BARE_METAL.md)
- Cloud and Kubernetes templates: [cloud-deployments/](cloud-deployments)

Any instance that other people can reach must have authentication enabled (a password or multi-user mode, both offered during onboarding). Without it, anyone who can reach the URL can use the instance. Set `DISABLE_TELEMETRY="true"` in every server environment.

## Telemetry and outbound connections

The telemetry code is inherited from upstream. When it is enabled, anonymous usage events go to the upstream project's PostHog account, not to Sigmatech. Set `DISABLE_TELEMETRY="true"` to turn it off. No telemetry is sent while the server runs with `NODE_ENV=development`.

With telemetry disabled, an instance can still contact:

- The model, embedding, vector database, and data connector services you configure.
- Hugging Face, to download the built-in embedder and reranker models the first time they are used, with `cdn.anythingllm.com` (the upstream model mirror) as the fallback.
- `raw.githubusercontent.com`, for model context window and pricing data.
- The upstream Community Hub (`hub.anythingllm.com`), only when someone browses or imports items from it.
- `onboarding.anythingllm.com`, only if the optional onboarding survey is filled in and submitted. Leave its fields blank to skip it.

For an air-gapped deployment, pre-stage the models you need under `server/storage/models` and use local providers.

## Documentation

Mission LLM does not have its own documentation site yet. Until it does, the upstream documentation at https://docs.anythingllm.com describes most features, and the in-app help links point there.

Additional guides in this repository:

- [Documents and the collector](server/storage/documents/DOCUMENTS.md)
- [Built-in models](server/storage/models/README.md)

## Rebranding after an upstream merge

Mission LLM periodically merges upstream releases. The upstream remote is only needed by whoever performs the merge:

```bash
git remote add upstream https://github.com/Mintplex-Labs/anything-llm.git
git fetch upstream --tags
git merge <upstream release tag>
```

After the merge is committed, re-apply the branding from a clean working tree:

```bash
node scripts/rebrand.mjs --dry-run   # report what would change, write nothing
node scripts/rebrand.mjs             # apply the replacements and file renames
```

Add `--report <path>` to either command to write a JSON report of every replacement, rename, and protected span.

The script is deterministic and idempotent. It rewrites the upstream naming in every tracked text file and renames tracked files whose paths contain the old name (through `git mv`). It never touches lockfiles, `LICENSE`, `NOTICE`, `TERMS_SELF_HOSTED.md`, `.gitmodules`, `server/prisma/migrations/`, or itself. It leaves URLs, hosts, and repository slugs for services we do not own unchanged, such as the upstream documentation site and GitHub organization.

It also skips any line that contains `rebrand:keep` and any region between `rebrand:keep-start` and `rebrand:keep-end`. These markers protect the upgrade code, which must keep reading pre-rebrand names (database file, env vars, storage keys, vector collections, and similar), and the upstream attribution below.

Review the result before committing:

- In code files the script writes the identifier form `MissionLLM`, even inside user-visible strings. Change user-visible text to "Mission LLM".
- Remove any new upstream promotional links or UI (stars, sponsors, Discord, social links, checkout or upsell links).
- Run `node scripts/rebrand.mjs --dry-run` again and confirm it reports 0 replacements. If the merge added code that must keep a pre-rebrand name (for example a persisted key or a wire protocol value), mark it with `rebrand:keep`.
- Run `yarn lint` and the test suites.

## Contributing and security

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md): report vulnerabilities privately, never in a public issue.

## License

<!-- rebrand:keep-start -->
Mission LLM is based on [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) by Mintplex Labs, used under the MIT License. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Portions Copyright (c) Mintplex Labs Inc.
<!-- rebrand:keep-end -->

The `open-computer/` directory is licensed separately under the GNU AGPL v3. See [open-computer/LICENSE](open-computer/LICENSE).
