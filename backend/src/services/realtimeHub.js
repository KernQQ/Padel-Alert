const clients = new Set();

function addClient(res) {
  clients.add(res);

  res.on("close", () => {
    clients.delete(res);
  });
}

function broadcast(type, payload = {}) {
  const event = JSON.stringify({
    type,
    payload,
    at: new Date().toISOString()
  });

  for (const client of clients) {
    try {
      client.write(`event: padelalert\n`);
      client.write(`data: ${event}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

function countClients() {
  return clients.size;
}

module.exports = {
  addClient,
  broadcast,
  countClients
};
