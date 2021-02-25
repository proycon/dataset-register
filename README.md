# Register

This is a prototype for the NDE Register.

For a demo application using this prototype, see https://demo.netwerkdigitaalerfgoed.nl/register/.

The backlog is also available at
the [project board](https://github.com/orgs/netwerk-digitaal-erfgoed/projects/1?card_filter_query=repo%3Anetwerk-digitaal-erfgoed%2Fregister).

API documentation is available at https://demo.netwerkdigitaalerfgoed.nl/register-api.

## Run the application

This application stores data in a [GraphDB](https://graphdb.ontotext.com) RDF store, so you need to have that running
locally.

You can do so in two ways:

- either [install GraphDB for your OS](https://graphdb.ontotext.com/documentation/free/quick-start-guide.html);
- or run it in a Docker container:
    ```
    docker run -p 7200:7200 docker-registry.ontotext.com/graphdb-free:9.6.0-adoptopenjdk11
    ```

When GraphDB runs, you can start the application in development mode. Clone this repository and run:

```
npm install
npm run dev
```

### Run in production

To run the application in production, first compile and then run it. You may want to disable logging, which is enabled
by default:

```
npm run compile
LOG=false npm start
```

### Configuration

You can configure the application through environment variables:

- `GRAPHDB_URL`: the URL at which your GraphDB instance runs (default: `http://localhost:7200`).
- `GRAPHDB_USERNAME`: if using authentication, your GraphDB username (default: empty).
- `GRAPHDB_PASSWORD`: if using authentication, your GraphDB password (default: empty).
- `LOG`: enable/disable logging (default: `true`).
- `CRAWLER_SCHEDULE`: a schedule in Cron format; for example `0 * * * *` to crawl every hour
  (default: crawling disabled).

## Run the tests

To run the tests locally, clone this repository, then:

```
npm install
npm test
```
