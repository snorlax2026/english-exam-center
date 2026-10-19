# 南西老師的英語考卷資料庫

以 PDF 優先呈現的個人英語考卷連結資料庫，收錄 Here We Go 1、3、5、7 二次評量的期中與期末 A／B／C 卷，共 24 組、24 份學生 PDF、48 個聽力音檔。六份新轉製的 HWG 1、3 期末考學生 PDF 已納入。

## 使用

- 搜尋或依冊別、考試、卷別篩選，直接開啟學生 PDF、教師卷、Word 與音檔。
- 點選星號收藏；點選新增或卡片下方的編輯來管理個人資料。
- 個人新增、編輯與收藏儲存在目前瀏覽器的 localStorage，不會寫回 GitHub 或 Google Drive，也不會跨裝置自動同步。清除瀏覽器資料會移除個人修改。
- 使用「資料與備份」匯出 JSON，再於其他裝置匯入。匯入依 ID 合併，同 ID 的匯入資料會覆蓋本機資料。
- 全站共用的預設資料位於 `data.json`，更新後提交至儲存庫即可隨網站發布。
- 網站不會更改雲端檔案的分享權限；開啟檔案仍須符合 Google Drive 權限。

## 發布至 GitHub Pages

在儲存庫 Settings → Pages → Build and deployment 將 Source 設為 **GitHub Actions**。之後每次推送 `main`，工作流程會執行資料驗證並發布網站。若初次發布尚未啟用 Pages，啟用後在 Actions 重新執行 Publish exam library。

## 本機預覽與驗證

在此目錄啟動任一靜態 HTTP 伺服器後開啟其網址。不要直接雙擊 HTML；瀏覽器可能阻擋 `data.json` 載入。

```sh
node --test tests/catalog.test.cjs
```

此版本為靜態連結目錄，尚無帳號系統、跨裝置同步或檔案上傳後端。原考卷及音檔留在原 Google Drive 資料夾，儲存庫不包含其二進位檔案。
