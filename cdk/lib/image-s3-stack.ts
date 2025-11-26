import * as cdk from "aws-cdk-lib";
import { StackProps, RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class ImageS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1. 画像用 S3 バケット
    const imageBucket = new s3.Bucket(this, "ImageBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(
      this,
      "ImageDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(imageBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: undefined, // 静的サイトじゃないので index.html は不要
        comment: "Image delivery via S3 + CloudFront",
      }
    );

    // 出力
    new cdk.CfnOutput(this, "CloudFrontDomain", {
      value: distribution.domainName,
      description: "Use this domain to access images via HTTPS",
    });
  }
}
