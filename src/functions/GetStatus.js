
import { app } from '@azure/functions';
import df from 'durable-functions';

app.http('GetStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'status/{instanceId}',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);
        const instanceId = request.params.instanceId;
        context.log(`Fetching status for instance ID: ${instanceId}`);
        
        try {
            // 取得 orchestration 狀態
            const orchestrationStatus = await client.getStatus(instanceId);

            if (!orchestrationStatus) {
                return {
                    status: 404,
                    body: JSON.stringify({
                        error: `找不到ID為 ${instanceId} 的orchestration`
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
            }

            // 使用 getStatus 方法的 showHistory 參數來取得歷史
            const statusWithHistory = await client.getStatus(instanceId, true, true, true);
            
            let activities = {};
            
            // 如果有歷史記錄，解析活動狀態
            if (statusWithHistory && statusWithHistory.history) {
                activities = statusWithHistory.history
                    .filter(event =>
                        event.EventType === 'TaskScheduled' ||
                        event.EventType === 'TaskCompleted' ||
                        event.EventType === 'TaskFailed')
                    .reduce((acc, event) => {
                        const activityName = event.EventType === 'TaskScheduled' ?
                            event.Name :
                            statusWithHistory.history.find(e =>
                                e.EventType === 'TaskScheduled' &&
                                e.EventId === event.ScheduledEventId
                            )?.Name;

                        if (!activityName) return acc;

                        if (!acc[activityName]) {
                            acc[activityName] = {
                                name: activityName,
                                status: 'Unknown'
                            };
                        }

                        switch (event.EventType) {
                            case 'TaskScheduled':
                                acc[activityName].status = 'Running';
                                acc[activityName].startTime = event.Timestamp;
                                break;
                            case 'TaskCompleted':
                                acc[activityName].status = 'Completed';
                                acc[activityName].endTime = event.Timestamp;
                                acc[activityName].result = event.Result;
                                if (acc[activityName].startTime) {
                                    acc[activityName].duration =
                                        new Date(event.Timestamp) - new Date(acc[activityName].startTime);
                                }
                                break;
                            case 'TaskFailed':
                                acc[activityName].status = 'Failed';
                                acc[activityName].endTime = event.Timestamp;
                                acc[activityName].error = event.Reason;
                                if (acc[activityName].startTime) {
                                    acc[activityName].duration =
                                        new Date(event.Timestamp) - new Date(acc[activityName].startTime);
                                }
                                break;
                        }
                        return acc;
                    }, {});
            }

            // 替代方案：從 orchestration 狀態推斷活動狀態
            const response = {
                instanceId: instanceId,
                orchestrationStatus: orchestrationStatus.runtimeStatus,
                createdTime: orchestrationStatus.createdTime,
                lastUpdatedTime: orchestrationStatus.lastUpdatedTime,
                input: orchestrationStatus.input,
                output: orchestrationStatus.output,
                customStatus: orchestrationStatus.customStatus,
                activities: Object.keys(activities).length > 0 ? activities : null
            };

            // 如果沒有詳細的活動歷史，提供基本狀態信息
            if (!response.activities) {
                response.message = "詳細的活動狀態需要 orchestration 提供自定義狀態";
                
                // 根據 orchestration 狀態提供一般性信息
                switch (orchestrationStatus.runtimeStatus) {
                    case 'Running':
                        response.generalStatus = "Orchestration 正在執行中";
                        break;
                    case 'Completed':
                        response.generalStatus = "Orchestration 已完成";
                        break;
                    case 'Failed':
                        response.generalStatus = "Orchestration 執行失敗";
                        break;
                    case 'Terminated':
                        response.generalStatus = "Orchestration 已終止";
                        break;
                    case 'Pending':
                        response.generalStatus = "Orchestration 等待中";
                        break;
                    default:
                        response.generalStatus = `Orchestration 狀態: ${orchestrationStatus.runtimeStatus}`;
                }
            }

            return {
                status: 200,
                body: JSON.stringify(response),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
        } catch (error) {
            context.log('GetStatus error:', error);
            return {
                status: 500,
                body: JSON.stringify({
                    error: `取得狀態時發生錯誤: ${error.message}`,
                    instanceId: instanceId
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }
    }
});
