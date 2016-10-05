var request=require('request');

describe('jasmine-test',function(){

  it('completeorder',function(done){
    request.post({url:"https://22a01715.ngrok.io/parse/functions/completeOrder", params:{amount:10,describtion:"hello world",venue:"right"}},function(error,response,body){
    expect(response.statusCode).toBe(200);
    done();
    })

  });
 
 it('/',function(done){
   request("https://22a01715.ngrok.io",function(error,response,body){
    expect(body).toBe("I dream of being a website.  Please star the parse-server repo on GitHub!");
    done();

 });

});

})