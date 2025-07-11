import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export default async function (input, context) {
        try {
            // 1. 建立 Transport，交由 SDK 直接 spawn child process
            const transport = new StdioClientTransport({
                command: process.execPath,                        // = "node" 的完整路徑
                args: [resolve(process.env.AIRBNB_MCP_SERVER_PATH),
                    "--ignore-robots-txt"],               // 依需要加參數
            });

            // 2. 建立 MCP Client 並連線
            const client = new Client({ name: "airbnb-demo", version: "0.0.1" });
            await client.connect(transport);

            // 3. 列出可用工具
            const { tools } = await client.listTools();
            console.log("Tools from server:", tools.map(t => t.name));

            // 4. 示範呼叫 airbnb_search
            const result = await client.callTool({
                name: "airbnb_search",
                arguments: input,
            });
            
            return {
                success: true,
                data: JSON.parse(result.content[0].text),
            }
            
            // 5. 收尾
            await client.disconnect();

            return JSON.parse(result);
        } catch (error) {
            console.error("Error occurred:", error);
            if (typeof context?.fail === "function") {
                context.fail(error);
            }
        }
    }


