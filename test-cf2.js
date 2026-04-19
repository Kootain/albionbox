const accountId = '8b065595d79d84b451b678e40ab0695e';
const apiToken = 'cfut_f3aPMxFQ5ewQlPBYFjJc5swk6GkNyq6c9IeQh4jD93720daf';
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;

async function run() {
  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': '10485760',
    'Upload-Metadata': 'name dGVzdC5tcDQ=,filetype dmlkZW8vbXA0'
  };
  
  const res = await fetch(endpoint, { method: 'POST', headers });
  const text = await res.text();
  console.log(res.status, res.statusText);
  console.log('Body:', text);
}

run();