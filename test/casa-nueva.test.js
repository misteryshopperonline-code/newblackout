const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { getPreset } = require('../cotizador/casa-nueva');

test('el cotizador habitual permanece sin cambios si no viene de la campaña', () => {
  assert.equal(getPreset(''), null);
  assert.equal(getPreset('?ambiente=dormitorio'), null);
});
test('los enlaces preparan el tejido y los ambientes elegidos', () => {
  assert.equal(getPreset('?origen=casa-nueva&ambiente=dormitorio').windows[0].product, 'blackout');
  assert.equal(getPreset('?origen=casa-nueva&ambiente=sala').windows[0].product, 'screen');
  assert.equal(getPreset('?origen=casa-nueva&ambiente=casa').windows.length, 2);
});
test('los parámetros desconocidos no inyectan texto ni alteran las plantillas', () => {
  for (const key of ['__proto__', 'constructor', '<script>alert(1)</script>']) {
    assert.equal(getPreset(`?origen=casa-nueva&ambiente=${encodeURIComponent(key)}`).windows[0].product, 'screen');
  }
  const first = getPreset('?origen=casa-nueva&ambiente=casa');
  first.windows[0].width = 99;
  assert.equal(getPreset('?origen=casa-nueva&ambiente=casa').windows[0].width, 2);
});
test('la campaña no anuncia cobros habilitados y enlaza al sitio estático', () => {
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.ok(html.includes('todavía no está habilitado'));
  assert.ok(html.includes('Ya tienes tu casa.'));
  assert.ok(!html.includes('localhost:3000'));
  assert.ok(html.includes('blog/cortinas-casa-nueva-ecuador.html'));
});
