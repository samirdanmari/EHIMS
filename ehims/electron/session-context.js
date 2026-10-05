const senderSessions = new Map();

function setSessionForSender(senderId, sessionId) {
    senderSessions.set(senderId, sessionId);
}

function getSessionForSender(senderId) {
    return senderSessions.get(senderId) || null;
}

function clearSessionForSender(senderId) {
    senderSessions.delete(senderId);
}

module.exports = {
    setSessionForSender,
    getSessionForSender,
    clearSessionForSender,
};