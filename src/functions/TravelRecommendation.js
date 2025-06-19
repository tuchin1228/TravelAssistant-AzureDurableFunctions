const { app } = require('@azure/functions');
const df = require('durable-functions');
const GPTRecommendation = require('../lib/GPTLocationRecommend');

df.app.orchestration('TravelRecommendationOrchestrator', function* (context) {
    const outputs = [];
    // outputs.push(yield context.df.callActivity(activityName, 'Tokyo'));
    // outputs.push(yield context.df.callActivity(activityName, 'Seattle'));
    // outputs.push(yield context.df.callActivity(activityName, 'Cairo'));    // 使用定義好的 UserDemand 作為參數傳遞給 activity
    outputs.push(yield context.df.callActivity('GPTRecommendation', UserDemand));
    return outputs;
});

// df.app.activity(activityName, {
//     handler: (input) => {
//         return `Hello, ${input}`;
//     },
// });

const UserDemand = {
    destination: '日本',
    travelDates: {
        start: '2023-10-01',
        end: '2023-10-5'
    },
    days: 5,
    budgetforday: 1000,
};

df.app.activity("GPTRecommendation", {
    handler: (input,context) => {
        return GPTRecommendation( input,context);
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