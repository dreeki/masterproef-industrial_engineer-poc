"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_pretty_1 = require("@comunica/logger-pretty");
const fs = require("fs");
const http = require("http");
const minimist = require("minimist");
const querystring = require("querystring");
const url = require("url");
const index_1 = require("../index");
/**
 * An HTTP service that exposes a Comunica engine as a SPARQL endpoint.
 */
class HttpServiceSparqlEndpoint {
    constructor(args) {
        args = args || {};
        this.context = args.context || {};
        this.timeout = args.timeout || 60000;
        this.port = args.port || 3000;
        this.invalidateCacheBeforeQuery = args.invalidateCacheBeforeQuery;
        this.engine = index_1.newEngineDynamic(args);
    }
    /**
     * Starts the server
     * @param {string[]} argv The commandline arguments that the script was called with
     * @param {module:stream.internal.Writable} stdout The output stream to log to.
     * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
     * @param {string} moduleRootPath The path to the invoking module.
     * @param {NodeJS.ProcessEnv} env The process env to get constants from.
     * @param {string} defaultConfigPath The path to get the config from if none is defined in the environment.
     * @param {(code: number) => void} exit The callback to invoke to stop the script.
     * @return {Promise<void>} A promise that resolves when the server has been started.
     */
    static runArgsInProcess(argv, stdout, stderr, moduleRootPath, env, defaultConfigPath, exit) {
        const args = minimist(argv);
        if (args._.length !== 1 || args.h || args.help) {
            stderr.write(HttpServiceSparqlEndpoint.HELP_MESSAGE);
            exit(1);
        }
        const options = HttpServiceSparqlEndpoint
            .generateConstructorArguments(args, moduleRootPath, env, defaultConfigPath);
        return new Promise((resolve) => {
            new HttpServiceSparqlEndpoint(options).run(stdout, stderr)
                .then(resolve)
                .catch((reason) => {
                stderr.write(reason);
                exit(1);
                resolve();
            });
        });
    }
    /**
     * Takes parsed commandline arguments and turns them into an object used in the HttpServiceSparqlEndpoint constructor
     * @param {args: minimist.ParsedArgs} args The commandline arguments that the script was called with
     * @param {string} moduleRootPath The path to the invoking module.
     * @param {NodeJS.ProcessEnv} env The process env to get constants from.
     * @param {string} defaultConfigPath The path to get the config from if none is defined in the environment.
     */
    static generateConstructorArguments(args, moduleRootPath, env, defaultConfigPath) {
        // allow both files as direct JSON objects for context
        const context = JSON.parse(fs.existsSync(args._[0]) ? fs.readFileSync(args._[0], 'utf8') : args._[0]);
        const invalidateCacheBeforeQuery = args.i;
        const port = parseInt(args.p, 10) || 3000;
        const timeout = (parseInt(args.t, 10) || 60) * 1000;
        // Set the logger
        if (!context.log) {
            context.log = new logger_pretty_1.LoggerPretty({ level: args.l || 'warn' });
        }
        const configResourceUrl = env.COMUNICA_CONFIG ? env.COMUNICA_CONFIG : defaultConfigPath;
        return {
            configResourceUrl,
            context,
            invalidateCacheBeforeQuery,
            mainModulePath: moduleRootPath,
            port,
            timeout,
        };
    }
    /**
     * Start the HTTP service.
     * @param {module:stream.internal.Writable} stdout The output stream to log to.
     * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
     */
    async run(stdout, stderr) {
        const engine = await this.engine;
        // Determine the allowed media types for requests
        const mediaTypes = await engine.getResultMediaTypes(null);
        const variants = [];
        for (const type of Object.keys(mediaTypes)) {
            variants.push({ type, quality: mediaTypes[type] });
        }
        // Start the server
        const server = http.createServer(this.handleRequest.bind(this, engine, variants, stdout, stderr));
        server.listen(this.port);
        server.setTimeout(2 * this.timeout); // unreliable mechanism, set too high on purpose
        stderr.write('Server running on http://localhost:' + this.port + '/\n');
    }
    /**
     * Handles an HTTP request.
     * @param {ActorInitSparql} engine A SPARQL engine.
     * @param {{type: string; quality: number}[]} variants Allowed variants.
     * @param {module:stream.internal.Writable} stdout Output stream.
     * @param {module:stream.internal.Writable} stderr Error output stream.
     * @param {module:http.IncomingMessage} request Request object.
     * @param {module:http.ServerResponse} response Response object.
     */
    async handleRequest(engine, variants, stdout, stderr, request, response) {
        const mediaType = request.headers.accept && request.headers.accept !== '*/*'
            ? require('negotiate').choose(variants, request)[0].type : null;
        // Verify the path
        const requestUrl = url.parse(request.url, true);
        if (requestUrl.pathname !== '/sparql') {
            stdout.write('[404] Resource not found\n');
            response.writeHead(404, { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 'Access-Control-Allow-Origin': '*' });
            response.end(JSON.stringify({ message: 'Resource not found' }));
            return;
        }
        if (this.invalidateCacheBeforeQuery) {
            // Invalidate cache
            await engine.invalidateHttpCache();
        }
        // Parse the query, depending on the HTTP method
        let sparql;
        switch (request.method) {
            case 'POST':
                sparql = await this.parseBody(request);
                this.writeQueryResult(engine, stdout, stderr, request, response, sparql, mediaType, false);
                break;
            case 'HEAD':
            case 'GET':
                sparql = requestUrl.query.query || '';
                this.writeQueryResult(engine, stdout, stderr, request, response, sparql, mediaType, request.method === 'HEAD');
                break;
            default:
                stdout.write('[405] ' + request.method + ' to ' + requestUrl + '\n');
                response.writeHead(405, { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 'Access-Control-Allow-Origin': '*' });
                response.end(JSON.stringify({ message: 'Incorrect HTTP method' }));
        }
    }
    /**
     * Writes the result of the given SPARQL query.
     * @param {ActorInitSparql} engine A SPARQL engine.
     * @param {module:stream.internal.Writable} stdout Output stream.
     * @param {module:stream.internal.Writable} stderr Error output stream.
     * @param {module:http.IncomingMessage} request Request object.
     * @param {module:http.ServerResponse} response Response object.
     * @param {string} sparql The SPARQL query string.
     * @param {string} mediaType The requested response media type.
     * @param {boolean} headOnly If only the header should be written.
     */
    writeQueryResult(engine, stdout, stderr, request, response, sparql, mediaType, headOnly) {
        let eventEmitter;
        engine.query(sparql, this.context)
            .then(async (result) => {
            stdout.write('[200] ' + request.method + ' to ' + request.url + '\n');
            stdout.write('      Requested media type: ' + mediaType + '\n');
            stdout.write('      Received query: ' + sparql + '\n');
            response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
            if (headOnly) {
                response.end();
                return;
            }
            try {
                const data = (await engine.resultToString(result, mediaType)).data;
                data.on('error', (e) => {
                    stdout.write('[500] Server error in results: ' + e + ' \n');
                    response.end('An internal server error occurred.\n');
                });
                data.pipe(response);
                eventEmitter = data;
            }
            catch (error) {
                stdout.write('[400] Bad request, invalid media type\n');
                response.writeHead(400, { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
                response.end('The response for the given query could not be serialized for the requested media type\n');
            }
        }).catch((error) => {
            stdout.write('[400] Bad request\n');
            response.writeHead(400, { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
            response.end(error.toString());
        });
        this.stopResponse(response, eventEmitter);
    }
    /**
     * Stop after timeout or if the connection is terminated
     * @param {module:http.ServerResponse} response Response object.
     * @param {NodeJS.ReadableStream} eventEmitter Query result stream.
     */
    stopResponse(response, eventEmitter) {
        // Note: socket or response timeouts seemed unreliable, hence the explicit timeout
        const killTimeout = setTimeout(killClient, this.timeout);
        response.on('close', killClient);
        function killClient() {
            if (eventEmitter) {
                // remove all listeners so we are sure no more write calls are made
                eventEmitter.removeAllListeners();
                eventEmitter.emit('end');
            }
            try {
                response.end();
            }
            catch (e) { /* ignore error */ }
            clearTimeout(killTimeout);
        }
    }
    /**
     * Parses the body of a SPARQL POST request
     * @param {module:http.IncomingMessage} request Request object.
     * @return {Promise<string>} A promise resolving to a query string.
     */
    parseBody(request) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.setEncoding('utf8');
            request.on('error', reject);
            request.on('data', (chunk) => { body += chunk; });
            request.on('end', () => {
                const contentType = request.headers['content-type'];
                if (contentType.indexOf('application/sparql-query') >= 0) {
                    return resolve(body);
                }
                else if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                    return resolve(querystring.parse(body).query || '');
                }
                else {
                    return resolve(body);
                }
            });
        });
    }
}
exports.HttpServiceSparqlEndpoint = HttpServiceSparqlEndpoint;
HttpServiceSparqlEndpoint.MIME_PLAIN = 'text/plain';
HttpServiceSparqlEndpoint.MIME_JSON = 'application/json';
// tslint:disable:max-line-length
HttpServiceSparqlEndpoint.HELP_MESSAGE = `comunica-sparql-http exposes a Comunica engine as SPARQL endpoint

context should be a JSON object or the path to such a JSON file.

Usage:
  comunica-sparql-http context.json [-p port] [-t timeout] [-l log-level] [-i] [--help]
  comunica-sparql-http "{ \\"sources\\": [{ \\"type\\": \\"hypermedia\\", \\"value\\" : \\"http://fragments.dbpedia.org/2015/en\\" }]}" [-p port] [-t timeout] [-l log-level] [-i] [--help]

Options:
  -p            The HTTP port to run on (default: 3000)
  -t            The query execution timeout in seconds (default: 60)
  -l            Sets the log level (e.g., debug, info, warn, ... defaults to warn)
  -i            A flag that enables cache invalidation before each query execution.
  --help        print this help message
`;
//# sourceMappingURL=HttpServiceSparqlEndpoint.js.map