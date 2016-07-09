var mandrillKey = 'bl1nnYhj1De57xe-NkYScQ';
Mandrill = require('mandrill')
Mandrill.initialize(mandrillKey);

Mandrill.sendTemplate = function(templateName, templateContent, message, async, ipPool, sendAt) {
    request = {

    }
    request.key = mandrillKey;

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

module.exports = Mandrill
