import { app, output } from '@azure/functions';
import df from 'durable-functions';
import GPTRecommendation from '../lib/GPTLocationRecommend.js';
import AirbnbRecommend from '../lib/AirbnbRecommend.js';
import GPTAggregationData from '../lib/GPTAggregationData.js';
import SaveAzureStorage from '../lib/SaveAzureStorage.js';

df.app.orchestration('TravelRecommendationOrchestrator', function* (context) {
    const outputs = [];
    const instanceId = context.df.instanceId;

    context.df.setCustomStatus({
        stage: 'Initialization',
        message: '初始化狀態',
        startTime: new Date().toISOString(),
        progress: 0,
        outputs: [],
        errors: []
    });


    // 取得使用者輸入
    const userDemand = context.df.getInput();

    // 檢查輸入屬性是否齊全
    if (!userDemand || !userDemand.destination) {
        return {
            success: false,
            error: "Invalid input: destination is required"
        };
    }

    // 透過GPT取得推薦的旅遊地點
    const result = yield context.df.callActivity('GPTRecommendation', userDemand);
    outputs.push(result);
    context.log('GPTRecommendation result:', result);

    if (!result.success) {
        return outputs;
    }


    context.df.setCustomStatus({
        stage: 'GetRecommendation',
        message: '透過GPT取得推薦的旅遊地點',
        startTime: new Date().toISOString(),
        progress: 30,
        outputs: result,
        errors: []
    });


    const AirbnbMCPdata = result.data;

    // 透過GPT取得的資訊，向Airbnb MCP 取得推薦的住宿項目
    const airbnbResult = yield context.df.callActivity('AirbnbRecommend', AirbnbMCPdata);
    context.log('airbnbResult result:', airbnbResult);
    outputs.push(airbnbResult);

    if (!airbnbResult.success) {
        return outputs;
    }

    // 檢查 Airbnb 的結果是否為空
    if (airbnbResult?.data?.searchResults.length == 0) {
        context.log('No Airbnb results found');
        context.df.setCustomStatus({
            stage: 'GetAirbnbRecommendation',
            message: '透過Airbnb取得推薦的住宿項目',
            startTime: new Date().toISOString(),
            progress: 100,
            outputs: "在Airbnb中沒有找到符合條件的住宿項目",
            errors: airbnbResult
        });

    } else {
        context.df.setCustomStatus({
            stage: 'GetAirbnbRecommendation',
            message: '透過Airbnb取得推薦的住宿項目',
            startTime: new Date().toISOString(),
            progress: 60,
            outputs: airbnbResult,
            errors: []
        });
    }


    // 將 GPT 和 Airbnb 的結果進行整合
    const gptAggregationResult = yield context.df.callActivity('GPTAggregationData', {
        UserDemand: userDemand,
        AirbnbSearchResult: airbnbResult
    });
    outputs.push(gptAggregationResult);

    context.df.setCustomStatus({
        stage: 'GetAggregationData',
        message: '將 GPT 和 Airbnb 的結果進行整合',
        startTime: new Date().toISOString(),
        progress: 100,
        outputs: JSON.stringify(gptAggregationResult?.data?.content),
        errors: []
    });

    outputs.push(gptAggregationResult);

    // 給使用者選擇是否接受推薦
    const UserResponse = yield context.df.waitForExternalEvent('approve');

    // 根據使用者的回應儲存結果
    if (UserResponse.status == 'approve') {
        context.log('User approved the recommendation');
        yield context.df.callActivity('SaveAzureStorage', {
            instanceId,
            status: 'approve',
            result: airbnbResult
        });
    }
    else {
        context.log('User rejected the recommendation');
        yield context.df.callActivity('SaveAzureStorage', {
            instanceId,
            status: 'reject',
            result: airbnbResult
        });

    }

    return outputs;
});

// 透過GPT取得推薦的旅遊地點
df.app.activity("GPTRecommendation", {
    handler: (input, context) => {
        return GPTRecommendation(input, context);
    }
});

// 透過GPT取得的資訊，向Airbnb MCP 取得推薦的住宿項目
df.app.activity("AirbnbRecommend", {
    handler: async (input, context) => {

        await new Promise(resolve => setTimeout(resolve, 10000)); // 模擬 10 秒工作
        return AirbnbRecommend(input, context);
    }
});

// 將 GPT 和 Airbnb 的結果進行整合
df.app.activity("GPTAggregationData", {
    handler: (input, context) => {
        return GPTAggregationData(input, context);
    }
});

// 將結果儲存到 Azure Storage
df.app.activity("SaveAzureStorage", {
    handler: (input, context) => {
        return SaveAzureStorage(input, context);
    }
});

// HTTP trigger function to start the orchestration
app.http('TravelRecommendationHttpStart', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'orchestrators/{orchestratorName}',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);


        //  Step 1: 解析 body
        let userDemand = null;
        try {
            userDemand = await request.json();
        } catch (err) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: "Missing or invalid data" }),
            };
        }


        //  Step 2: 驗證 input 結構
        if (!userDemand || !userDemand?.destination || !userDemand?.people || !userDemand?.travelstart || !userDemand?.travelend || !userDemand?.budget) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: "Missing or invalid input" }),
            };
        }


        // Start the orchestration with the user input
        const instanceId = await client.startNew(
            request.params.orchestratorName,
            {
                input: userDemand
            }
        );

        context.log(`Started orchestration with ID = '${instanceId}'.`);

        return client.createCheckStatusResponse(request, instanceId);
    }
});