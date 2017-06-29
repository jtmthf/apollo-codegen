#!/usr/bin/env node

import * as glob from 'glob';
import * as process from 'process';
import * as path from 'path';
import * as yargs from 'yargs';

import { downloadSchema, introspectSchema, printSchema, generate } from '.';
import { ToolError, logError } from './errors';
import { TargetType } from './generate';

import 'source-map-support/register';

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error: Error) => { throw error; });

process.on('uncaughtException', handleError);

function handleError(error: Error) {
  logError(error);
  process.exit(1);
}

interface IntrospectArgs {
  schema: string;
  output: string;
  header: {
    [key: string]: string,
  };
  insecure?: boolean;
}

interface PrintArgs {
  schema: string;
  output: string;
}

interface GenerateArgs {
  schema: string;
  output?: string;
  target: TargetType;
  namespace?: string;
  'passthrough-custom-scalars': boolean;
  'custom-scalars-prefix': string;
  'add-typename': string;
  input: string[];
  tagName: string;
}

// tslint:disable-next-line:no-unused-expression
yargs
  .command(
    // TODO: yargs typings to take array
    ['introspect-schema <schema>', 'download-schema'] as any,
    'Generate an introspection JSON from a local GraphQL file or from a remote GraphQL server',
    {
      output: {
        demand: true,
        describe: 'Output path for GraphQL schema file',
        default: 'schema.json',
        normalize: true,
        coerce: path.resolve,
      },
      header: {
        alias: 'H',
        describe: 'Additional header to send to the server as part of the introspection query request',
        type: 'array',
        coerce: (arg) => {
          let additionalHeaders = {};
          for (const header of arg) {
            const [name, value] = header.split(/\s*:\s*/);
            if (!(name && value)) {
              throw new ToolError('Headers should be specified as "Name: Value"');
            }
            additionalHeaders[name] = value;
          }
          return additionalHeaders;
        },
      },
      insecure: {
        alias: 'K',
        describe: 'Allows "insecure" SSL connection to the server',
        type: 'boolean',
      },
    },
    async (argv: IntrospectArgs) => {
      const { schema, output, header, insecure } = argv;

      const urlRegex = /^https?:\/\//i;
      if (urlRegex.test(schema)) {
        await downloadSchema(schema, output, header, insecure);
      } else {
        await introspectSchema(schema, output);
      }
    },
  )
  .command(
    'print-schema [schema]',
    'Print the provided schema in the GraphQL schema language format',
    {
      schema: {
        demand: true,
        describe: 'Path to GraphQL introspection query result',
        default: 'schema.json',
        normalize: true,
        coerce: path.resolve,
      },
      output: {
        demand: true,
        describe: 'Output path for GraphQL schema language file',
        default: 'schema.graphql',
        normalize: true,
        coerce: path.resolve,
      },
    },
    async (argv: PrintArgs) => {
      const { schema, output } = argv;
      await printSchema(schema, output);
    },
  )
  .command(
    'generate [input...]',
    'Generate code from a GraphQL schema and query documents',
    {
      schema: {
        demand: true,
        describe: 'Path to GraphQL schema file',
        default: 'schema.json',
        normalize: true,
        coerce: path.resolve,
      },
      output: {
        describe: 'Output directory for the generated files',
        normalize: true,
        coerce: path.resolve,
      },
      target: {
        demand: false,
        describe: 'Code generation target language',
        choices: ['swift', 'json', 'ts', 'typescript', 'flow'],
        default: 'swift',
      },
      namespace: {
        demand: false,
        describe: 'Optional namespace for generated types [currently Swift-only]',
        type: 'string',
      },
      'passthrough-custom-scalars': {
        demand: false,
        describe: "Don't attempt to map custom scalars [temporary option]",
        default: false,
      },
      'custom-scalars-prefix': {
        demand: false,
        describe: 'Prefix for custom scalars. (Implies that passthrough-custom-scalars is true if set)',
        default: '',
        normalize: true,
      },
      'add-typename': {
        demand: false,
        describe: 'For non-swift targets, always add the __typename GraphQL introspection type when generating target types',
        default: false,
      },
      'tag-name': {
        demand: false,
        // tslint:disable-next-line:max-line-length
        describe: 'Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code',
        default: 'gql',
      },
    },
    (argv: GenerateArgs) => {
      let { input } = argv;

      // Use glob if the user's shell was unable to expand the pattern
      if (input.length === 1 && glob.hasMagic(input[0])) {
        input = glob.sync(input[0]);
      }

      const inputPaths = input
        // tslint:disable-next-line:no-shadowed-variable
        .map(input => path.resolve(input))
        // Sort to normalize different glob expansions between different terminals.
        .sort();

      const options = {
        passthroughCustomScalars: argv['passthrough-custom-scalars'] || argv['custom-scalars-prefix'] !== '',
        customScalarsPrefix: argv['custom-scalars-prefix'] || '',
        addTypename: argv['add-typename'],
        namespace: argv.namespace,
      };

      generate(inputPaths, argv.schema, argv.output, argv.target, argv.tagName, options);
    },
  )
  .fail(function(message, error) {
    handleError(error ? error : new ToolError(message));
  })
  .help()
  .version()
  .strict()
  .argv;