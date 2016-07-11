var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('bl1nnYhj1De57xe');

mandrill_client.sendTemplate = function(templateName, templateContent, message, async, ipPool, sendAt) {
    request = {

    }

    request.template_name = templateName;
    request.template_content = templateContent;

    request.message = message;

    if (async != undefined)
        request.async = async;
    if (undefined != ipPool)
        request.ip_pool = ipPool;
    if (sendAt != undefined)
        request.send_at = sendAt;


    return Parse.Cloud.httpRequest({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        url: 'https://mandrillapp.com/api/1.0/messages/send-template.json',
        body: request
    });
};

module.exports = mandrill_client
