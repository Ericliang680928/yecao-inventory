'use strict';
/**
 * 一次性腳本：將範例商品寫入來源試算表（産品名單 tab）
 * 欄位：A=商品編號, B=（保留）, C=商品名稱, D=（保留）, E=類別
 * 執行完畢後可刪除此檔案
 */
require('dotenv').config();
const { google } = require('googleapis');

const SAMPLE_PRODUCTS = [
  ['P001', '', '有機燕麥片 500g',    '', '穀物雜糧'],
  ['P002', '', '天然蜂蜜 350ml',     '', '蜂蜜醬料'],
  ['P003', '', '冷壓橄欖油 500ml',   '', '食用油脂'],
  ['P004', '', '有機糙米 2kg',       '', '穀物雜糧'],
  ['P005', '', '天然黑糖 400g',      '', '調味品'],
  ['P006', '', '有機芝麻醬 280g',    '', '蜂蜜醬料'],
  ['P007', '', '亞麻籽油 250ml',     '', '食用油脂'],
  ['P008', '', '有機紅藜麥 300g',    '', '穀物雜糧'],
  ['P009', '', '喜馬拉雅玫瑰鹽 500g','', '調味品'],
  ['P010', '', '有機椰子油 500ml',   '', '食用油脂'],
];

async function seed() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const api    = google.sheets({ version: 'v4', auth: client });

  const sheetId   = process.env.SOURCE_SHEET_ID;
  const sheetName = process.env.SOURCE_SHEET_NAME || '產品名單';

  // 先清除 A2:E 舊資料
  await api.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2:E`,
  });

  // 寫入範例商品
  await api.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2`,
    valueInputOption: 'RAW',
    requestBody: { values: SAMPLE_PRODUCTS },
  });

  console.log(`✅ 已寫入 ${SAMPLE_PRODUCTS.length} 筆範例商品至「${sheetName}」`);
}

seed().catch(err => {
  console.error('❌ 失敗：', err.message);
  process.exit(1);
});
