'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  isRemoteWorkspaceUri,
  isForbiddenWorkspacePath,
  validateWorkspacePath,
  resolveWorkspace
} = require('../src/workspace-resolver');

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-design-test-ws-'));
const wsA = path.join(tmpBase, 'project-alpha');
const wsB = path.join(tmpBase, 'project-beta');
const fakePluginRoot = path.join(tmpBase, 'fake-plugin-root');
fs.mkdirSync(wsA, { recursive: true });
fs.mkdirSync(wsB, { recursive: true });
fs.mkdirSync(fakePluginRoot, { recursive: true });

const realWsA = fs.realpathSync.native ? fs.realpathSync.native(wsA) : fs.realpathSync(wsA);
const realWsB = fs.realpathSync.native ? fs.realpathSync.native(wsB) : fs.realpathSync(wsB);

test('L1 resolves exact active cascadeId workspace from GetAllCascadeTrajectories', async () => {
  const res = await resolveWorkspace({
    cascadeId: 'conv-b',
    rpc: {
      call: async (method) => {
        assert.equal(method, 'GetAllCascadeTrajectories');
        return {
          trajectorySummaries: {
            'conv-a': { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsA}` }] },
            'conv-b': { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsB}` }] }
          }
        };
      }
    }
  });
  assert.equal(res.ok, true);
  assert.equal(res.workspaceRoot, realWsB);
  assert.equal(res.source, 'L1-rpc-cascade');
});

test('L2 resolves explicit DOM path hints when cascadeId is absent', async () => {
  const res = await resolveWorkspace({
    workspaceHints: { domPaths: [`file://${wsA}`] },
    rpc: { call: async () => ({ trajectorySummaries: {} }) }
  });
  assert.equal(res.ok, true);
  assert.equal(res.workspaceRoot, realWsA);
  assert.equal(res.source, 'L2-dom-path');
});

test('L3 matches active conversation title / titlebar name across multiple workspaces', async () => {
  const res = await resolveWorkspace({
    workspaceHints: {
      activeConversationTitle: 'Design Beta Cards',
      workspaceNameHints: ['project-beta']
    },
    rpc: {
      call: async () => ({
        trajectorySummaries: {
          'conv-a': {
            workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsA}` }],
            annotations: { title: 'Alpha Refactor' }
          },
          'conv-b': {
            workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsB}` }],
            annotations: { title: 'Design Beta Cards' }
          }
        }
      })
    }
  });
  assert.equal(res.ok, true);
  assert.equal(res.workspaceRoot, realWsB);
  assert.equal(res.source, 'L3-dom-title');
});

test('L4 falls back to single active workspace, and refuses ambiguous multi-workspace guess (no process.cwd fallback)', async () => {
  const single = await resolveWorkspace({
    rpc: {
      call: async () => ({
        trajectorySummaries: {
          'only-one': { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsA}` }] }
        }
      })
    }
  });
  assert.equal(single.ok, true);
  assert.equal(single.workspaceRoot, realWsA);
  assert.equal(single.source, 'L4-single-active');

  const ambiguous = await resolveWorkspace({
    rpc: {
      call: async () => ({
        trajectorySummaries: {
          'conv-1': { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsA}` }] },
          'conv-2': { workspaces: [{ workspaceFolderAbsoluteUri: `file://${wsB}` }] }
        }
      })
    }
  });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.reason, 'NO_WORKSPACE');
  assert.equal(ambiguous.workspaceRoot, '');
});

test('rejects remote URIs (ssh-remote, vscode-remote, dev-container, wsl+) and missing directories', async () => {
  for (const uri of [
    'vscode-remote://ssh-remote+prod/srv/app',
    'ssh-remote://devbox/home/user/repo',
    'dev-container://attached/app',
    'wsl+Ubuntu/home/dev/app',
    path.join(tmpBase, 'nonexistent-folder')
  ]) {
    if (!uri.startsWith(tmpBase)) {
      assert.equal(isRemoteWorkspaceUri(uri), true, `Expected remote URI: ${uri}`);
    }
    const v = validateWorkspacePath(uri);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'REMOTE_OR_UNMOUNTED');
  }

  const rpcRemote = await resolveWorkspace({
    cascadeId: 'remote-conv',
    rpc: {
      call: async () => ({
        trajectorySummaries: {
          'remote-conv': { workspaces: [{ workspaceFolderAbsoluteUri: 'vscode-remote://ssh-remote+box/workspace' }] }
        }
      })
    }
  });
  assert.equal(rpcRemote.ok, false);
  assert.equal(rpcRemote.reason, 'REMOTE_OR_UNMOUNTED');
});

test('rejects plugin install dir, system roots, home dir, and symlinked plugin paths', () => {
  for (const p of ['/', os.homedir(), '/System', '/Applications', fakePluginRoot]) {
    assert.equal(isForbiddenWorkspacePath(p, { pluginRoot: fakePluginRoot }), true, `Expected forbidden: ${p}`);
  }
  const v = validateWorkspacePath(fakePluginRoot, { pluginRoot: fakePluginRoot });
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'FORBIDDEN_WORKSPACE_PATH');

  const linkToPlugin = path.join(tmpBase, 'symlink-to-plugin');
  fs.symlinkSync(fakePluginRoot, linkToPlugin);
  const vLink = validateWorkspacePath(linkToPlugin, { pluginRoot: fakePluginRoot });
  assert.equal(vLink.ok, false);
  assert.equal(vLink.reason, 'FORBIDDEN_WORKSPACE_PATH');
});

test.after(() => {
  fs.rmSync(tmpBase, { recursive: true, force: true });
});
