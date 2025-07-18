import axios from 'axios';

export default async function (input, context) {
    // 從環境變數中安全地獲取 API 金鑰
    const apiUrl = process.env.AZURE_OPENAI_ENDPOINT; // 確保在 Azure Functions 的應用設置中配置了 API_KEY
    const apiKey = process.env.AZURE_OPENAI_KEY;

    context.log("input", input)

    // 檢查 Input 是否有效
    if (!input) {
        throw new Error('Invalid input');
    }

    // 向 Azure OpenAI 發送請求
    const response = await axios.post(apiUrl, {
        "messages": [
            {
                role: "system",
                content:
                    `
                    你是一個旅遊推薦專家並且是 MCP Server 的後端字串產生器，請根據用戶想去的國家，推薦一個旅遊城市，除非格式範例另有更動，否則輸出必須 **完全** 與下列 JSON Schema 相符：
                    並請一定要依照以下MCP Server格式返回JSON格式結果：
                    const AIRBNB_SEARCH_TOOL: Tool = {
                    name: "airbnb_search",
                    description: "Search for Airbnb listings with various filters and pagination. Provide direct links to the user",
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
                    禁止輸出任何註解、Markdown、額外字元或換行：只能回傳純 JSON。
                    `

            },
            {
                role: "user",
                content: `
                    用戶需求：        
                    國家:${input.location}
                    城市:{AI助理推薦在${input.location}的旅遊城市}
                    人數：${input.people || 'Not specified'}
                    旅行日期：${input.travelstart || 'Not specified'} 到 ${input.travelend || 'Not specified'}
                    每晚最大住宿金額：${input.budget || 'Not specified'}台幣`
            }]
        ,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    });

    // 檢查 API 響應是否成功
    if (response.status !== 200) {
        context.log.error('Error calling Azure OpenAI API:', response.status, response.statusText);
        throw new Error(`API call failed with status ${response.status}`);
    }

    // 返回 API 響應的數據




    // 將回傳內容轉為 JSON 格式
    let result;
    try {
        result = JSON.parse(response.data.choices[0].message.content);
    } catch (e) {
        context.log.error('Failed to parse JSON from OpenAI response:', e);
        throw new Error('Invalid JSON response from OpenAI');
    }
    return {
        success: true,
        data: result,
    };
    // if (!apiKey) {
    //     throw new Error('API key not found in environment variables');
    // }

    // // 在這裡使用 API 金鑰進行操作
    // // 例如：
    // try {
    //     // 你的 API 調用邏輯
    //     const result = await someApiCall(apiKey);

    //     return {
    //         location: result.location,
    //         // 其他返回數據...
    //     };
    // } catch (error) {
    //     context.log.error('Error calling API:', error);
    //     throw error;
    // }
};