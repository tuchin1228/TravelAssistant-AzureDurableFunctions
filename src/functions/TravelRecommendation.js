import { app } from '@azure/functions';
import df from 'durable-functions';
import GPTRecommendation from '../lib/GPTLocationRecommend.js';
import AirbnbRecommend from '../lib/AirbnbRecommend.js';
import GPTAggregationData from '../lib/GPTAggregationData.js';
import SaveAzureStorage from '../lib/SaveAzureStorage.js';




df.app.orchestration('TravelRecommendationOrchestrator', function* (context) {
    const outputs = [];
    const instanceId = context.df.instanceId;

    const result = yield context.df.callActivity('GPTRecommendation', UserDemand);
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
        UserDemand,
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

const UserDemand = {
    destination: '日本',
    travelDates: {
        start: '2025-10-01',
        end: '2025-10-5'
    },
    people: 2,
    budget: 2000,
};

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


app.http('TravelRecommendationHttpStart', {
    route: 'orchestrators/{orchestratorName}',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);
        const body = await request.text();
        const instanceId = await client.startNew(request.params.orchestratorName, { input: body });

        context.log(`Started orchestration with ID = '${instanceId}'.`);

        return client.createCheckStatusResponse(request, instanceId);
    },
});