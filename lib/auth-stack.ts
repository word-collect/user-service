import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as ssm from 'aws-cdk-lib/aws-ssm'

export interface AuthStackProps extends StackProps {
  appName: string
  environment: string
}

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props)
    const { appName, environment } = props

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 12, requireSymbols: true },
      removalPolicy: RemovalPolicy.DESTROY // DEV ONLY
    })

    const client = new cognito.UserPoolClient(this, 'AppClient', {
      userPool,
      generateSecret: false,
      authFlows: { userPassword: true, userSrp: true }
    })

    // ---- surface the IDs ----
    new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: `/${appName}/${environment}/user-service/userPoolId`,
      stringValue: userPool.userPoolId
    })
    new ssm.StringParameter(this, 'AppClientIdParam', {
      parameterName: `/${appName}/${environment}/user-service/appClientId`,
      stringValue: client.userPoolClientId
    })

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'AppClientId', { value: client.userPoolClientId })
  }
}
