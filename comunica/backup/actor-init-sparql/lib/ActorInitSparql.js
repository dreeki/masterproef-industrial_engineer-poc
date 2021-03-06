"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actor_http_memento_1 = require("@comunica/actor-http-memento");
const actor_http_proxy_1 = require("@comunica/actor-http-proxy");
const bus_query_operation_1 = require("@comunica/bus-query-operation");
const bus_rdf_resolve_quad_pattern_1 = require("@comunica/bus-rdf-resolve-quad-pattern");
const logger_pretty_1 = require("@comunica/logger-pretty");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const minimist = require("minimist");
const OS = require("os");
const ActorInitSparql_browser_1 = require("./ActorInitSparql-browser");
var ActorInitSparql_browser_2 = require("./ActorInitSparql-browser");
exports.KEY_CONTEXT_INITIALBINDINGS = ActorInitSparql_browser_2.KEY_CONTEXT_INITIALBINDINGS;
exports.KEY_CONTEXT_QUERYFORMAT = ActorInitSparql_browser_2.KEY_CONTEXT_QUERYFORMAT;
exports.KEY_CONTEXT_LENIENT = ActorInitSparql_browser_2.KEY_CONTEXT_LENIENT;
/**
 * A comunica SPARQL Init Actor.
 */
class ActorInitSparql extends ActorInitSparql_browser_1.ActorInitSparql {
    constructor(args) {
        super(args);
    }
    async run(action) {
        const args = minimist(action.argv);
        if (!args.listformats && (!this.queryString && (!(args.q || args.f) && args._.length < (args.c ? 1 : 2)
            || args._.length < (args.c ? 0 : 1) || args.h || args.help || args.v || args.version))) {
            // Print version information
            if (args.v || args.version) {
                const comunicaVersion = require('../package.json').version;
                const dev = this.isDevelopmentEnvironment() ? '(dev)' : '';
                const nodeVersion = process.version;
                const npmVersion = await this.getScriptOutput('npm -v', '_NPM is unavailable_');
                const yarnVersion = await this.getScriptOutput('yarn -v', '_Yarn is unavailable_');
                const os = `${OS.platform()} (${OS.type()} ${OS.release()})`;
                return { stderr: require('streamify-string')(`| software            | version
| ------------------- | -------
| Comunica Init Actor | ${comunicaVersion} ${dev}
| node                | ${nodeVersion}
| npm                 | ${npmVersion}
| yarn                | ${yarnVersion}
| Operating System    | ${os}
`) };
            }
            // Print command usage
            return { stderr: require('streamify-string')(`comunica-sparql evaluates SPARQL queries

Usage:
  comunica-sparql http://fragments.dbpedia.org/2016-04/en [-q] 'SELECT * WHERE { ?s ?p ?o }'
  comunica-sparql http://fragments.dbpedia.org/2016-04/en [-q] '{ hero { name friends { name } } }' -i graphql
  comunica-sparql http://fragments.dbpedia.org/2016-04/en [-f] query.sparql'
  comunica-sparql http://fragments.dbpedia.org/2016-04/en https://query.wikidata.org/sparql ...
  comunica-sparql hypermedia@http://fragments.dbpedia.org/2016-04/en sparql@https://query.wikidata.org/sparql ...

Options:
  -q            evaluate the given SPARQL query string
  -f            evaluate the SPARQL query in the given file
  -c            use the given JSON configuration file (e.g., config.json)
  -t            the MIME type of the output (e.g., application/json)
  -i            the query input format (e.g., graphql, defaults to sparql)
  -b            base IRI for the query (e.g., http://example.org/)
  -l            sets the log level (e.g., debug, info, warn, ... defaults to warn)
  -d            sets a datetime for querying Memento-enabled archives
  -p            delegates all HTTP traffic through the given proxy (e.g. http://myproxy.org/?uri=)
  --lenient     if failing requests and parsing errors should be logged instead of causing a hard crash
  --help        print this help message
  --listformats prints the supported MIME types
  --version     prints version information
`) };
        }
        // Print supported MIME types
        if (args.listformats) {
            const mediaTypes = await this.getResultMediaTypes(null);
            return { stdout: require('streamify-string')(Object.keys(mediaTypes).join('\n')) };
        }
        // Define query
        let query = null;
        if (args.q) {
            if (typeof args.q !== 'string') {
                throw new Error('The query option must be a string');
            }
            query = args.q;
        }
        else if (args.f) {
            query = fs_1.readFileSync(args.f, { encoding: 'utf8' });
        }
        else {
            query = args._.pop();
            if (!query) {
                query = this.queryString;
            }
        }
        // Define context
        let context = null;
        if (args.c) {
            context = JSON.parse(fs_1.readFileSync(args.c, { encoding: 'utf8' }));
        }
        else if (this.context) {
            context = JSON.parse(this.context);
        }
        else {
            context = {};
        }
        // Define the query format
        context[ActorInitSparql_browser_1.KEY_CONTEXT_QUERYFORMAT] = this.defaultQueryInputFormat;
        if (args.i) {
            context[ActorInitSparql_browser_1.KEY_CONTEXT_QUERYFORMAT] = args.i;
        }
        // Define the base IRI
        if (args.b) {
            context[bus_query_operation_1.KEY_CONTEXT_BASEIRI] = args.b;
        }
        // Set the logger
        context.log = new logger_pretty_1.LoggerPretty({ level: args.l || 'warn' });
        // Define the datetime
        if (args.d) {
            context[actor_http_memento_1.KEY_CONTEXT_DATETIME] = new Date(args.d);
        }
        // Set the proxy
        if (args.p) {
            context[actor_http_proxy_1.KEY_CONTEXT_HTTPPROXYHANDLER] = new actor_http_proxy_1.ProxyHandlerStatic(args.p);
        }
        // Add sources to context
        if (args._.length > 0) {
            context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES] = context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES] || [];
            args._.forEach((sourceValue) => {
                const source = {};
                const splitValues = sourceValue.split('@', 2);
                if (splitValues.length > 1) {
                    source.type = splitValues[0];
                }
                source.value = splitValues[splitValues.length - 1];
                context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES].push(source);
            });
        }
        // Define lenient-mode
        if (args.lenient) {
            context[ActorInitSparql_browser_1.KEY_CONTEXT_LENIENT] = true;
        }
        // Evaluate query
        const queryResult = await this.query(query, context);
        // Serialize output according to media type
        const stdout = (await this.resultToString(queryResult, args.t, queryResult.context)).data;
        return { stdout };
    }
    getScriptOutput(command, fallback) {
        return new Promise((resolve, reject) => {
            child_process_1.exec(command, (error, stdout, stderr) => {
                if (error) {
                    resolve(fallback);
                }
                resolve((stdout || stderr).trimRight());
            });
        });
    }
    isDevelopmentEnvironment() {
        return fs_1.existsSync(__dirname + '/../test');
    }
}
exports.ActorInitSparql = ActorInitSparql;
//# sourceMappingURL=ActorInitSparql.js.map