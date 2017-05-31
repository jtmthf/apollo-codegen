import {
  isEqualType,
  isAbstractType,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLSchema,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLError,
  OperationDefinitionNode,
  Location,
  ASTNode,
  ValueNode,
  FieldNode,
} from 'graphql';

export function sourceAt(location: Location) {
  return location.source.body.slice(location.start, location.end);
}

export function filePathForNode(node: ASTNode) {
  const name = node.loc && node.loc.source && node.loc.source.name;
  return (name === 'GraphQL') ? undefined : name;
}

export function valueFromValueNode(valueNode: ValueNode): any {
  if (valueNode.kind === 'IntValue' || valueNode.kind === 'FloatValue') {
    return Number(valueNode.value);
  } else if (valueNode.kind === 'NullValue') {
    return null;
  } else if (valueNode.kind === 'ListValue') {
    return valueNode.values.map(valueFromValueNode);
  } else if (valueNode.kind === 'ObjectValue') {
    return valueNode.fields.reduce((object, field) => {
      object[field.name.value] = valueFromValueNode(field.value);
      return object;
    }, {});
  } else if (valueNode.kind === 'Variable') {
    return { kind: valueNode.kind, variableName: valueNode.name.value };
  } else {
    return valueNode.value;
  }
}

type GraphQLTypes = GraphQLScalarType | GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType
  | GraphQLEnumType | GraphQLInputObjectType | GraphQLList<any> | GraphQLNonNull<any>;

export function isTypeProperSuperTypeOf(schema: GraphQLSchema, maybeSuperType: GraphQLTypes, subType: GraphQLObjectType) {
  return isEqualType(maybeSuperType, subType) || (isAbstractType(maybeSuperType) && schema.isPossibleType(maybeSuperType, subType));
}

// Utility functions extracted from graphql-js

/**
 * Extracts the root type of the operation from the schema.
 */
export function getOperationRootType(schema: GraphQLSchema, operation: OperationDefinitionNode) {
  switch (operation.operation) {
    case 'query':
      return schema.getQueryType();
    case 'mutation':
      const mutationType = schema.getMutationType();
      if (!mutationType) {
        throw new GraphQLError(
          'Schema is not configured for mutations',
          [operation],
        );
      }
      return mutationType;
    case 'subscription':
      const subscriptionType = schema.getSubscriptionType();
      if (!subscriptionType) {
        throw new GraphQLError(
          'Schema is not configured for subscriptions',
          [operation],
        );
      }
      return subscriptionType;
    default:
      throw new GraphQLError(
        'Can only compile queries, mutations and subscriptions',
        [operation],
      );
  }
}

/**
 * Not exactly the same as the executor's definition of getFieldDef, in this
 * statically evaluated environment we do not always have an Object type,
 * and need to handle Interface and Union types.
 */
export function getFieldDef(schema: GraphQLSchema, parentType: GraphQLObjectType, fieldAST: FieldNode) {
  const name = fieldAST.name.value;
  if (name === SchemaMetaFieldDef.name &&
      schema.getQueryType() === parentType) {
    return SchemaMetaFieldDef;
  }
  if (name === TypeMetaFieldDef.name &&
      schema.getQueryType() === parentType) {
    return TypeMetaFieldDef;
  }
  if (name === TypeNameMetaFieldDef.name &&
      (parentType instanceof GraphQLObjectType ||
       parentType instanceof GraphQLInterfaceType ||
       parentType instanceof GraphQLUnionType)
  ) {
    return TypeNameMetaFieldDef;
  }
  if (parentType instanceof GraphQLObjectType ||
      parentType instanceof GraphQLInterfaceType) {
    return parentType.getFields()[name];
  }
}
