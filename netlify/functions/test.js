export async function handler(event, context) {
  const endpoint = process.env.API_ENDPOINT;

  const body = JSON.parse(event.body);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": process.env.API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Dati inviati con successo",
        response: data
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
