// Legacy email-only token minting is retired. All new sessions require the emailed token.
Deno.serve(() => new Response(JSON.stringify({error:'email_verification_required',login_url:'https://fuseatelier.com/login'}), {status:410,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://fuseatelier.com'}}));
