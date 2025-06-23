import { app } from '@azure/functions';

app.setup({
    enableHttpStream: true,
    cors: {
        // 允許的來源，可以是特定網域或使用 '*' 允許所有來源
        // 在生產環境中，建議明確列出允許的網域
        origin: ['http://localhost:3000', 'http://localhost:5173'],  // 前端開發常用的port
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['*'],
        credentials: true,  // 允許跨來源請求包含認證資訊
        maxAge: 24 * 60 * 60  // 預檢請求的快取時間（24小時）
    }
});
