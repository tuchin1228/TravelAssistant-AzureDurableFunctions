import axios from 'axios';

export default async function (input, context) {
    // 從環境變數中安全地獲取 API 金鑰
    const apiUrl = process.env.AZURE_OPENAI_ENDPOINT; // 確保在 Azure Functions 的應用設置中配置了 API_KEY
    const apiKey = process.env.AZURE_OPENAI_KEY;

    context.log("input", input)

    // 檢查 Input 是否有效
    if (!input?.UserDemand || !input.AirbnbSearchResult) {
        throw new Error('Invalid input');
    }

    // 向 Azure OpenAI 發送請求
    const response = await axios.post(apiUrl, {
        "messages": [
            {
                role: "system",
                content:
                    `
                    你是內容摘要器，專門把使用者傳來的需求與 MCP JSON 轉成給最終使用者看的說明。
                    僅根據提供的 JSON 產生易讀、條列化的摘要；
                    輸出請使用繁體中文，不要包含原始 JSON。

                    請依照以下格式對應，將資料彙整給使用者:

                    MCP Server 格式:
                    inputSchema: {
                            type: "object",
                            properties: {
                            location: {
                                type: "string",
                                description: "Location to search for (city, state, etc.)"
                            },
                            placeId: {
                                type: "string",
                                description: "Google Maps Place ID (overrides the location parameter)"
                            },
                            checkin: {
                                type: "string",
                                description: "Check-in date (YYYY-MM-DD)"
                            },
                            checkout: {
                                type: "string",
                                description: "Check-out date (YYYY-MM-DD)"
                            },
                            adults: {
                                type: "number",
                                description: "Number of adults"
                            },
                            children: {
                                type: "number",
                                description: "Number of children"
                            },
                            infants: {
                                type: "number",
                                description: "Number of infants"
                            },
                            pets: {
                                type: "number",
                                description: "Number of pets"
                            },
                            minPrice: {
                                type: "number",
                                description: "Minimum price for the stay"
                            },
                            maxPrice: {
                                type: "number",
                                description: "Maximum price for the stay"
                            },
                            cursor: {
                                type: "string",
                                description: "Base64-encoded string used for Pagination"
                            },
                            ignoreRobotsText: {
                                type: "boolean",
                                description: "Ignore robots.txt rules for this request"
                            }
                            },
                            required: ["location"]
                        }
                    };
                    `
            }, 
            {
                role: "user",
                content: `
                    
                    使用者需求:${JSON.stringify(input.UserDemand)}
                    
                    MCP Server 回傳結果: ${JSON.stringify(input.AirbnbSearchResult)}

                `
            }
        ]
        ,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    });

    // 檢查 API 響應是否成功
    if (response.status !== 200) {
        throw new Error(`API call failed with status ${response.status}`);
    }

    // 返回 API 響應的數據


    context.log("GPTAggregationData response", response.data);

    // 將回傳內容轉為 JSON 格式
    let result={};
    try {
        result = response.data.choices[0].message;
    } catch (e) {
        throw new Error('Invalid JSON response from OpenAI');
    }

    return {
        success: true,
        data: result,
    };
};