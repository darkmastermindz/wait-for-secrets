import * as core from "@actions/core";

export function parseDataFromEnvironment(): string[] {
  const repo = process.env["GITHUB_REPOSITORY"].split("/")[1];
  const owner = process.env["GITHUB_REPOSITORY"].split("/")[0];
  const runId = process.env["GITHUB_RUN_ID"];

  const infoArray: string[] = [owner, repo, runId];

  return infoArray;
}

export function generateSecretURL(owner, repo, runId): string {
  const secretUrl = `https://app.stepsecurity.io/secrets/${owner}/${repo}/${runId}`;
  return secretUrl;
}

export function setSecrets(secrets) {
  secrets.forEach((secret) => {
    core.setOutput(secret.Name, secret.Value);
    core.setSecret(secret.Value);
  });

  console.log("\nSuccessfully set secrets!");
}
