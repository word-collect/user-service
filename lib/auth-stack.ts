import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as ssm from 'aws-cdk-lib/aws-ssm'

export interface AuthStackProps extends StackProps {
  appName: string
  environment: string
  /**
   * The public URLs where your Next app runs.
   * - Dev:  http://localhost:3000
   * - Prod: https://app.example.com
   */
  callbackUrls: string[]
  logoutUrls: string[]
}

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props)
    const { appName, environment, callbackUrls, logoutUrls } = props

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 12, requireSymbols: true },
      removalPolicy: RemovalPolicy.DESTROY // DEV ONLY
    })

    /** ➋ Hosted-UI domain (required for /oauth2/…) */
    userPool.addDomain('Domain', {
      cognitoDomain: {
        /**
         * Must be globally unique. Adjust as needed.
         * Example: myapp-dev-auth →  myapp-dev-auth.auth.us-east-1.amazoncognito.com
         */
        domainPrefix: `${appName}-${environment}-auth`.toLowerCase()
      }
    })

    const client = new cognito.UserPoolClient(this, 'AppClient', {
      userPool,
      // public SPA client → no secret, use PKCE
      generateSecret: false,

      // Allow the hosted-UI code flow
      oAuth: {
        flows: { authorizationCodeGrant: true, implicitCodeGrant: false },
        callbackUrls, // ⇒ [...]/api/auth/callback/cognito
        logoutUrls // ⇒ frontend roots
      },

      // Tell Cognito we’re only using the native pool (no Google, etc. yet)
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO
      ],

      // (authFlows userPassword / userSrp are optional for OAuth clients)
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
