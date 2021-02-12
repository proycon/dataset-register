import factory from 'rdf-ext';
import {JsonLdParser} from 'jsonld-streaming-parser';
import * as fs from 'fs';
import {ShaclValidator, Validator} from '../src/validator';

let validator: Validator;

describe('Validator', () => {
  beforeAll(async () => {
    validator = await ShaclValidator.fromUrl('shacl/dataset.jsonld');
  });

  it('accepts valid Schema.org dataset', async () => {
    const report = await validate('dataset-schema-org-valid.jsonld');
    expect(report.state).toEqual('valid');
  });

  it('reports invalid Schema.org dataset', async () => {
    const report = await validate('dataset-schema-org-invalid.jsonld');
    expect(report.state).toBe('invalid');
  });

  it('accepts valid Schema.org catalog', async () => {
    const report = await validate('catalog-schema-org-valid.jsonld');
    expect(report.state).toEqual('valid');
  });

  it('reports invalid Schema.org catalog', async () => {
    const report = await validate('catalog-schema-org-invalid.jsonld');
    expect(report).not.toBeNull();
  });

  it('accepts a list of valid Schema.org datasets', async () => {
    const report = await validate('datasets-schema-org-valid.jsonld');
    expect(report.state).toEqual('valid');
  });

  it('rejects a list that contains at least one invalid Schema.org dataset', async () => {
    const report = await validate('datasets-schema-org-invalid.jsonld');
    expect(report).not.toBeNull();
  });

  it('rejects empty RDF', async () => {
    const report = await validate('empty.jsonld');
    expect(report.state).toEqual('no-dataset');
  });

  it('rejects RDF that contains no dataset', async () => {
    const report = await validate('no-dataset.jsonld');
    expect(report.state).toEqual('no-dataset');
  });

  it('rejects a dataset that has no IRI', async () => {
    const report = await validate('dataset-invalid-no-iri.jsonld');
    expect(report.state).toEqual('no-dataset');
  });
});

const validate = async (filename: string) =>
  validator.validate(await dataset(filename));

const dataset = async (filename: string) => {
  const jsonLdParser = new JsonLdParser();
  return await factory
    .dataset()
    .import(
      fs.createReadStream(`test/datasets/${filename}`).pipe(jsonLdParser)
    );
};