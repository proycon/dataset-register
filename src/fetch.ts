import {QueryEngine} from '@comunica/query-sparql';
import factory from 'rdf-ext';
import DatasetExt from 'rdf-ext/lib/Dataset';
import {URL} from 'url';
import {Store} from 'n3';
import {bindingsToQuads, selectQuery, sparqlLimit} from './query';
import {pipeline} from 'stream';
import {StandardizeSchemaOrgPrefixToHttps} from './transform';
import Pino from 'pino';
import {rdfDereferencer} from './rdf';

export class HttpError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export class NoDatasetFoundAtUrl extends Error {
  constructor(message = '') {
    super(`No dataset found at URL: ${message}`);
  }
}

export async function fetch(url: URL): Promise<DatasetExt[]> {
  let datasets = [];
  try {
    datasets = await query(url);
  } catch (e) {
    handleComunicaError(e);
  }

  if (datasets.length === 0) {
    throw new NoDatasetFoundAtUrl();
  }

  return datasets;
}

/**
 * Fetch dataset description(s) by dereferencing the registration URL.
 */
export async function dereference(url: URL): Promise<DatasetExt> {
  try {
    const {data} = await rdfDereferencer.dereference(url.toString());
    const stream = pipeline(
      data,
      new StandardizeSchemaOrgPrefixToHttps(),
      () => {} // Noop because errors are caught below.
    );
    return await factory.dataset().import(stream);
  } catch (e) {
    handleComunicaError(e);
  }
}

const engine = new QueryEngine();

/**
 * Fetch dataset descriptions by executing a SPARQL SELECT query.
 */
async function query(url: URL): Promise<DatasetExt[]> {
  const bindingsStream = await engine.queryBindings(selectQuery, {
    sources: [url.toString()],
  });

  // Write results to an N3 Store for deduplication and partitioning by dataset.
  const store = new Store();
  let count = 0;
  return new Promise(resolve => {
    bindingsStream
      .on('data', binding => {
        count++;
        store.addQuads(bindingsToQuads(binding));
      })
      .on('end', async () => {
        if (count === sparqlLimit) {
          Pino().error(
            `SPARQL query result for ${url.toString()} reached the SPARQL limit of ${sparqlLimit}`
          );
        }

        // Each dataset description is stored in its own graph, so separate them out now.
        const datasets: DatasetExt[] = await Promise.all(
          store
            .getGraphs(null, null, null)
            .map(
              async graph =>
                await factory
                  .dataset()
                  .import(store.match(undefined, undefined, undefined, graph))
            )
        );

        resolve(datasets);
      });
  });
}

/**
 * Retrieve the dataset description through a CONSTRUCT SPARQL query.
 *
 * Currently unusable; see https://github.com/comunica/comunica/issues/773.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// async function construct(url: URL) {
//   const comunica = newEngine();
//   const result = (await comunica.query(
//     `
//       CONSTRUCT {
//         ?s a schema:Dataset ;
//           schema:name ?name ;
//           schema:description ?description ;
//           schema:creator ?creator ;
//           schema:license ?license ;
//           schema:distribution ?distribution .
//         ?distribution a schema:DataDownload ;
//           schema:encodingFormat ?encodingFormat ;
//           schema:contentUrl ?contentUrl .
//         ?creator a schema:Organization ;
//           schema:name ?creatorName .
//       }
//       WHERE {
//         {
//           ?s a schema:Dataset ;
//             schema:identifier ?identifier ;
//             schema:name ?name ;
//             schema:description ?description ;
//             schema:creator ?creator ;
//             schema:license ?license ;
//             schema:distribution ?distribution .
//           ?distribution a schema:DataDownload ;
//             schema:encodingFormat ?encodingFormat ;
//             schema:contentUrl ?contentUrl .
//           ?creator a schema:Organization ;
//             schema:name ?creatorName .
//           OPTIONAL { ?s schema:url ?url . }
//           OPTIONAL { ?s schema:keywords ?keywords . }
//         }
//       }`,
//     {sources: [url.toString()]}
//   )) as IQueryResultQuads;
//
//   return await factory.dataset().import(result.quadStream);
// }

/**
 * Parse Comunica error response to throw a specific error class.
 */
function handleComunicaError(e: unknown): never {
  if (e instanceof Error) {
    // Match error thrown in Comunica’s ActorRdfDereferenceHttpParseBase.
    if (e.message.match(/404: unknown error/)) {
      throw new HttpError(e.message, 404);
    }

    const matches = e.message.match(/HTTP status (\d+)/);
    if (matches) {
      const statusCode = parseInt(matches[1]);
      throw new HttpError(e.message, statusCode);
    }

    throw new NoDatasetFoundAtUrl(e.message);
  }

  throw e;
}
