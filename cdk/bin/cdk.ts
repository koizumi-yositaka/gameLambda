#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaStudyStack } from "../lib/lambda-stack";
import "dotenv/config";
import { GitHubActionsRoleStack } from "../lib/githubActions-role-stack";
import { ImageS3Stack } from "../lib/image-s3-stack";
const app = new cdk.App();

const PREFIX = "game-line";

new GitHubActionsRoleStack(app, "GitHubActionsRoleStack");
// LINE Channel Access TokenとChannel Secretは環境変数から取得
// デプロイ時: LINE_CHANNEL_ACCESS_TOKEN=your_token LINE_CHANNEL_SECRET=your_secret cdk deploy
// または、デプロイ後にAWSコンソールでLambda関数の環境変数を設定
new LambdaStudyStack(app, "LambdaStudyStack", {
  lambdaName: `${PREFIX}-test`,
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET,
});

new ImageS3Stack(app, "ImageS3Stack");
