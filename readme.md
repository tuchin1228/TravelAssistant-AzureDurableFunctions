# 旅遊推薦系統 (Travel Recommendation System)

這是一個基於 Azure Functions 的旅遊推薦系統，使用 Durable Functions 協調工作流程，結合 Azure OpenAI 和 Azure Storage 服務提供旅遊地點推薦。

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

## local.settings.json 設定

由於安全考量，`local.settings.json` 檔案不會包含在版本控制中。請在專案根目錄創建此檔案，並包含以下設定：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=<YOUR_STORAGE_ACCOUNT_NAME>;AccountKey=<YOUR_STORAGE_ACCOUNT_KEY>;EndpointSuffix=core.windows.net",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DurableConnectionString": "DefaultEndpointsProtocol=https;AccountName=<YOUR_STORAGE_ACCOUNT_NAME>;AccountKey=<YOUR_STORAGE_ACCOUNT_KEY>;EndpointSuffix=core.windows.net",
    "AZURE_OPENAI_ENDPOINT": "<YOUR_AZURE_OPENAI_ENDPOINT>",
    "AZURE_OPENAI_KEY": "<YOUR_AZURE_OPENAI_API_KEY>",
    "AZURE_STORAGE_ENDPOINT": "<YOUR_AZURE_STORAGE_ENDPOINT>",
    "AZURE_STORAGE_SAS_TOKEN": "<YOUR_AZURE_STORAGE_SAS_TOKEN>"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": true
  }
}
```

### 環境變數說明

| 變數名稱 | 說明 | 必要性 |
|---------|------|--------|
| `AIRBNB_MCP_SERVER_PATH` | Airbnb MCP Server 的本地執行檔案路徑，用於整合 Airbnb 資訊 | Y |
| `AzureWebJobsStorage` | Azure Functions 儲存連接字串，用於管理函數狀態 | Y |
| `FUNCTIONS_WORKER_RUNTIME` | 執行環境，保持為 "node" | Y |
| `DurableConnectionString` | Durable TaskScheduler 連接字串 | Y |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI 服務端點，格式如：`https://<name>.openai.azure.com/openai/deployments/<deployment-name>/chat/completions?api-version=2023-05-15` | Y |
| `AZURE_OPENAI_KEY` | Azure OpenAI API 密鑰 | Y |
| `AZURE_STORAGE_ENDPOINT` | Azure Storage 端點，格式如：`https://<storage-account-name>.blob.core.windows.net` | Y |
| `AZURE_STORAGE_SAS_TOKEN` | Azure Storage SAS 令牌，包含問號起始的部分 | Y |

Airbnb MCP Server 來源：[GitHub - openbnb-org/mcp-server-airbnb](https://github.com/openbnb-org/mcp-server-airbnb)

## 開發說明

- `src/functions/` - 包含 Azure Functions 觸發器
- `src/lib/` - 包含共用程式碼和服務
- `src/Orchestrators/` - 包含 Durable Functions 協調器

## 部署至 Azure

請參考 Azure Functions 文件進行部署，並確保在 Azure 設置相應的應用程式設定。

## host.json 設定說明

`host.json` 檔案包含了 Azure Functions 的全局配置選項，影響所有函數的行為。以下是本專案中 `host.json` 的關鍵設定說明：

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle.Preview",
    "version": "[4.29.0, 5.0.0)"
  },
  "extensions": {
    "durableTask": {
      "hubName": "durable07",
      "storageProvider": {
        "type": "azureManaged",
        "connectionStringName": "DurableConnectionString" 
      }
    }
  }
}
```

### 主要設定說明

| 設定項目 | 說明 |
|---------|------|
| `extensions.durableTask.hubName` | Durable Functions TaskScheduler 中的中樞名稱 |
| `extensions.durableTask.storageProvider.type` | 儲存提供者類型，設定為 "azureManaged" |
| `extensions.durableTask.storageProvider.connectionStringName` | 使用的連接字串名稱，對應 local.settings.json 中的 "DurableConnectionString" |

### 注意事項

本機測試時，extensions.durableTask.storageProvider.type 使用 `AzureStorage`，並且不需要 `extensions.durableTask.storageProvider.connectionStringName`。

部署至 Azure 時，可透過 Azure Portal 修改這些設定，無需重新部署程式碼。