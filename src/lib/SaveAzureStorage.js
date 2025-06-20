import axios from 'axios';
import { BlockBlobClient } from "@azure/storage-blob";

export default async function (input, context) {
    const AZURE_STORAGE_ENDPOINT = process.env.AZURE_STORAGE_ENDPOINT; // 確保在 Azure Functions 的應用設置中配置了 AZURE_STORAGE_ENDPOINT
    const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;

    const instanceId = input.instanceId ?? null;
    const status = input.status ?? null;
    const result = input.result ?? null;

    if (!instanceId || !status || !result) {
        throw new Error('Missing required parameters: instanceId, status, or result');
    }

    let sasUrl = "";

    switch (status) {
        case 'approve':
            sasUrl = `${AZURE_STORAGE_ENDPOINT}/travelrecommend/approve/${instanceId}.json${AZURE_STORAGE_SAS_TOKEN}`;
            break;
        case 'reject':
            sasUrl = `${AZURE_STORAGE_ENDPOINT}/travelrecommend/reject/${instanceId}.json${AZURE_STORAGE_SAS_TOKEN}`;
            break;
        default:
            throw new Error('Invalid status');
    }

    // Convert result to string if it's not already
    const content = typeof result === 'string' ? result : JSON.stringify(result);
    
    // Calculate content length
    const contentLength = Buffer.from(content).length;

    // 建立 BlockBlobClient
    const blockBlobClient = new BlockBlobClient(sasUrl);

    // 上傳內容為 blob，指定 content type 為 application/json
    await blockBlobClient.upload(content, contentLength, {
        blobHTTPHeaders: {
            blobContentType: 'application/json'
        }
    }).catch(error => {
        context.log("上傳失敗:", error);
        throw new Error('上傳失敗: ' + error.message);
    });

    context.log("上傳成功");

    return {
        status: 'success',
        message: '上傳成功',
    };
}