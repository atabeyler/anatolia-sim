import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const desktopDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(desktopDir, '..');
const releaseDir = resolve(rootDir, 'release');
const stagingDir = resolve(releaseDir, 'portable-src');
const packedDir = resolve(releaseDir, 'AnatoliaSim-win32-x64');
const zipFile = resolve(releaseDir, 'Anatolia-Sim-Portable-Windows.zip');

function safeRemove(path) {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

function copyPath(src, dest) {
  cpSync(src, dest, { recursive: true, force: true });
}

function ensureParent(path) {
  mkdirSync(path, { recursive: true });
}

function runOrThrow(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'null'}`);
  }
}

safeRemove(stagingDir);
safeRemove(packedDir);
safeRemove(zipFile);

ensureParent(releaseDir);
ensureParent(stagingDir);

copyPath(resolve(rootDir, 'package.json'), resolve(stagingDir, 'package.json'));
copyPath(resolve(rootDir, 'desktop'), resolve(stagingDir, 'desktop'));

ensureParent(resolve(stagingDir, 'client'));
copyPath(resolve(rootDir, 'client', 'dist'), resolve(stagingDir, 'client', 'dist'));

ensureParent(resolve(stagingDir, 'server'));
copyPath(resolve(rootDir, 'server', 'package.json'), resolve(stagingDir, 'server', 'package.json'));
copyPath(resolve(rootDir, 'server', 'package-lock.json'), resolve(stagingDir, 'server', 'package-lock.json'));
copyPath(resolve(rootDir, 'server', 'src'), resolve(stagingDir, 'server', 'src'));
copyPath(resolve(rootDir, 'server', 'node_modules'), resolve(stagingDir, 'server', 'node_modules'));

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const packagerArgs = [
  'electron-packager',
  stagingDir,
  'AnatoliaSim',
  '--platform=win32',
  '--arch=x64',
  '--out=release',
  '--overwrite',
];

const packagerResult = spawnSync(npxCmd, packagerArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});
runOrThrow(packagerResult, 'electron-packager');

const powerShell = process.platform === 'win32' ? 'powershell.exe' : 'powershell';
const zipCommand = `Compress-Archive -Path '${packedDir}\\*' -DestinationPath '${zipFile}' -Force`;
const zipResult = spawnSync(powerShell, ['-NoProfile', '-Command', zipCommand], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});
runOrThrow(zipResult, 'Compress-Archive');

console.log(zipFile);
