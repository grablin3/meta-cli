# @grablin/cli

**Stop configuring. Start building.**

Scaffold a complete full-stack app with CI/CD, infrastructure-as-code, and deployment pipelines — all wired up and ready to ship. Pick your stack, run one command, push to GitHub, watch it deploy.

## Install

```bash
npm install -g @grablin/cli
```

## Usage

```bash
# Create project config
grablin init

# Generate project
grablin generate --output ./my-project

# Or push directly to GitHub
grablin generate --push-to-github

# List available modules
grablin list

# Check auth status
grablin whoami
```

## Authentication

Set your GitHub token:

```bash
export GITHUB_TOKEN=ghp_xxxx
```

## Documentation

For full documentation, visit [https://grabl.in](https://grabl.in)
