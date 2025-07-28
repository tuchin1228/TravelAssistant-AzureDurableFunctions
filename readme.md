<div align="center">

# 旅遊住宿推薦助手

<div align="left">
 這是一個基於 Azure Functions 的旅遊推薦系統，使用 Durable Functions 協調工作流程，結合 Azure OpenAI Service 和 Azure Storage 服務提供旅遊地點推薦，並儲存使用者選擇結果。
</div>

</div>


## 功能簡介

- 透過 GPT 模型推薦旅遊地點，整合住宿資訊提供建議內容
- 透過 Airbnb MCP Server 取得住宿資訊
- 儲存推薦結果到 Azure Storage
- 使用 Durable Functions 管理工作流程狀態

## 開始使用

### 必要條件

- Node.js (建議版本：20.x 或更高)
- Azure Functions Core Tools
- Azure 訂閱
- Azure OpenAI Service
- Azure Storage Account

### 安裝與設定

1. 克隆或下載專案到本機
2. 執行 `npm install` 安裝相依套件
3. 建立 `local.settings.json` 檔案（見下方說明）
4. 運行 `npm start` 或 `func start` 啟動函數應用

環境變數設定參考：[here](https://github.com/tuchin1228/TravelAssistant-AzureDurableFunctions/wiki/Setting-Environment-Variables)


## 15分鐘介紹 Azure Durable Functions
- [用 Durable Functions 建構具彈性的 AI 工作流｜MetaAge 邁達特](https://youtu.be/_GedkQVtCZY?si=lothAgMO1K7Tog4h)

## 參考
本專案為參考以下影片學習 Azure Durable Functions
 - [Orchestrate distributed AI Agents with Azure Functions | DEM541](https://youtu.be/pSBrgsmB-zs?si=M8730XMvtYdlbQ9H)
