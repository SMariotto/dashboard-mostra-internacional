// Roda a conferência de ferramentas/conferir-esp32.js dentro do npm test:
// sketches, cabeçalho e docs/API.md contra compartilhado/contrato.js e o servidor.
// Não compila nada (o arduino-cli não está instalado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

test('sketches dos ESP32 e docs/API.md batem com o contrato e com o servidor', () => {
  const r = spawnSync(process.execPath, ['ferramentas/conferir-esp32.js'], { cwd: RAIZ, encoding: 'utf8', timeout: 60_000 });
  const falhas = r.stdout.split('\n').filter((l) => l.includes('FALHOU'));
  assert.equal(r.status, 0, `conferir-esp32.js falhou:\n${falhas.join('\n') || r.stderr}`);
  assert.match(r.stdout, /\d+ conferências, 0 falhas\./);
});
