/* Skill 字典 — IndexedDB 儲存層
 * 第一次載入時把 data/skills.js 的種子資料寫進 IndexedDB；
 * 之後從 IndexedDB 讀取與查詢。DATA_VERSION 變動時自動重新匯入。
 * 若瀏覽器不支援 IndexedDB（如某些無痕模式），自動退回直接用 window.SKILLS。
 */
window.SkillDB = (function () {
  "use strict";
  var DB_NAME = "skill-dict";
  var DB_VERSION = 2;
  var STORE = "skills";
  var META = "meta";
  var BL = "blacklist";

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!("indexedDB" in window) || !window.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: "id" });
          os.createIndex("official", "official", { unique: false });
          os.createIndex("tags", "tags", { unique: false, multiEntry: true });
          os.createIndex("vendor", "vendor", { unique: false });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(BL)) {
          db.createObjectStore(BL, { keyPath: "pattern" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(db, store, mode) {
    return db.transaction(store, mode).objectStore(store);
  }
  function reqP(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }
  function txDone(transaction) {
    return new Promise(function (resolve, reject) {
      transaction.oncomplete = function () { resolve(); };
      transaction.onabort = transaction.onerror = function () { reject(transaction.error); };
    });
  }

  // 比對種子版本，必要時清空並重新寫入
  function seedIfNeeded(db) {
    return reqP(tx(db, META, "readonly").get("dataVersion")).then(function (rec) {
      var seedVer = window.DATA_VERSION || "0";
      if (rec && rec.value === seedVer) return; // 已是最新，不需重灌

      var t = db.transaction([STORE, META], "readwrite");
      var skillStore = t.objectStore(STORE);
      var metaStore = t.objectStore(META);
      skillStore.clear();
      (window.SKILLS || []).forEach(function (s) { skillStore.put(s); });
      metaStore.put({ key: "dataVersion", value: seedVer });
      metaStore.put({ key: "tags", value: window.TAGS || {} });
      metaStore.put({ key: "seededAt", value: new Date().toISOString() });
      return txDone(t);
    });
  }

  // 黑名單只在「首次（store 為空且尚未種子過此版本）」匯入預設值，
  // 之後尊重使用者的增刪改，不自動覆蓋。
  function seedBlacklistIfNeeded(db) {
    return reqP(tx(db, META, "readonly").get("blacklistSeeded")).then(function (rec) {
      var seedVer = window.BLACKLIST_VERSION || "0";
      if (rec && rec.value) return; // 已種子過 -> 保留使用者的內容
      var t = db.transaction([BL, META], "readwrite");
      var blStore = t.objectStore(BL);
      (window.BLACKLIST || []).forEach(function (e) { blStore.put(e); });
      t.objectStore(META).put({ key: "blacklistSeeded", value: seedVer });
      return txDone(t);
    });
  }

  var _db = null;
  var _fallback = false;
  var _memBlacklist = null; // 記憶體模式用

  function init() {
    return openDB().then(function (db) {
      _db = db;
      return seedIfNeeded(db).then(function () { return seedBlacklistIfNeeded(db); });
    }).catch(function (err) {
      // IndexedDB 不可用 -> 退回記憶體模式
      console.warn("[SkillDB] 退回記憶體模式：", err && err.message);
      _fallback = true;
      _memBlacklist = (window.BLACKLIST || []).slice();
    });
  }

  function getAllSkills() {
    if (_fallback || !_db) return Promise.resolve((window.SKILLS || []).slice());
    return reqP(tx(_db, STORE, "readonly").getAll());
  }

  function getTags() {
    if (_fallback || !_db) return Promise.resolve(window.TAGS || {});
    return reqP(tx(_db, META, "readonly").get("tags")).then(function (rec) {
      return (rec && rec.value) || window.TAGS || {};
    });
  }

  function info() {
    if (_fallback || !_db) return Promise.resolve({ mode: "memory", version: window.DATA_VERSION });
    return reqP(tx(_db, META, "readonly").get("seededAt")).then(function (rec) {
      return { mode: "indexeddb", version: window.DATA_VERSION, seededAt: rec && rec.value };
    });
  }

  // ---- 黑名單 CRUD ----
  function getBlacklist() {
    if (_fallback || !_db) return Promise.resolve((_memBlacklist || []).slice());
    return reqP(tx(_db, BL, "readonly").getAll());
  }
  function putBlacklist(entry) {
    if (!entry || !entry.pattern) return Promise.reject(new Error("缺少 pattern"));
    if (_fallback || !_db) {
      _memBlacklist = (_memBlacklist || []).filter(function (e) { return e.pattern !== entry.pattern; });
      _memBlacklist.push(entry);
      return Promise.resolve();
    }
    var t = _db.transaction(BL, "readwrite");
    t.objectStore(BL).put(entry);
    return txDone(t);
  }
  function removeBlacklist(pattern) {
    if (_fallback || !_db) {
      _memBlacklist = (_memBlacklist || []).filter(function (e) { return e.pattern !== pattern; });
      return Promise.resolve();
    }
    var t = _db.transaction(BL, "readwrite");
    t.objectStore(BL).delete(pattern);
    return txDone(t);
  }
  function resetBlacklist() {
    var defaults = (window.BLACKLIST || []).slice();
    if (_fallback || !_db) { _memBlacklist = defaults; return Promise.resolve(); }
    var t = _db.transaction([BL, META], "readwrite");
    var store = t.objectStore(BL);
    store.clear();
    defaults.forEach(function (e) { store.put(e); });
    t.objectStore(META).put({ key: "blacklistSeeded", value: window.BLACKLIST_VERSION || "0" });
    return txDone(t);
  }

  // 清空本機 IndexedDB（刪除整個資料庫）；之後重新載入即會以種子重新匯入
  function reset() {
    return new Promise(function (resolve) {
      try { if (_db) { _db.close(); _db = null; } } catch (e) { /* ignore */ }
      if (!("indexedDB" in window) || !window.indexedDB) { resolve(); return; }
      var req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = function () { resolve(); };
    });
  }

  return {
    init: init, getAllSkills: getAllSkills, getTags: getTags, info: info, reset: reset,
    getBlacklist: getBlacklist, putBlacklist: putBlacklist,
    removeBlacklist: removeBlacklist, resetBlacklist: resetBlacklist
  };
})();
