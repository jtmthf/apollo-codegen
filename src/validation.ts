import {
  validate,
  specifiedRules,
  // TODO: graphql typings
  NoUnusedFragments,
  GraphQLError,
  GraphQLSchema,
  DocumentNode,
  OperationDefinitionNode,
  FieldNode,
} from 'graphql';

import { Context, TargetType } from'./generate';
import { ToolError, logError } from './errors';

export function validateQueryDocument(schema: GraphQLSchema, document: DocumentNode, target: TargetType) {
  const specifiedRulesToBeRemoved = [NoUnusedFragments];

  const rules = [
    NoAnonymousQueries,
    NoTypenameAlias,
    ...(target === 'swift' ? [NoExplicitTypename] : []),
    ...specifiedRules.filter(rule => specifiedRulesToBeRemoved.includes(rule)),
  ];

  const validationErrors = validate(schema, document, rules);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logError(error);
    }
    throw new ToolError('Validation of GraphQL query document failed');
  }
}

export function NoAnonymousQueries(context: Context) {
  return {
    OperationDefinition(node: OperationDefinitionNode) {
      if (!node.name) {
        context.reportError(new GraphQLError(
          'Apollo does not support anonymous operations',
          [node],
        ));
      }
      return false;
    },
  };
}

export function NoExplicitTypename(context: Context) {
  return {
    Field(node: FieldNode) {
      const fieldName = node.name.value;
      if (fieldName === '__typename') {
        context.reportError(new GraphQLError(
          'Apollo inserts __typename automatically when needed, please do not include it explicitly',
          [node],
        ));
      }
    },
  };
}

export function NoTypenameAlias(context: Context) {
  return {
    Field(node: FieldNode) {
      const aliasName = node.alias && node.alias.value;
      if (aliasName === '__typename') {
        context.reportError(new GraphQLError(
          'Apollo needs to be able to insert __typename when needed, please do not use it as an alias',
          [node],
        ));
      }
    },
  };
}
