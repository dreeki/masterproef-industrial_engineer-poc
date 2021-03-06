"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bus_init_1 = require("@comunica/bus-init");
const bus_query_operation_1 = require("@comunica/bus-query-operation");
const bus_rdf_resolve_quad_pattern_1 = require("@comunica/bus-rdf-resolve-quad-pattern");
const core_1 = require("@comunica/core");
const asyncreiterable_1 = require("asyncreiterable");
const rdf_string_1 = require("rdf-string");
const rdf_terms_1 = require("rdf-terms");
const sparqlalgebrajs_1 = require("sparqlalgebrajs");
/**
 * A browser-safe comunica SPARQL Init Actor.
 */
class ActorInitSparql extends bus_init_1.ActorInit {
    constructor(args) {
        super(args);
    }
    /**
     * Create a copy of the given operation in which all given bindings are applied.
     * The bindings are applied to all quad patterns and path expressions.
     *
     * @param {Operation} operation An operation.
     * @param {Bindings} initialBindings Bindings to apply.
     * @return {Operation} A copy of the given operation where all given bindings are applied.
     */
    static applyInitialBindings(operation, initialBindings) {
        const copiedOperation = {};
        for (const key of Object.keys(operation)) {
            if (Array.isArray(operation[key])) {
                if (key === 'variables') {
                    copiedOperation[key] = operation[key].filter((variable) => !initialBindings.has(rdf_string_1.termToString(variable)));
                }
                else {
                    copiedOperation[key] = operation[key].map((subOperation) => ActorInitSparql.applyInitialBindings(subOperation, initialBindings));
                }
            }
            else if (operation[key] && ActorInitSparql.ALGEBRA_TYPES[operation[key].type]) {
                copiedOperation[key] = ActorInitSparql.applyInitialBindings(operation[key], initialBindings);
            }
            else {
                copiedOperation[key] = operation[key];
            }
            if (operation.type === sparqlalgebrajs_1.Algebra.types.PATTERN || operation.type === sparqlalgebrajs_1.Algebra.types.PATH) {
                for (const quadTerm of rdf_terms_1.QUAD_TERM_NAMES) {
                    if (!(operation.type === sparqlalgebrajs_1.Algebra.types.PATH && quadTerm === 'predicate')) {
                        const term = operation[quadTerm];
                        if (term.termType === 'Variable') {
                            const termString = rdf_string_1.termToString(term);
                            const binding = initialBindings.get(termString);
                            if (binding) {
                                copiedOperation[quadTerm] = binding;
                            }
                        }
                    }
                }
            }
        }
        return copiedOperation;
    }
    async test(action) {
        return true;
    }
    /**
     * Evaluate the given query
     * @param {string | Algebra.Operation} query A query string or algebra.
     * @param context An optional query context.
     * @return {Promise<IActorQueryOperationOutput>} A promise that resolves to the query output.
     */
    async query(query, context) {
        context = context || {};
        // Expand shortcuts
        for (const key in context) {
            if (this.contextKeyShortcuts[key]) {
                const existingEntry = context[key];
                context[this.contextKeyShortcuts[key]] = existingEntry;
                delete context[key];
            }
        }
        // Set the default logger if none is provided
        if (!context[core_1.KEY_CONTEXT_LOG]) {
            context[core_1.KEY_CONTEXT_LOG] = this.logger;
        }
        if (!context[bus_query_operation_1.KEY_CONTEXT_QUERY_TIMESTAMP]) {
            context[bus_query_operation_1.KEY_CONTEXT_QUERY_TIMESTAMP] = new Date();
        }
        // Ensure sources are an async re-iterable
        if (Array.isArray(context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES])) {
            // TODO: backwards compatibility
            context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES].map((source) => {
                if (typeof source !== 'string' && (source.type === 'auto' || source.type === 'hypermedia')) {
                    delete source.type;
                }
            });
            context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES] = asyncreiterable_1.AsyncReiterableArray.fromFixedData(context[bus_rdf_resolve_quad_pattern_1.KEY_CONTEXT_SOURCES]);
        }
        // Prepare context
        context = core_1.ActionContext(context);
        let queryFormat = 'sparql';
        if (context && context.has(exports.KEY_CONTEXT_QUERYFORMAT)) {
            queryFormat = context.get(exports.KEY_CONTEXT_QUERYFORMAT);
            context = context.delete(exports.KEY_CONTEXT_QUERYFORMAT);
            if (queryFormat === 'graphql' && !context.has(exports.KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES)) {
                context = context.set(exports.KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES, {});
            }
        }
        let baseIRI;
        if (context && context.has(bus_query_operation_1.KEY_CONTEXT_BASEIRI)) {
            baseIRI = context.get(bus_query_operation_1.KEY_CONTEXT_BASEIRI);
        }
        // Pre-processing the context
        context = (await this.mediatorContextPreprocess.mediate({ context })).context;
        // Parse query
        let operation;
        if (typeof query === 'string') {
            const queryParseOutput = await this.mediatorSparqlParse.mediate({ context, query, queryFormat, baseIRI });
            operation = queryParseOutput.operation;
            // Update the baseIRI in the context if the query modified it.
            if (queryParseOutput.baseIRI) {
                context = context.set(bus_query_operation_1.KEY_CONTEXT_BASEIRI, queryParseOutput.baseIRI);
            }
        }
        else {
            operation = query;
        }
        // Apply initial bindings in context
        if (context.has(exports.KEY_CONTEXT_INITIALBINDINGS)) {
            const bindings = context.get(exports.KEY_CONTEXT_INITIALBINDINGS);
            operation = ActorInitSparql.applyInitialBindings(operation, bus_query_operation_1.ensureBindings(bindings));
        }
        // Optimize the query operation
        operation = (await this.mediatorOptimizeQueryOperation.mediate({ context, operation })).operation;
        // Execute query
        const resolve = { context, operation };
        const output = await this.mediatorQueryOperation.mediate(resolve);
        output.context = context;
        return output;
    }
    /**
     * @param context An optional context.
     * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
     */
    async getResultMediaTypes(context) {
        return (await this.mediatorSparqlSerializeMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
    }
    /**
     * Convert a query result to a string stream based on a certain media type.
     * @param {IActorQueryOperationOutput} queryResult A query result.
     * @param {string} mediaType A media type.
     * @param {ActionContext} context An optional context.
     * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
     */
    async resultToString(queryResult, mediaType, context) {
        context = core_1.ActionContext(context);
        if (!mediaType) {
            switch (queryResult.type) {
                case 'bindings':
                    mediaType = 'application/json';
                    break;
                case 'quads':
                    mediaType = 'application/trig';
                    break;
                default:
                    mediaType = 'simple';
                    break;
            }
        }
        const handle = queryResult;
        handle.context = context;
        return (await this.mediatorSparqlSerialize.mediate({ context, handle, handleMediaType: mediaType })).handle;
    }
    /**
     * Invalidate all internal caches related to the given page URL.
     * If no page URL is given, then all pages will be invalidated.
     * @param {string} url The page URL to invalidate.
     * @return {Promise<any>} A promise resolving when the caches have been invalidated.
     */
    invalidateHttpCache(url) {
        return this.mediatorHttpInvalidate.mediate({ url });
    }
    async run(action) {
        throw new Error('ActorInitSparql#run is not supported in the browser.');
    }
}
exports.ActorInitSparql = ActorInitSparql;
ActorInitSparql.ALGEBRA_TYPES = Object.keys(sparqlalgebrajs_1.Algebra.types)
    .reduce((acc, key) => { acc[sparqlalgebrajs_1.Algebra.types[key]] = true; return acc; }, {});
exports.KEY_CONTEXT_INITIALBINDINGS = '@comunica/actor-init-sparql:initialBindings';
exports.KEY_CONTEXT_QUERYFORMAT = '@comunica/actor-init-sparql:queryFormat';
exports.KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES = '@comunica/actor-init-sparql:singularizeVariables';
exports.KEY_CONTEXT_LENIENT = '@comunica/actor-init-sparql:lenient';
//# sourceMappingURL=ActorInitSparql-browser.js.map