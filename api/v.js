const {handler} = require('../server/functions/client-portfolio-share');

module.exports = async function publicProject(req, res) {
  const result = await handler({httpMethod:'GET',queryStringParameters:{code:req.query?.code}});
  res.statusCode = result.statusCode;
  for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  res.end(result.body);
};
