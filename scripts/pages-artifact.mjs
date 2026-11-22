/**
 * Pages uploads may finish before artifact discovery sees the result.
 * Only accept the exact artifact produced by the verified build; never pick
 * an arbitrary artifact from a previous run attempt or retry deployment blindly.
 */
export async function waitForPagesArtifact({
  artifactName,
  artifactId,
  listArtifacts,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  log = () => {},
  delays = [0, 2000, 4000, 8000, 16000, 30000]
}) {
  if (!artifactName || !/^\d+$/.test(String(artifactId || ""))) {
    throw new Error("Missing or invalid Pages artifact outputs from the verify job.");
  }
  for (const [attempt, delay] of delays.entries()) {
    if (delay) await sleep(delay);
    let artifacts;
    try {
      artifacts = await listArtifacts();
    } catch (error) {
      // Retry transient GitHub API failures, not authentication/permission errors.
      if (error.status !== 429 && !(error.status >= 500 && error.status < 600)) throw error;
      if (attempt === delays.length - 1) throw error;
      log(`Artifact lookup returned HTTP ${error.status}; retrying.`);
      continue;
    }
    const matches = artifacts.filter(artifact => artifact.name === artifactName);
    if (matches.length > 1) throw new Error(`Multiple Pages artifacts named "${artifactName}"; refusing an ambiguous deployment.`);
    if (matches.length === 1) {
      const artifact = matches[0];
      if (String(artifact.id) !== String(artifactId)) throw new Error("Pages artifact ID does not match the verified build.");
      if (artifact.expired || !(artifact.size_in_bytes > 0)) throw new Error("Pages artifact is expired or empty; rerun the full workflow.");
      log(`Pages artifact ready: ${artifactName} (ID ${artifactId}).`);
      return artifact;
    }
    log(`Pages artifact "${artifactName}" not visible yet (${attempt + 1}/${delays.length}).`);
  }
  throw new Error(`Pages artifact "${artifactName}" was not discoverable after ${delays.length} attempts. Check the verify upload step and rerun the workflow.`);
}
