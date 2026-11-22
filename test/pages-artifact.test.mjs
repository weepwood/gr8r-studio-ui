import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { waitForPagesArtifact } from "../scripts/pages-artifact.mjs";

const artifact = { id: 123, name: "github-pages-100-1", expired: false, size_in_bytes: 1024 };
const options = { artifactName: artifact.name, artifactId: "123", log() {} };

test("Pages waits for artifact visibility, ignoring previous attempts", async () => {
  let calls = 0;
  const sleeps = [];
  const previous = { ...artifact, id: 99, name: "github-pages-100-0" };
  const result = await waitForPagesArtifact({
    ...options,
    listArtifacts: async () => ++calls < 3 ? [previous] : [previous, artifact],
    sleep: async ms => sleeps.push(ms)
  });
  assert.equal(result, artifact);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [2000, 4000]);
});

test("Pages fails after bounded discovery retries", async () => {
  let calls = 0;
  await assert.rejects(waitForPagesArtifact({
    ...options, listArtifacts: async () => { calls++; return []; }, sleep: async () => {}
  }), /not discoverable after 6 attempts/);
  assert.equal(calls, 6);
});

test("Pages refuses ambiguous, stale, expired or empty artifacts", async () => {
  for (const [artifacts, expected] of [
    [[artifact, { ...artifact, id: 456 }], /Multiple Pages artifacts/],
    [[{ ...artifact, id: 456 }], /does not match/],
    [[{ ...artifact, expired: true }], /expired or empty/],
    [[{ ...artifact, size_in_bytes: 0 }], /expired or empty/]
  ]) {
    await assert.rejects(waitForPagesArtifact({ ...options, listArtifacts: async () => artifacts }), expected);
  }
});

test("Pages validates build outputs before requesting artifacts", async () => {
  for (const outputs of [{ artifactName: "" }, { artifactId: "" }, { artifactId: "not-an-id" }]) {
    await assert.rejects(waitForPagesArtifact({
      ...options, ...outputs, listArtifacts: async () => { assert.fail("Should not request artifacts"); }
    }), /Missing or invalid/);
  }
});

test("Pages retries API outages but fails immediately on permission errors", async () => {
  for (const status of [429, 500, 503]) {
    let calls = 0;
    const result = await waitForPagesArtifact({
      ...options, sleep: async () => {},
      listArtifacts: async () => {
        if (++calls === 1) throw Object.assign(new Error("API error"), { status });
        return [artifact];
      }
    });
    assert.equal(result, artifact);
    assert.equal(calls, 2);
  }
  let calls = 0;
  await assert.rejects(waitForPagesArtifact({
    ...options,
    listArtifacts: async () => { calls++; throw Object.assign(new Error("Forbidden"), { status: 403 }); }
  }), /Forbidden/);
  assert.equal(calls, 1);
});

test("workflow packages Pages once and deploys the producer's exact artifact", async () => {
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const [producerAndCheck, pages] = workflow.split("\n  pages:\n");
  const [verify, artifactCheck] = producerAndCheck.split("\n  artifact-check:\n");
  assert.match(verify, /uses: actions\/upload-pages-artifact@v5/);
  assert.match(verify, /name: github-pages-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);
  assert.match(verify, /pages-artifact-id: \$\{\{ steps.pages-artifact.outputs.artifact_id \}\}/);
  assert.doesNotMatch(pages, /upload-pages-artifact|download-artifact/);
  assert.match(pages, /artifact_name: \$\{\{ needs.verify.outputs.pages-artifact-name \}\}/);
  assert.match(pages, /github.ref == 'refs\/heads\/main' && github.event_name != 'pull_request'/);
  assert.match(pages, /group: github-pages\n\s+cancel-in-progress: false/);
  assert.match(artifactCheck, /actions: read/);
  assert.match(artifactCheck, /Wait for the uploaded Pages artifact/);
  assert.match(pages, /needs: \[verify, artifact-check\]/);
  assert.doesNotMatch(artifactCheck, /if:.*pull_request/);
});
