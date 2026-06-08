const matchmaker = require('../services/matchmaker');

/**
 * Sets up Socket.io ranked matchmaking events.
 * @param {any} io - Socket.io server instance.
 */
function setupRankedSocket(io) {
  // Start the background matchmaking ticker
  matchmaker.startMatchmaker(io);

  io.on('connection', (socket) => {
    
    // Join Ranked Queue
    socket.on('ranked_queue_join', async ({ userId, username, gameType, language }) => {
      if (!userId || !gameType) {
        socket.emit('ranked_queue_error', { message: "Invalid parameters to join queue" });
        return;
      }

      // Store userId on the socket so we can clean up if they disconnect
      socket.rankedUserId = userId;

      const result = await matchmaker.joinQueue(userId, socket.id, username, gameType, language);
      
      if (result.success) {
        socket.emit('ranked_queue_joined', {
          gameType,
          language: gameType === 'debug' ? language : 'mixed',
          elo: result.elo
        });

        // Periodically update queue status for this socket
        const updateInterval = setInterval(() => {
          const status = matchmaker.getQueueStatus(userId);
          if (status) {
            socket.emit('ranked_queue_status', status);
          } else {
            clearInterval(updateInterval);
          }
        }, 1000);

        // Clean interval on disconnect or queue leave
        socket.on('disconnect', () => clearInterval(updateInterval));
        socket.on('ranked_queue_left', () => clearInterval(updateInterval));
        socket.on('ranked_match_found', () => clearInterval(updateInterval));
      } else {
        socket.emit('ranked_queue_error', { message: result.reason });
      }
    });

    // Leave Ranked Queue
    socket.on('ranked_queue_leave', ({ userId }) => {
      if (!userId) return;
      const left = matchmaker.leaveQueue(userId);
      if (left) {
        socket.emit('ranked_queue_left');
      }
    });

    // Accept Pending Ranked Match
    socket.on('ranked_match_accept', async ({ matchId, userId }) => {
      if (!matchId || !userId) return;
      const result = await matchmaker.acceptMatch(matchId, userId, io);
      if (!result.success) {
        socket.emit('ranked_match_error', { message: result.reason });
      }
    });

    // Decline Pending Ranked Match
    socket.on('ranked_match_decline', ({ matchId, userId }) => {
      if (!matchId || !userId) return;
      matchmaker.declineMatch(matchId, userId, io);
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      if (socket.rankedUserId) {
        matchmaker.leaveQueue(socket.rankedUserId);
      }
    });
  });
}

module.exports = setupRankedSocket;
