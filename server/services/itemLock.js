'use strict';
/**
 * 品項鎖定服務（in-memory）
 * 當某人開始編輯某品項時鎖定，30 秒無活動自動釋放
 */

const LOCK_TTL_MS = 30 * 1000; // 30 秒

// Map key: `${batchId}::${productId}`
// value: { username, name, lockedAt, timer }
const locks = new Map();

function lockKey(batchId, productId) {
  return `${batchId}::${productId}`;
}

/**
 * 嘗試鎖定品項
 * @returns {{ ok: true } | { ok: false, lockedBy: string, lockedAt: string }}
 */
function acquire(batchId, productId, username, displayName) {
  const key = lockKey(batchId, productId);
  const existing = locks.get(key);

  // 同一人重新鎖定（心跳續租）
  if (existing && existing.username === username) {
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => locks.delete(key), LOCK_TTL_MS);
    existing.lockedAt = new Date().toISOString();
    return { ok: true };
  }

  // 已被他人鎖定
  if (existing) {
    return { ok: false, lockedBy: existing.name || existing.username, lockedAt: existing.lockedAt };
  }

  // 建立新鎖
  const timer = setTimeout(() => locks.delete(key), LOCK_TTL_MS);
  locks.set(key, { username, name: displayName, lockedAt: new Date().toISOString(), timer });
  return { ok: true };
}

/**
 * 釋放鎖定
 */
function release(batchId, productId, username) {
  const key = lockKey(batchId, productId);
  const existing = locks.get(key);
  if (existing && existing.username === username) {
    clearTimeout(existing.timer);
    locks.delete(key);
  }
}

/**
 * 查詢某批次所有鎖定狀態
 * @returns { [productId]: { lockedBy, lockedAt } }
 */
function getBatchLocks(batchId) {
  const result = {};
  for (const [key, val] of locks.entries()) {
    const [bid, pid] = key.split('::');
    if (bid === batchId) {
      result[pid] = { lockedBy: val.name || val.username, lockedAt: val.lockedAt };
    }
  }
  return result;
}

module.exports = { acquire, release, getBatchLocks };
