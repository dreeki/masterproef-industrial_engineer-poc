cd comunica && yarn run build && cd .. && node comunica/packages/actor-init-sparql-file/bin/query.js file@test.ttl -f "test-geo.sparql"
#cd comunica && yarn run build && cd .. && node comunica/packages/actor-init-sparql/bin/query.js http://data.linkeddatafragments.org/linkedgeodata -f "test-geo.sparql"