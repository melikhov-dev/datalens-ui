const fs = require('fs');

const lodashTemplate = require('lodash/template');

const template = fs.readFileSync('./scripts/ci/statoscope-comment.tmpl', 'utf8');
const compiledTemplate = lodashTemplate(template);

module.exports = ({downloadLink}) => {
    console.log(1);
    const data = JSON.parse(fs.readFileSync('result.json', 'utf8'));
    console.log(2);
    data.downloadLink = downloadLink;
    return compiledTemplate(data);
};
