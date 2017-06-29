import {
  validate,
  specifiedRules,
  NoUnusedFragments,
  GraphQLError
} from 'graphql';

import { ToolError, logError } from './errors'

export function validateQueryDocument(schema, document, target) {
  const specifiedRulesToBeRemoved = [NoUnusedFragments];

  const rules = [
    NoAnonymousQueries,
    NoTypenameAlias,
    ...(target === 'swift' ? [NoExplicitTypename] : []),
    ...specifiedRules.filter(rule => specifiedRulesToBeRemoved.includes(rule))
  ];

  const validationErrors = validate(schema, document, rules);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logError(error);
    }
    throw new ToolError("Validation of GraphQL query document failed");
  }
}

export function NoAnonymousQueries(context) {
  return {
    OperationDefinition(node) {
      if (!node.name) {
        context.reportError(new GraphQLError(
          'Apollo does not support anonymous operations',
          [node]
        ));
      }
      return false;
    }
  };
}

export function NoExplicitTypename(context) {
  return {
    Field(node) {
      const fieldName = node.name.value;
      if (fieldName == "__typename") {
        context.reportError(new GraphQLError(
          'Apollo inserts __typename automatically when needed, please do not include it explicitly',
          [node]
        ));
      }
    }
  };
}

export function NoTypenameAlias(context) {
  return {
    Field(node) {
      const aliasName = node.alias && node.alias.value;
      if (aliasName == "__typename") {
        context.reportError(new GraphQLError(
          'Apollo needs to be able to insert __typename when needed, please do not use it as an alias',
          [node]
        ));
      }
    }
  };
}
