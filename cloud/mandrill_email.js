  
module.exports = {mandrill_email:mandrill_email};





function mandrill_email(message){

   var mandrill = require('mandrill-api/mandrill');
   var mandrill_client = new mandrill.Mandrill('4Rd4imd3JMZZrIqktdPqEA');
   var async = false;
   var ip_pool = "Main Pool";
   var send_at = "2016-08-23 12:00:00";


    mandrill_client.messages.send({"message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at}, function(result) {
    console.log(result);
    /*
    [{
            "email": "recipient.email@example.com",
            "status": "sent",
            "reject_reason": "hard-bounce",
            "_id": "abc123abc123abc123abc123abc123"
        }]
    */
   }, function(e) {
    // Mandrill returns the error as an object with name and message keys
    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
});

}


   

