import { Construct } from "constructs";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import * as path from "path";
import { LambdaIntegration, RestApi } from "@aws-cdk/aws-apigateway";

export class CdkServerlessStack extends cdk.Stack {
  private readonly appName: string;
  private userTable: dynamodb.Table;
  private userApiLambda: lambda.Function;
  private userApi: apigw.RestApi;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.appName = "blob-mob";

    this.createUserTable();
    this.createUserApiLambda();
    this.createUserApi();
  }

  // Dynamodb table definition:
  private createUserTable = () => {
    this.userTable = new dynamodb.Table(this, `${this.appName}-Users-Table`, {
      tableName: "users",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });
  };

  //Lambda definition:
  private createUserApiLambda = () => {
    this.userApiLambda = new lambda.Function(
      this,
      `${this.appName}--Users-Lambda`,
      {
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
        handler: "user.handler",
        runtime: lambda.Runtime.NODEJS_12_X,
      }
    );

    //Required permissions for Lambda function to interact with Customer table
    this.userTable.grantReadWriteData(this.userApiLambda);
  };

  private createUserApi = () => {
    this.userApi = new RestApi(this, `${this.appName}-Users-API`, {
      description: "Users API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
    });
    new cdk.CfnOutput(this, "apiUrl", { value: this.userApi.url });

    this.addUserApiResources();
  };

  private addUserApiResources = () => {
    const users = this.userApi.root.addResource("users");
    const user = users.addResource("{id}");
    const scores = users.addResource("scores");

    users.addMethod("GET", new LambdaIntegration(this.userApiLambda));
    users.addMethod("PUT", new LambdaIntegration(this.userApiLambda));

    user.addMethod("GET", new LambdaIntegration(this.userApiLambda));
    user.addMethod("DELETE", new LambdaIntegration(this.userApiLambda));

    scores.addMethod("GET", new LambdaIntegration(this.userApiLambda));
  };
}
