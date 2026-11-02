/* Shared expedition state. Works offline and tolerates unavailable storage. */
(function (root) {
  'use strict';
  const memory = Object.create(null);
  let durableStatus={durable:false,reason:'Storage has not been tested yet'};
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const read = key => {
    try {
      const raw = root.localStorage.getItem(key);
      if (raw !== null) { const value = JSON.parse(raw); memory[key] = value; return value; }
    } catch (_) { /* Private browsing and file URLs can deny storage. */ }
    return memory[key] ?? null;
  };
  const write = (key, value) => {
    const json = JSON.stringify(value);
    try {
      root.localStorage.setItem(key, json);
      if (root.localStorage.getItem(key) !== json) throw Error('Persistent write read-back mismatch');
      memory[key] = value;
      durableStatus = {durable:true,reason:''};
      return true;
    } catch (error) {
      // Keep best-effort in-memory play in restricted file:// origins, but
      // NEVER claim the expedition persisted to disk.
      memory[key] = value;
      durableStatus = {durable:false,reason:String(error?.message||error)};
      return false;
    }
  };
  const initial = () => ({ version: 2, credits: 200, discoveries: [], awards: {}, orbital: {} });
  const SF = {
    storageStatus() {
      try {
        const testKey='starfall-t17-durability',token='proof';
        root.localStorage.setItem(testKey,token);
        if(root.localStorage.getItem(testKey)!==token)throw Error('Storage read-back mismatch');
        root.localStorage.removeItem(testKey);
        durableStatus={durable:true,reason:''};
      } catch (e) { durableStatus={durable:false,reason:String(e?.message||e)}; }
      return {...durableStatus};
    },
    RNG: class {
      constructor(seed) { this.s = (seed | 0) || 1; }
      next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) | 0; return (this.s >>> 0) / 4294967296; }
      range(a, b) { return a + this.next() * (b - a); }
      int(a, b) { return Math.floor(this.range(a, b + 1)); }
      pick(items) { return items[this.int(0, items.length - 1)]; }
      chance(p) { return this.next() < p; }
    },
    hash(text) { let h = 2166136261; for (const char of String(text)) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; },
    load() {
      const saved = read('starfall_save');
      const data = { ...initial(), ...(object(saved) ? saved : {}) };
      data.credits = Number.isFinite(data.credits) ? Math.max(0, data.credits) : 200;
      data.discoveries = Array.isArray(data.discoveries) ? data.discoveries.filter(object) : [];
      data.awards = object(data.awards) ? data.awards : {};
      data.orbital = object(data.orbital) ? data.orbital : {};
      return data;
    },
    save(data) { if(root.__STARFALL_IMPORT_PENDING)return false;return write('starfall_save', { ...this.load(), ...(object(data) ? data : {}), version: 2 }); },
    getCredits() { return this.load().credits; },
    addCredits(amount) {
      const data = this.load();
      data.credits = Math.max(0, data.credits + (Number.isFinite(amount) ? amount : 0));
      this.save(data); return data.credits;
    },
    awardOnce(key, amount) {
      const data = this.load();
      if (!key || Object.prototype.hasOwnProperty.call(data.awards, key) || !Number.isFinite(amount) || amount <= 0) return 0;
      data.awards[key] = Date.now(); data.credits += amount; this.save(data); return amount;
    },
    recordDiscovery(entry) {
      if (!object(entry) || !entry.id || !entry.name) return false;
      const data = this.load();
      if (data.discoveries.some(item => item.id === entry.id)) return false;
      data.discoveries.push({ ...entry, time: Date.now() }); this.save(data); return true;
    },
    setLaunch(data) { return write('starfall_planet', data); },
    getLaunch() {
      const value = read('starfall_planet');
      return object(value) && object(value.planet) && typeof value.planet.name === 'string' ? value : null;
    },
    defaultLaunch() {
      return { planet: { name: 'Kepler-742 b', type: 'Temperate', color: '#6c9278', gravity: '0.8', atmosphere: 'N₂ / O₂', water: 'Moderate', hasLife: true, distance: 1.2, temp: '18 °C' }, system: { name: 'Kepler-742' }, seed: 42 };
    }
  };
  root.SF = SF;
})(globalThis);
