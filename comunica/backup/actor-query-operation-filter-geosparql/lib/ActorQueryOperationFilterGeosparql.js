"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rdf_string_1 = require("rdf-string");
const sparqlalgebrajs_1 = require("sparqlalgebrajs");
const sparqlee_1 = require("sparqlee"); // deze sparqlee is een lokale sparqlee, het is eerder een geosparqlee!
const bus_query_operation_1 = require("@comunica/bus-query-operation");
/**
 * A comunica Filter Geosparql Query Operation Actor.
 */
class ActorQueryOperationFilterGeosparql extends bus_query_operation_1.ActorQueryOperationTypedMediated {
    constructor(args) {
        super(args, 'filter');
    }
    async testOperation(pattern, context) {
        // Will throw error for unsupported operators
        const config = { exists: this.createExistenceResolver(context) };
        const _ = new sparqlee_1.AsyncEvaluator(pattern.expression, config);
        return true;
    }
    async runOperation(pattern, context) {
        const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
        const output = bus_query_operation_1.ActorQueryOperation.getSafeBindings(outputRaw);
        bus_query_operation_1.ActorQueryOperation.validateQueryOutput(output, 'bindings');
        const { variables, metadata } = output;
        const expressionContext = bus_query_operation_1.ActorQueryOperation.getExpressionContext(context);
        const config = Object.assign(Object.assign({}, expressionContext), { exists: this.createExistenceResolver(context) });
        const evaluator = new sparqlee_1.AsyncEvaluator(pattern.expression, config);
        const transform = async (item, next) => {
            try {
                const result = await evaluator.evaluateAsEBV(item);
                if (result) {
                    bindingsStream._push(item);
                }
            }
            catch (err) {
                if (!sparqlee_1.isExpressionError(err)) {
                    bindingsStream.emit('error', err);
                }
            }
            next();
        };
        const bindingsStream = output.bindingsStream.transform({ transform });
        return { type: 'bindings', bindingsStream, metadata, variables };
    }
    createExistenceResolver(context) {
        return async (expr, bindings) => {
            const operation = this.substitute(expr.input, bindings);
            const outputRaw = await this.mediatorQueryOperation.mediate({ operation, context });
            const output = bus_query_operation_1.ActorQueryOperation.getSafeBindings(outputRaw);
            return new Promise((resolve, reject) => {
                output.bindingsStream.on('end', () => {
                    resolve(false);
                });
                output.bindingsStream.on('error', reject);
                output.bindingsStream.on('data', () => {
                    output.bindingsStream.close();
                    resolve(true);
                });
            })
                .then((exists) => expr.not ? !exists : exists);
        };
    }
    substitute(operation, bindings) {
        return sparqlalgebrajs_1.Util.mapOperation(operation, {
            path: (op, factory) => {
                return {
                    recurse: false,
                    result: factory.createPath(this.substituteSingle(op.subject, bindings), op.predicate, this.substituteSingle(op.object, bindings), this.substituteSingle(op.graph, bindings)),
                };
            },
            pattern: (op, factory) => {
                return {
                    recurse: false,
                    result: factory.createPattern(this.substituteSingle(op.subject, bindings), this.substituteSingle(op.predicate, bindings), this.substituteSingle(op.object, bindings), this.substituteSingle(op.graph, bindings)),
                };
            },
        });
    }
    substituteSingle(term, bindings) {
        if (term.termType === 'Variable') {
            return bindings.get(rdf_string_1.termToString(term), term);
        }
        return term;
    }
}
exports.ActorQueryOperationFilterGeosparql = ActorQueryOperationFilterGeosparql;
//# sourceMappingURL=ActorQueryOperationFilterGeosparql.js.map