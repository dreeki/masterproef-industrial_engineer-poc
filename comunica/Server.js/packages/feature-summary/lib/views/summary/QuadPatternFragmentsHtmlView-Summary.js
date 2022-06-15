/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A SummaryHtmlViewExtension extends the Quad Pattern Fragments RDF view with a summary link. */

let HtmlView = require('@ldf/core').views.HtmlView,
    path = require('path');

// Creates a new SummaryHtmlViewExtension
class SummaryHtmlViewExtension extends HtmlView {
  constructor(settings) {
    super('QuadPatternFragments:Before', settings);
  }

  // Renders the view with the given settings to the response
  _render(settings, request, response, done) {
    // If summaries are enabled, connect the datasource to its summary
    // TODO: summary should be of/off per dataset
    if (settings.summaries && (settings.summaries.dir || settings.summaries.path)) {
      // TODO: summary URL should be generated by router
      settings.summary = {
        url: settings.baseURL + 'summaries' + encodeURIComponent(settings.query.datasource),
      };
      this._renderTemplate(path.join(__dirname, 'summary-link'), settings, request, response, done);
    }
    else
      done();
  }
}


module.exports = SummaryHtmlViewExtension;