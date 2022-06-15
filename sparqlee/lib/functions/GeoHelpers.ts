import { geometry, Geometries as GeometryType, Feature } from '@turf/helpers';
import * as Wkt from 'terraformer-wkt-parser';
import * as Terraformer from 'terraformer';
import { TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import * as E from '../expressions';
import { bool, string } from './Helpers';
let proj4 = require('proj4');
if(proj4.default){
    proj4 = proj4.default
}

type projectionMapping_type = { [key: string]: any }; //function url naar welk soort projection
export type GeoObjectParsedType = {
    projection: string,
    value: GeometryType
};

const defaultProjection: string = "http://www.opengis.net/def/crs/OGC/1.3/CRS84";

const projectionToProj4Mapping: projectionMapping_type = {
    "http://www.opengis.net/def/crs/OGC/1.3/CRS27": proj4.defs('EPSG:4267'),//"NAD27, not compliant!",
    "http://www.opengis.net/def/crs/OGC/1.3/CRS83": proj4.defs('EPSG:4269'),//"NAD83",
    "http://www.opengis.net/def/crs/OGC/1.3/CRS84": proj4.WGS84,//"WGS84"
}

// WKT to geometry
const giveGeoObject: (value: string) => GeometryType = (value: string) => {
    //coordinaten omrekenen volgende keer
    const geoJSON = Wkt.parse(value);
    if (!(geoJSON instanceof Terraformer.Feature || geoJSON instanceof Terraformer.Primitive)) {
        throw new Err.CastError(value, TypeURL.XSD_WKT_LITERAL);
    }
    if (geoJSON instanceof Terraformer.Point ||
        geoJSON instanceof Terraformer.MultiPoint ||
        geoJSON instanceof Terraformer.LineString ||
        geoJSON instanceof Terraformer.MultiLineString ||
        geoJSON instanceof Terraformer.Polygon ||
        geoJSON instanceof Terraformer.MultiPolygon) {
        return geometry(geoJSON.type, geoJSON.coordinates);
    }
    throw new Err.UnexpectedError(value, TypeURL.XSD_WKT_LITERAL);
};

const parseGeoObject: (value: E.TermExpression) => GeoObjectParsedType = (value: E.TermExpression) => {
    let temp: string[] = value.str().split('>');
    let result: GeoObjectParsedType;
    // Projection is not obligated! If not given, it has a default value
    if(temp.length === 1){
        result = {
            projection: defaultProjection,
            value: giveGeoObject(temp[0].toUpperCase().trim())
        };
    }else{
        result = {
            projection: temp[0].replace('<', '').trim(),
            value: giveGeoObject(temp[1].toUpperCase().trim())
        };
    }
    return result;
};

// geometry to WKT
const giveWktString: (value: GeometryType) => string = (value: GeometryType) => {
    return Wkt.convert(value);
}

const serializeGeoObject: (value: GeometryType, projection: string) => E.StringLiteral = (value: GeometryType, projection: string) => {
    const wktString: string = giveWktString(value);
    const prefix: string = projection ? "<" + projection + "> " : projection;
    return string(prefix + wktString);
}

const recalculateCoordinates: (geoObjectParsed: GeoObjectParsedType, toProjection: string) => void = (geoObjectParsed: GeoObjectParsedType, toProjection: string) => {
    if (geoObjectParsed.value.type === "Point") {
        geoObjectParsed.value.coordinates = proj4(projectionToProj4Mapping[geoObjectParsed.projection], projectionToProj4Mapping[toProjection], geoObjectParsed.value.coordinates);
    } else if (geoObjectParsed.value.type === "MultiPoint" || geoObjectParsed.value.type === "LineString") {
        let i;
        for (i = 0; i < geoObjectParsed.value.coordinates.length; ++i) {
            geoObjectParsed.value.coordinates[i] = proj4(projectionToProj4Mapping[geoObjectParsed.projection], projectionToProj4Mapping[toProjection], geoObjectParsed.value.coordinates[i]);
        }
    } else if (geoObjectParsed.value.type === "MultiLineString" || geoObjectParsed.value.type === "Polygon") {
        let i, j;
        for (i = 0; i < geoObjectParsed.value.coordinates.length; ++i) {
            for (j = 0; j < geoObjectParsed.value.coordinates[i].length; ++j) {
                geoObjectParsed.value.coordinates[i][j] = proj4(projectionToProj4Mapping[geoObjectParsed.projection], projectionToProj4Mapping[toProjection], geoObjectParsed.value.coordinates[i][j]);
            }
        }
    } else if (geoObjectParsed.value.type === "MultiPolygon") {
        let i, j, k;
        for (i = 0; i < geoObjectParsed.value.coordinates.length; ++i) {
            for (j = 0; j < geoObjectParsed.value.coordinates[i].length; ++j) {
                for (k = 0; k < geoObjectParsed.value.coordinates[i][j].length; ++k) {
                    geoObjectParsed.value.coordinates[i][j][k] = proj4(projectionToProj4Mapping[geoObjectParsed.projection], projectionToProj4Mapping[toProjection], geoObjectParsed.value.coordinates[i][j][k]);
                }
            }
        }
    }
}

export const calculateTopologicalRelation: (left: any, right: any, func: any) => E.BooleanLiteral = (left: any, right: any, func: any) => {
    const leftParsed: GeoObjectParsedType = parseGeoObject(left);
    const rightParsed: GeoObjectParsedType = parseGeoObject(right);
    if (leftParsed.projection !== rightParsed.projection) {
        recalculateCoordinates(rightParsed, leftParsed.projection);
    }
    // try catch arround these functions is because some functions throw an error, example is you want to check if a point contains a polygon
    try {
        return bool(func(leftParsed.value, rightParsed.value));
    } catch (err) {
        return bool(false);
    }
} 

export const calculateNonTopologicalGeometryReturningRelation: (left: any, right: any, func: any) => any = (left: any, right: any, func: any) => {
    const leftParsed: GeoObjectParsedType = parseGeoObject(left);
    const rightParsed: GeoObjectParsedType = parseGeoObject(right);
    if (leftParsed.projection !== rightParsed.projection) {
        recalculateCoordinates(rightParsed, leftParsed.projection);
    }
    const resultFeature: Feature<GeometryType> = func(leftParsed.value, rightParsed.value);
    if(resultFeature){
        const result: GeometryType = resultFeature.geometry;
        return serializeGeoObject(result, leftParsed.projection);
    }
    throw new Err.IncompatibleLanguageOperation(left, right);
}