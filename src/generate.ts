import * as fs from 'fs';

import { loadSchema,  loadAndMergeQueryDocuments } from './loading';
import { validateQueryDocument } from './validation';
import { compileToIR } from './compilation';
import serializeToJSON from './serializeToJSON';
import { generateSource as generateSwiftSource } from './swift';
import { generateSource as generateTypescriptSource } from './typescript';
import { generateSource as generateFlowSource } from './flow';

export type TargetType = 'json' | 'swift' | 'ts' | 'typescript' | 'flow';

interface BaseContext {
  [x: string]: any;
  schema: any;
  operations: any;
  fragments: any;
  typesUsed: any[];
}

export interface Context extends BaseContext {
  options: {
    passthroughCustomScalars: boolean;
    customScalarsPrefix: string;
    addTypename: string;
    namespace?: string;
  };
}

export default function generate(
  inputPaths: string[],
  schemaPath: string,
  outputPath: string | undefined,
  target: TargetType,
  tagName: string,
  options: any,
) {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schema, document, target);

  if (target === 'swift') {
    options.addTypename = true;
  }

  options.mergeInFieldsFromFragmentSpreads = true;

  const context: BaseContext = compileToIR(schema, document, options);
  Object.assign(context, options);

  let output = '';
  switch (target) {
    case 'json':
      output = serializeToJSON(context);
      break;
    case 'ts':
    case 'typescript':
      output = generateTypescriptSource(context);
      break;
    case 'flow':
      output = generateFlowSource(context);
      break;
    case 'swift':
      output = generateSwiftSource(context, options);
      break;
    default:
      // Although this error should never occur under normal conditions,
      // this error throwing means there is likely an issue with the yargs
      // config.
      throw new Error(`Unexpected target: "${target}"`);
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, output);
  } else {
    console.log(output);
  }
}
