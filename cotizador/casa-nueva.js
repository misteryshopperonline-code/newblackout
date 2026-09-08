(function (root) {
  'use strict';
  const presets = {
    dormitorio: { title: 'Tu descanso empieza aquí.', windows: [{ room: 'Dormitorio principal', product: 'blackout', width: 2, height: 2.2 }] },
    sala: { title: 'Dale tu luz a la sala.', windows: [{ room: 'Sala principal', product: 'screen', width: 2, height: 2.2 }] },
    casa: { title: 'Haz que tu casa se sienta tuya.', windows: [{ room: 'Sala principal', product: 'screen', width: 2, height: 2.2 }, { room: 'Dormitorio principal', product: 'blackout', width: 2, height: 2.2 }] }
  };
  function getPreset(search) {
    const params = new URLSearchParams(search);
    if (params.get('origen') !== 'casa-nueva') return null;
    const key = params.get('ambiente') || 'sala';
    const selected = Object.hasOwn(presets, key) ? presets[key] : presets.sala;
    return { title: selected.title, windows: selected.windows.map(item => ({ ...item })) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { getPreset };
  else root.BlackoutHomeCampaign = { getPreset };
})(typeof window !== 'undefined' ? window : globalThis);
