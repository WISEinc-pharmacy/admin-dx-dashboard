/**
 * migrate_handover.mjs — adx_tasks に handoverTo / category / manualUrl / frequency を追加（非破壊）
 * 実行: node local/migrate_handover.mjs
 * 前提: firebase-admin インストール済み
 * SA鍵: 環境変数 DEVOPS_SA_PATH、無ければ C:\Users\WISE-Yamauchi\wise\secrets\wise-dev-ops-sa.json
 *
 * 安全設計:
 * - 最初に全件バックアップJSONを保存
 * - 既存docのtitle/owner/status/note/targetMonth/clusterは絶対に変更しない
 * - 件数が極端に違う（0件・10件未満）場合はABORT
 * - 移行後にstatusスポット検証を実施
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SA_PATH = process.env.DEVOPS_SA_PATH || resolve(HERE, '../../secrets/wise-dev-ops-sa.json');

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

// ─── handoverTo 導出ロジック ──────────────────────────────────────────────────
// owner → handoverTo
const AI_OWNERS = new Set(['めるぼ', 'yui', 'リマインドエンジン', 'cron', 'quiz-generator']);
const WISE_PERSONS = new Set(['関根', '佐々木', '高畑', '山口', '山内']);

function deriveHandoverTo(owner, docId, title) {
  if (!owner || owner === '') return 'undecided';
  if (owner === '未定') return 'undecided';
  if (AI_OWNERS.has(owner)) return 'ai';
  // 人名の部分一致チェック
  for (const name of WISE_PERSONS) {
    if (owner.includes(name)) return 'wise';
  }
  // フォールバック: wise だが、ログに列挙して人が後で直せるようにする
  console.log(`  [FALLBACK→wise] docId=${docId} title="${title}" owner="${owner}"`);
  return 'wise';
}

// ─── category 推定ロジック ─────────────────────────────────────────────────────
function deriveCategory(title, note) {
  const text = (title + ' ' + (note || '')).toLowerCase();
  if (/月次|毎月|月1|月末|月初|6.7.8日|毎月第/.test(text)) return 'monthly';
  if (/年次|年間|毎年|毎月ではなく|annual|年末|年調|タイヤ|インフル|健康診断|棚卸|保険|期末/.test(text)) return 'annual';
  if (/毎日|毎週|daily|週次|巡回|日次/.test(text)) return 'daily';
  if (/案内|通知|アナウンス|お知ら|連絡|周知/.test(text)) return 'announce';
  return 'adhoc';
}

// ─── 新規追加ドキュメント（引継ぎの穴） ────────────────────────────────────────
const NEW_DOCS = [
  {
    title: '研修詳細の共有（毎月月初）',
    handoverTo: 'caster',
    category: 'monthly',
    manualUrl: 'https://docs.google.com/document/d/1ubb1YI8kgd5IFjijs98toGBbWwtWIMqLUmMhQgK9qYI/edit',
    frequency: '',
    note: 'キャスター残・引継ぎ先要決定',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: 'キャスター',
  },
  {
    title: '講師への研修資料作成依頼（毎月第5営業日）',
    handoverTo: 'caster',
    category: 'monthly',
    manualUrl: 'https://docs.google.com/document/d/1ubb1YI8kgd5IFjijs98toGBbWwtWIMqLUmMhQgK9qYI/edit',
    frequency: '',
    note: 'キャスター残・引継ぎ先要決定',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: 'キャスター',
  },
  {
    title: '地域薬学ケア専門薬剤師の認定試験（3月）',
    handoverTo: 'caster',
    category: 'annual',
    manualUrl: '',
    frequency: '',
    note: 'キャスター残・引継ぎ先要決定',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: 'キャスター',
  },
  {
    title: '地域薬学ケア専門薬剤師 生涯学習達成度確認試験申し込み（4月）',
    handoverTo: 'caster',
    category: 'annual',
    manualUrl: '',
    frequency: '',
    note: 'キャスター残・引継ぎ先要決定',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: 'キャスター',
  },
  {
    title: '研修会の年間スケジュール調整＋平石さん共有（11月）',
    handoverTo: 'caster',
    category: 'annual',
    manualUrl: '',
    frequency: '',
    note: 'キャスター残・引継ぎ先要決定',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: 'キャスター',
  },
  {
    title: 'デッドストックの処理 下書き準備（11月）',
    handoverTo: 'caster',
    category: 'annual',
    manualUrl: '',
    frequency: '',
    note: 'キャスター残・引継ぎ先要決定',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: 'キャスター',
  },
  {
    title: 'Slack巡回（毎週火・金）',
    handoverTo: 'notdone',
    category: 'daily',
    manualUrl: '',
    frequency: '',
    note: 'マニュアル対応者「やってない」＝実施されていない。継続要否を判断',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: '未定',
  },
  {
    title: 'BTBスレッド100件目安で新スレッド作成',
    handoverTo: 'undecided',
    category: 'adhoc',
    manualUrl: '',
    frequency: '',
    note: 'マスターで対応者空欄＝未割当',
    status: '未着手',
    updatedBy: 'seed-handover',
    cluster: 'C_人間担当',
    targetMonth: '2026-08',
    owner: '未定',
  },
];

// ─── メイン処理 ────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== migrate_handover.mjs 開始 ===');
  console.log('プロジェクト:', sa.project_id);

  // ─ Step 1: 全件読み込み ───────────────────────────────────
  console.log('\n[Step 1] adx_tasks 全件読み込み中...');
  const snap = await db.collection('adx_tasks').get();
  const existingDocs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  console.log(`  読み込み件数: ${existingDocs.length}`);

  // ─ 件数ガード ────────────────────────────────────────────
  if (existingDocs.length < 10) {
    console.error(`  ABORT: 件数が${existingDocs.length}件（期待値付近: 58）。Firestoreに問題がある可能性あり。pushしません。`);
    process.exit(1);
  }
  if (existingDocs.length < 40 || existingDocs.length > 100) {
    console.warn(`  WARNING: 件数が${existingDocs.length}件（期待値: 58前後）。続行しますが確認が必要です。`);
  }

  // ─ Step 2: バックアップ保存 ──────────────────────────────
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const backupPath = resolve(HERE, `adx_tasks_backup_${stamp}.json`);

  // 既存バックアップは上書きしない
  if (existsSync(backupPath)) {
    console.error(`  ABORT: バックアップファイルが既に存在します: ${backupPath}`);
    process.exit(1);
  }

  writeFileSync(backupPath, JSON.stringify(existingDocs, null, 2), 'utf8');
  console.log(`  バックアップ保存: ${backupPath} (${existingDocs.length}件)`);

  // ─ Step 3: 既存58件に追加フィールドをupdate ────────────
  console.log('\n[Step 3] 既存ドキュメントに handoverTo/category/manualUrl/frequency を追加中...');
  const fallbackOwners = [];

  // Firestoreのバッチは500件まで。58件なので1バッチでOK
  const batch = db.batch();
  for (const doc of existingDocs) {
    // 既に handoverTo が付いている場合はスキップ（冪等）
    if (doc.handoverTo !== undefined) {
      console.log(`  [SKIP] ${doc._id} "${doc.title}" — handoverTo 既存`);
      continue;
    }
    const handoverTo = deriveHandoverTo(doc.owner, doc._id, doc.title);
    const category = deriveCategory(doc.title, doc.note);

    // フォールバックowner（人間が後で確認できるように収集）
    if (handoverTo === 'wise' && !Array.from(WISE_PERSONS).some(n => (doc.owner || '').includes(n)) && doc.owner !== '' && doc.owner !== undefined) {
      fallbackOwners.push({ docId: doc._id, title: doc.title, owner: doc.owner, handoverTo });
    }

    const ref = db.collection('adx_tasks').doc(doc._id);
    // 追加フィールドのみupdate — 既存フィールドは変更しない
    batch.update(ref, {
      handoverTo,
      category,
      manualUrl: '',
      frequency: '',
      // updatedAt/updatedByは変えない（runtime status更新の記録を保護）
    });
  }

  await batch.commit();
  console.log(`  update完了。${existingDocs.length}件処理（SKIP分含む）`);

  // ─ フォールバックowner一覧を出力 ────────────────────────
  if (fallbackOwners.length > 0) {
    console.log('\n  [要確認] handoverTo=wise（フォールバック）に設定したowner一覧:');
    for (const f of fallbackOwners) {
      console.log(`    docId=${f.docId} title="${f.title}" owner="${f.owner}"`);
    }
  } else {
    console.log('  [OK] フォールバックなし（全owner既知）');
  }

  // ─ Step 4: 新規ドキュメント追加 ──────────────────────────
  console.log('\n[Step 4] 新規ドキュメント（引継ぎの穴）を追加中...');
  let addedCount = 0;
  const skippedNew = [];

  for (const newDoc of NEW_DOCS) {
    // 重複回避: title部分一致で既存を検索
    const duplicate = existingDocs.find(d =>
      (d.title || '').includes(newDoc.title.substring(0, 15)) ||
      newDoc.title.includes((d.title || '').substring(0, 15))
    );
    if (duplicate) {
      console.log(`  [SKIP新規] "${newDoc.title}" — 類似タイトル既存: "${duplicate.title}"`);
      skippedNew.push(newDoc.title);
      continue;
    }

    const ref = db.collection('adx_tasks').doc(); // auto-ID
    await ref.set({
      ...newDoc,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  [追加] "${newDoc.title}"`);
    addedCount++;
  }

  console.log(`  新規追加: ${addedCount}件 / スキップ: ${skippedNew.length}件`);

  // ─ Step 5: status スポット検証 ───────────────────────────
  console.log('\n[Step 5] status 非破壊スポット検証...');
  const snapAfter = await db.collection('adx_tasks').get();
  const docsAfter = new Map(snapAfter.docs.map(d => [d.id, d.data()]));

  // バックアップと比較（元の58件のstatusが壊れていないか）
  let mismatchCount = 0;
  const sampleIds = existingDocs.slice(0, 5).map(d => d._id); // 先頭5件サンプル
  for (const orig of existingDocs) {
    const after = docsAfter.get(orig._id);
    if (!after) {
      console.error(`  ABORT: doc ${orig._id} が消失しています！`);
      process.exit(1);
    }
    if (after.status !== orig.status) {
      console.error(`  MISMATCH: ${orig._id} status: ${orig.status} -> ${after.status}`);
      mismatchCount++;
    }
    // title/owner/cluster も保護確認
    if (after.title !== orig.title || after.owner !== orig.owner || after.cluster !== orig.cluster) {
      console.error(`  FIELD_MISMATCH: ${orig._id} title/owner/clusterが変わっています`);
      mismatchCount++;
    }
  }

  if (mismatchCount > 0) {
    console.error(`  ABORT: ${mismatchCount}件のstatus/フィールド不一致を検出。pushしないでください。`);
    process.exit(1);
  }

  // サンプル出力（5件）
  console.log('  サンプル検証（先頭5件）:');
  for (const id of sampleIds) {
    const orig = existingDocs.find(d => d._id === id);
    const after = docsAfter.get(id);
    console.log(`    ${id} status: ${orig.status} -> ${after.status} handoverTo: ${after.handoverTo} category: ${after.category} [${orig.status === after.status ? 'OK' : 'FAIL'}]`);
  }

  // ─ 最終件数確認 ─────────────────────────────────────────
  const finalCount = docsAfter.size;
  console.log(`\n=== 完了 ===`);
  console.log(`  バックアップ: ${backupPath}`);
  console.log(`  既存更新件数: ${existingDocs.length}件`);
  console.log(`  新規追加件数: ${addedCount}件`);
  console.log(`  最終件数: ${finalCount}件（期待値: ${existingDocs.length + addedCount}）`);
  console.log(`  status不一致: ${mismatchCount}件`);

  if (finalCount !== existingDocs.length + addedCount) {
    console.warn('  WARNING: 最終件数が期待値と異なります。確認してください。');
  } else {
    console.log('  [OK] 全件数一致');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('migrate_handover.mjs 失敗:', err);
  process.exit(1);
});
