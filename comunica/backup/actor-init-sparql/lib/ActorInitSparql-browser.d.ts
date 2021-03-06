import { IActorContextPreprocessOutput } from "@comunica/bus-context-preprocess";
import { IActionHttpInvalidate, IActorHttpInvalidateOutput } from "@comunica/bus-http-invalidate";
import { ActorInit, IActionInit, IActorOutputInit } from "@comunica/bus-init";
import { IActionOptimizeQueryOperation, IActorOptimizeQueryOperationOutput } from "@comunica/bus-optimize-query-operation";
import { Bindings, IActionQueryOperation, IActorQueryOperationOutput } from "@comunica/bus-query-operation";
import { IActionSparqlParse, IActorSparqlParseOutput } from "@comunica/bus-sparql-parse";
import { IActionRootSparqlParse, IActorOutputRootSparqlParse, IActorSparqlSerializeOutput, IActorTestRootSparqlParse } from "@comunica/bus-sparql-serialize";
import { ActionContext, Actor, IAction, IActorArgs, IActorTest, Logger, Mediator } from "@comunica/core";
import { Algebra } from "sparqlalgebrajs";
/**
 * A browser-safe comunica SPARQL Init Actor.
 */
export declare class ActorInitSparql extends ActorInit implements IActorInitSparqlArgs {
    private static ALGEBRA_TYPES;
    readonly mediatorOptimizeQueryOperation: Mediator<Actor<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>, IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;
    readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>, IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
    readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>, IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
    readonly mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
    readonly mediatorSparqlSerializeMediaTypeCombiner: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
    readonly mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest, IActorContextPreprocessOutput>, IAction, IActorTest, IActorContextPreprocessOutput>;
    readonly mediatorHttpInvalidate: Mediator<Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>, IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;
    readonly logger: Logger;
    readonly queryString?: string;
    readonly defaultQueryInputFormat?: string;
    readonly context?: string;
    readonly contextKeyShortcuts: {
        [shortcut: string]: string;
    };
    constructor(args: IActorInitSparqlArgs);
    /**
     * Create a copy of the given operation in which all given bindings are applied.
     * The bindings are applied to all quad patterns and path expressions.
     *
     * @param {Operation} operation An operation.
     * @param {Bindings} initialBindings Bindings to apply.
     * @return {Operation} A copy of the given operation where all given bindings are applied.
     */
    static applyInitialBindings(operation: Algebra.Operation, initialBindings: Bindings): Algebra.Operation;
    test(action: IActionInit): Promise<IActorTest>;
    /**
     * Evaluate the given query
     * @param {string | Algebra.Operation} query A query string or algebra.
     * @param context An optional query context.
     * @return {Promise<IActorQueryOperationOutput>} A promise that resolves to the query output.
     */
    query(query: string | Algebra.Operation, context?: any): Promise<IActorQueryOperationOutput>;
    /**
     * @param context An optional context.
     * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
     */
    getResultMediaTypes(context: ActionContext): Promise<{
        [id: string]: number;
    }>;
    /**
     * Convert a query result to a string stream based on a certain media type.
     * @param {IActorQueryOperationOutput} queryResult A query result.
     * @param {string} mediaType A media type.
     * @param {ActionContext} context An optional context.
     * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
     */
    resultToString(queryResult: IActorQueryOperationOutput, mediaType?: string, context?: any): Promise<IActorSparqlSerializeOutput>;
    /**
     * Invalidate all internal caches related to the given page URL.
     * If no page URL is given, then all pages will be invalidated.
     * @param {string} url The page URL to invalidate.
     * @return {Promise<any>} A promise resolving when the caches have been invalidated.
     */
    invalidateHttpCache(url?: string): Promise<any>;
    run(action: IActionInit): Promise<IActorOutputInit>;
}
export interface IActorInitSparqlArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
    mediatorOptimizeQueryOperation: Mediator<Actor<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>, IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;
    mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>, IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
    mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>, IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
    mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
    mediatorSparqlSerializeMediaTypeCombiner: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
    mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest, IActorContextPreprocessOutput>, IAction, IActorTest, IActorContextPreprocessOutput>;
    mediatorHttpInvalidate: Mediator<Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>, IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;
    logger: Logger;
    queryString?: string;
    defaultQueryInputFormat?: string;
    context?: string;
    contextKeyShortcuts: {
        [shortcut: string]: string;
    };
}
export declare const KEY_CONTEXT_INITIALBINDINGS: string;
export declare const KEY_CONTEXT_QUERYFORMAT: string;
export declare const KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES: string;
export declare const KEY_CONTEXT_LENIENT: string;
