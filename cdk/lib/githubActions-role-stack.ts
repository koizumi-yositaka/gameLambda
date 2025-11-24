import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

const GITHUB_USERNAME = "koizumi-yositaka";
const REPOSITORY_NAME_LIST = ["gameLambda"];

export class GitHubActionsRoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // GitHubのOIDCプロバイダーを作成
    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    // github actions からの使用を許可したIAMロールを作成
    const stringLike = REPOSITORY_NAME_LIST.map(
      (x) => `repo:${GITHUB_USERNAME}/${x}:*`
    );
    console.log(stringLike);
    const githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": stringLike,
          },
        }
      ),
      description: "Role for GitHub Actions to deploy CDK stack",
    });

    // CDKデプロイに必要な権限を付与
    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudformation:*",
          "iam:*",
          "logs:*",
          "s3:*",
          "ssm:*",
          "ec2:*",
          "cloudfront:*",
          "ecr:*",
          "route53:*",
          "lambda:*",
          "apigateway:*",
          "sts:GetCallerIdentity",
        ],
        resources: ["*"],
      })
    );

    // ロールのARNを出力
    new cdk.CfnOutput(this, "RoleArn", {
      value: githubActionsRole.roleArn,
      description: "ARN of the GitHub Actions role",
    });
  }
}
