#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { AuthStack } from '../lib/auth-stack'

const app = new cdk.App()

const appName = 'word-collect'
const environment = app.node.tryGetContext('environment') || 'dev'

const authStack = new AuthStack(app, `${appName}-${environment}-auth-stack`, {
  appName,
  environment,
  callbackUrls: [
    'https://wordcollect.haydenturek.com/api/auth/callback/cognito',
    'http://localhost:3000/api/auth/callback/cognito'
  ],
  logoutUrls: ['https://wordcollect.haydenturek.com', 'http://localhost:3000'],
  description: 'Auth stack for user service',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
})

// Add tags to all stacks
const tags = {
  Environment: environment,
  Service: 'user-service',
  Application: appName
}

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(authStack).add(key, value)
})
