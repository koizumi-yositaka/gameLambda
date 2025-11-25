import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

interface LambdaStudyStackProps extends cdk.StackProps {
  lambdaName: string;
  lineChannelAccessToken?: string; // LINE Channel Access Token（オプション）
  lineChannelSecret?: string; // LINE Channel Secret（Webhook用、オプション）
}
const REPOSITORY_TOP = path.resolve(__dirname, "../");

export class LambdaStudyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: LambdaStudyStackProps) {
    super(scope, id, props);
    if (!process.env.GAME_SERVER_ENDPOINT) {
      throw new Error("GAME_SERVER_ENDPOINT is not set");
    }
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    }
    if (!process.env.LINE_CHANNEL_SECRET) {
      throw new Error("LINE_CHANNEL_SECRET is not set");
    }
    // Lambda 関数
    const pushLambda = new lambda.Function(this, "PushLambda", {
      functionName: `${props?.lambdaName}-push`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler", // ファイル名.エクスポート名
      code: lambda.Code.fromAsset(
        path.join(REPOSITORY_TOP, "lambdas/push/dist")
      ),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30), // LINE API呼び出しのためタイムアウトを延長
      environment: {
        // LINE Channel Access Tokenは環境変数として設定
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      },
    });

    // REST API (API Gateway) を Lambda と紐づけ
    const api = new apigateway.RestApi(this, "PushApi", {
      description: "Push API",
    });

    // /line/push パスを追加
    const lineResource = api.root.addResource("line");
    const pushResource = lineResource.addResource("push");
    const pushIntegration = new apigateway.LambdaIntegration(pushLambda);
    pushResource.addMethod("POST", pushIntegration);

    // デプロイ後、出力に api.url を出したい場合は CfnOutput も追加可能
    new cdk.CfnOutput(this, "ApiUrl", { value: `${api.url}line/push` });

    // Webhook用Lambda関数
    const webhookLambda = new lambda.Function(this, "WebhookLambda", {
      functionName: `${props?.lambdaName}-webhook`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(REPOSITORY_TOP, "lambdas/reply/dist")
      ),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      environment: {
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
        GAME_SERVER_ENDPOINT: process.env.GAME_SERVER_ENDPOINT,
      },
    });

    // Webhook用API Gateway
    const webhookApi = new apigateway.RestApi(this, "WebhookApi", {
      description: "LINE Webhook API",
    });

    // /line/webhook パスを追加
    const webhookLineResource = webhookApi.root.addResource("line");
    const webhookResource = webhookLineResource.addResource("webhook");
    const webhookIntegration = new apigateway.LambdaIntegration(webhookLambda);
    webhookResource.addMethod("POST", webhookIntegration);

    new cdk.CfnOutput(this, "WebhookApiUrl", {
      value: `${webhookApi.url}line/webhook`,
      description: "LINE Webhook endpoint URL",
    });
  }
}
