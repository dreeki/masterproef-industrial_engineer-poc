/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfViewExtension extends the Quad Pattern Fragments RDF view with a summary link. */

let RdfView = require('@ldf/core').views.RdfView;

let ds = 'http://semweb.mmlab.be/ns/datasummaries#';

// Creates a new SummaryRdfViewExtension
class SummaryRdfViewExtension extends RdfView {
  constructor(settings) {
    super('QuadPatternFragments:After', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  _generateRdf(settings, data, metadata, done) {
    // If summaries are enabled, connect the datasource to its summary
    // TODO: summary should be of/off per dataset
    if (settings.summaries && (settings.summaries.dir || settings.summaries.path)) {
      // TODO: summary URL should be generated by router
      if (settings.datasource.url && settings.baseURL  && settings.query.datasource)        {
        metadata(this.dataFactory.quad(this.dataFactory.namedNode(settings.datasource.url), this.dataFactory.namedNode(ds + 'hasDatasetSummary'),
          this.dataFactory.namedNode(settings.baseURL + 'summaries/' + encodeURIComponent(settings.query.datasource))));
      }
    }
    done();
  }
}

module.exports = SummaryRdfViewExtension;