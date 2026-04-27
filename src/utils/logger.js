function logError(context, error) {
  console.error(`[${new Date().toISOString()}] [${context}]`, error?.message || error);
}

function logInfo(context, message) {
  console.log(`[${new Date().toISOString()}] [${context}]`, message);
}

module.exports = { logError, logInfo };
