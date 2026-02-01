import inquirer from 'inquirer';

export interface ProjectConfig {
  projectName: string;
  description?: string;
  domain: string;
  owner: string;
  modules: ModuleConfig[];
  environments: string[];
  provider?: string;
  vcs?: string;
}

export interface ModuleConfig {
  kind: 'code' | 'extension' | 'provider' | 'vcs';
  type: string;
  moduleId: string;
  layers?: string[];
  fieldValues?: Record<string, unknown>;
}

const FRONTEND_CHOICES = [
  { name: 'React (Vite + TypeScript)', value: 'react' },
  { name: 'Next.js (Static/SSR)', value: 'nextjs' },
  { name: 'None', value: null },
];

const BACKEND_CHOICES = [
  { name: 'Spring Boot (Java/Kotlin)', value: 'spring' },
  { name: 'Django REST Framework (Python)', value: 'drf' },
  { name: 'None', value: null },
];

const EXTENSION_CHOICES = [
  { name: 'Auth0 (Authentication)', value: 'auth0' },
  { name: 'Okta (Enterprise SSO)', value: 'okta' },
  { name: 'Stytch (Passwordless)', value: 'stytch' },
  { name: 'Stripe (Payments)', value: 'stripe' },
  { name: 'RBAC (Role-based access)', value: 'rbac' },
  { name: 'Redis (Caching)', value: 'redis' },
  { name: 'MemoryDB (In-memory store)', value: 'memorydb' },
  { name: 'RDBMS (PostgreSQL)', value: 'rdbms' },
  { name: 'Rate Limiting', value: 'ratelimit' },
  { name: 'Webhooks (Outbound)', value: 'webhooks' },
  { name: 'Audit Log', value: 'auditlog' },
  { name: 'Teams (Multi-tenancy)', value: 'teams' },
  { name: 'Custom Domain', value: 'customdomain' },
  { name: 'Cloudflare (CDN/DNS)', value: 'cloudflare' },
  { name: 'Route53 (DNS)', value: 'route53' },
  { name: 'Whitelabel', value: 'whitelabel' },
];

const PROVIDER_CHOICES = [
  { name: 'AWS', value: 'aws' },
  { name: 'DigitalOcean', value: 'digitalocean' },
  { name: 'None (local only)', value: null },
];

const VCS_CHOICES = [
  { name: 'GitHub', value: 'github' },
  { name: 'None', value: null },
];

export async function promptForConfig(): Promise<ProjectConfig> {
  const basicAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: 'my-app',
      validate: (input: string) => {
        if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(input)) {
          return 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: '',
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Domain (e.g., myapp.com):',
      validate: (input: string) => {
        if (!/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/.test(input)) {
          return 'Please enter a valid domain (e.g., myapp.com)';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'owner',
      message: 'Owner email:',
      validate: (input: string) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          return 'Please enter a valid email address';
        }
        return true;
      },
    },
  ]);

  const stackAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'frontend',
      message: 'Frontend framework:',
      choices: FRONTEND_CHOICES,
    },
    {
      type: 'list',
      name: 'backend',
      message: 'Backend framework:',
      choices: BACKEND_CHOICES,
    },
    {
      type: 'checkbox',
      name: 'extensions',
      message: 'Extensions:',
      choices: EXTENSION_CHOICES,
    },
  ]);

  const infraAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Cloud provider:',
      choices: PROVIDER_CHOICES,
    },
    {
      type: 'list',
      name: 'vcs',
      message: 'Version control:',
      choices: VCS_CHOICES,
    },
    {
      type: 'input',
      name: 'environments',
      message: 'Environments (comma-separated):',
      default: 'dev, staging, prod',
      filter: (input: string) => input.split(',').map(s => s.trim()).filter(Boolean),
    },
  ]);

  // Build modules array
  const modules: ModuleConfig[] = [];

  if (stackAnswers.frontend) {
    modules.push({
      kind: 'code',
      type: stackAnswers.frontend,
      moduleId: 'frontend',
      layers: ['frontend', 'cicd'],
      fieldValues: {},
    });
  }

  if (stackAnswers.backend) {
    modules.push({
      kind: 'code',
      type: stackAnswers.backend,
      moduleId: 'api',
      layers: ['backend', 'cicd'],
      fieldValues: {},
    });
  }

  // Add extensions
  for (const ext of stackAnswers.extensions) {
    modules.push({
      kind: 'extension',
      type: ext,
      moduleId: ext,
      fieldValues: {},
    });
  }

  // Add provider
  if (infraAnswers.provider) {
    modules.push({
      kind: 'provider',
      type: infraAnswers.provider,
      moduleId: infraAnswers.provider,
      layers: ['ops'],
      fieldValues: {},
    });
  }

  // Add VCS
  if (infraAnswers.vcs) {
    modules.push({
      kind: 'vcs',
      type: infraAnswers.vcs,
      moduleId: infraAnswers.vcs,
      layers: ['cicd'],
      fieldValues: {},
    });
  }

  return {
    projectName: basicAnswers.projectName,
    description: basicAnswers.description || undefined,
    domain: basicAnswers.domain,
    owner: basicAnswers.owner,
    modules,
    environments: infraAnswers.environments,
    provider: infraAnswers.provider,
    vcs: infraAnswers.vcs,
  };
}

export async function confirmOverwrite(path: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `${path} already exists. Overwrite?`,
      default: false,
    },
  ]);
  return confirm;
}
