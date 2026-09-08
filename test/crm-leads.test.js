const assert = require('node:assert/strict');
const test = require('node:test');
const { getDuplicateMatches } = require('../netlify/functions/crm-leads');

test('identifica registros previos por correo y celular normalizados', () => {
  const leads = getDuplicateMatches([
    { id: 'nuevo', name: 'Ana', email: ' ANA@EXAMPLE.COM ', phone: '0992 933 619', createdAt: '2026-09-08' },
    { id: 'previo', name: 'Ana anterior', email: 'ana@example.com', phone: '0992933619', createdAt: '2026-08-01' },
    { id: 'diferente', name: 'Luis', email: 'luis@example.com', phone: '0987654321', createdAt: '2026-08-02' }
  ]);

  assert.deepEqual(leads[0].duplicateMatches.map(({ id }) => id), ['previo']);
  assert.deepEqual(leads[1].duplicateMatches.map(({ id }) => id), ['nuevo']);
  assert.equal(leads[2].duplicateMatches.length, 0);
});

test('no marca coincidencias cuando falta el identificador', () => {
  const leads = getDuplicateMatches([
    { id: 'uno', name: 'Sin correo', email: '', phone: '' },
    { id: 'dos', name: 'Sin correo', email: '', phone: '' }
  ]);

  assert.equal(leads[0].duplicateMatches.length, 0);
  assert.equal(leads[1].duplicateMatches.length, 0);
});
