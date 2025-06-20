import { app } from '@azure/functions';
import df from 'durable-functions';
import GPTRecommendation from '../lib/GPTLocationRecommend.js';
import AirbnbRecommend from '../lib/AirbnbRecommend.js';
import GPTAggregationData from '../lib/GPTAggregationData.js';
import SaveAzureStorage from '../lib/SaveAzureStorage.js';

df.app.orchestration('TravelRecommendationOrchestrator', function* (context) {
    const outputs = [];
    const instanceId = context.df.instanceId;

    // Get the input from the orchestration context
    const userDemand = context.df.getInput();

    if (!userDemand || !userDemand.destination) {
        return {
            success: false,
            error: "Invalid input: destination is required"
        };
    }

    const result = yield context.df.callActivity('GPTRecommendation', userDemand);
    outputs.push(result);
    context.log('GPTRecommendation result:', result);

    if (!result.success) {
        return outputs;
    }

    const AirbnbMCPdata = result.data;
    const airbnbResult = yield context.df.callActivity('AirbnbRecommend', AirbnbMCPdata);
    context.log('airbnbResult result:', airbnbResult);
    outputs.push(airbnbResult);

    if (!airbnbResult.success) {
        return outputs;
    }

    const gptAggregationResult = yield context.df.callActivity('GPTAggregationData', {
        UserDemand: userDemand,
        AirbnbSearchResult: airbnbResult
    });
    outputs.push(gptAggregationResult);


    const UserResponse = yield context.df.waitForExternalEvent('approve');

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

df.app.activity("GPTRecommendation", {
    handler: (input, context) => {
        return GPTRecommendation(input, context);
    }
});

df.app.activity("AirbnbRecommend", {
    handler: async (input, context) => {

        await new Promise(resolve => setTimeout(resolve, 10000)); // 模擬 10 秒工作
        return AirbnbRecommend(input, context);
    }
});

df.app.activity("GPTAggregationData", {
    handler: (input, context) => {
        return GPTAggregationData(input, context);
    }
});

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
                body: JSON.stringify({ error: "Missing or invalid destination" }),
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