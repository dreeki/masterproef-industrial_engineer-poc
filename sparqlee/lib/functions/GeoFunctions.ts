import * as E from '../expressions';
import * as C from '../util/Consts';
import { Map } from 'immutable';
import { bool } from './Helpers';
import { Geometries as GeometryType } from '@turf/helpers';
import booleanContains from '@turf/boolean-contains';
import booleanDisjoint from '@turf/boolean-disjoint';
const booleanCrosses = require('@turf/boolean-crosses').default;
const booleanEqual = require('@turf/boolean-equal').default;
const booleanOverlap = require('@turf/boolean-overlap').default;
const booleanWithin = require('@turf/boolean-within').default;
const turfUnion = require('@turf/union').default;
import turfIntersect from '@turf/intersect';
import { calculateTopologicalRelation, calculateNonTopologicalGeometryReturningRelation } from './GeoHelpers';

type Term = E.TermExpression;
type PTerm = Promise<E.TermExpression>;

// TOPOLOGICAL FUNCTIONS

// sfContains -------------------------------------------------------------------
// COMPLIANT WITH DOCS
// Contains bug with polygon with part missing inside (example brussel in vlaamsbrabant -> moet niet contains zijn, maar ik het wel -> polygon in polygon)
// bug report at: https://github.com/Turfjs/turf/issues/1882
const sfContains = {
    arity: 2,
    async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
      const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
      const left: E.TermExpression = await leftExpr;
      const right: E.TermExpression = await rightExpr;
      return calculateTopologicalRelation(left, right, booleanContains);
    },
    applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
      const [left, right] = args.map((a) => evaluate(a, mapping));
      return calculateTopologicalRelation(left, right, booleanContains);
    },
};

// sfCrosses -------------------------------------------------------------------
// NOT COMPLIANT WITH DOCS! 
// maybe combination of pointInPolygon, pointOnLine and something for line with polygon
const sfCrosses = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateTopologicalRelation(left, right, booleanCrosses);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateTopologicalRelation(left, right, booleanCrosses);
  },
};

// sfDisjoint -------------------------------------------------------------------
// doesn't work with parallel lines, laying on top of each other (with a sharing point)
// issue created on turfjs github: https://github.com/Turfjs/turf/issues/1842
// NOT 100% COMPLIANT WITH DOCS
const sfDisjoint = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateTopologicalRelation(left, right, booleanDisjoint);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateTopologicalRelation(left, right, booleanDisjoint);
  },
};

// sfEquals -------------------------------------------------------------------
// COMPLIANT WITH DOCS
const sfEquals = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateTopologicalRelation(left, right, booleanEqual);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateTopologicalRelation(left, right, booleanEqual);
  },
};

// sfIntersects -------------------------------------------------------------------
// NOT 100% COMPLIANT WITH DOCS (see disjoint)
const sfIntersects = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateTopologicalRelation(left, right, intersects);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateTopologicalRelation(left, right, intersects);
  },
};

// stub voor intersects functie
const intersects: (left: GeometryType, right: GeometryType) => boolean = (left: GeometryType, right: GeometryType) => {
  return !booleanDisjoint(left, right);
}

// sfOverlaps -------------------------------------------------------------------
// TODO: not exactly what we need, this returns true if only the borders overlap, 
// while geosparql states that the interior must overlap
// NOT 100% COMPLIANT WITH DOCS
// maybe add !booleanTouches if this exists? -> not on turfjs (yet?)
const sfOverlaps = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateTopologicalRelation(left, right, booleanOverlap);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateTopologicalRelation(left, right, booleanOverlap);
  },
};

// sfTouches -------------------------------------------------------------------
// TODO
const sfTouches = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return bool(false);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return bool(false);
  },
};

// sfWithin -------------------------------------------------------------------
// COMPLIANT WITH DOCS
const sfWithin = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateTopologicalRelation(left, right, booleanWithin);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateTopologicalRelation(left, right, booleanWithin);
  },
};

// NON TOPOLOGICAL FUNCTION
// intersection -------------------------------------------------------------------
const intersection = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateNonTopologicalGeometryReturningRelation(left, right, turfIntersect);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateNonTopologicalGeometryReturningRelation(left, right, turfIntersect);
  },
};

// union -------------------------------------------------------------------
const union = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left: E.TermExpression = await leftExpr;
    const right: E.TermExpression = await rightExpr;
    return calculateNonTopologicalGeometryReturningRelation(left, right, turfUnion);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [left, right] = args.map((a) => evaluate(a, mapping));
    return calculateNonTopologicalGeometryReturningRelation(left, right, turfUnion);
  },
};



export type GeoDefinition = {
    arity: number;
    applyAsync: E.SpecialApplicationAsync;
    applySync: E.SpecialApplicationSync;
    checkArity?: (args: E.Expression[]) => boolean;
};

const _geoDefinitions: { [key in C.GeoOperator]: GeoDefinition } = {
    // --------------------------------------------------------------------------
    // Topological functions
    "http://www.opengis.net/def/function/geosparql/sfContains": sfContains,
    "http://www.opengis.net/def/function/geosparql/sfCrosses": sfCrosses,
    "http://www.opengis.net/def/function/geosparql/sfDisjoint": sfDisjoint,
    "http://www.opengis.net/def/function/geosparql/sfEquals": sfEquals,
    "http://www.opengis.net/def/function/geosparql/sfIntersects": sfIntersects,
    "http://www.opengis.net/def/function/geosparql/sfOverlaps": sfOverlaps,
    "http://www.opengis.net/def/function/geosparql/sfTouches": sfTouches,
    "http://www.opengis.net/def/function/geosparql/sfWithin": sfWithin,

    // Non Topological functions
    "http://www.opengis.net/def/function/geosparql/intersection": intersection,
    "http://www.opengis.net/def/function/geosparql/union": union
};

export const geoDefinitions = Map<C.GeoOperator, GeoDefinition>(_geoDefinitions);