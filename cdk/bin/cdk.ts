#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaStudyStack } from "../lib/lambda-stack";
import "dotenv/config";
const app = new cdk.App();

const PREFIX = "game-line";

// LINE Channel Access TokenとChannel Secretは環境変数から取得
// デプロイ時: LINE_CHANNEL_ACCESS_TOKEN=your_token LINE_CHANNEL_SECRET=your_secret cdk deploy
// または、デプロイ後にAWSコンソールでLambda関数の環境変数を設定
new LambdaStudyStack(app, "LambdaStudyStack", {
  lambdaName: `${PREFIX}-test`,
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET,
});
