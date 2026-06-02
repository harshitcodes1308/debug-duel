// Socket handler for real-time Code KBC multiplayer features
function setupKbcSocket(io) {
  io.on('connection', (socket) => {
    
    // KBC events prefixed with 'kbc_' to avoid collisions with DebugDuel socket events
    socket.on('kbc_join_matchmaking', ({ userId, category }) => {
      console.log(`[KBC Socket] User ${userId} requested matchmaking in category ${category}`);
      socket.emit('kbc_matchmaking_status', { status: 'searching' });
    });

    socket.on('kbc_join_friend_room', ({ userId, roomCode }) => {
      const room = `kbc_room:${roomCode}`;
      socket.join(room);
      console.log(`[KBC Socket] User ${userId} joined room ${roomCode}`);
      io.to(room).emit('kbc_friend_joined', { userId });
    });

    socket.on('kbc_answer_trivia', ({ userId, roomId, score }) => {
      console.log(`[KBC Socket] User ${userId} in KBC room ${roomId} submitted trivia answer. Score: ${score}`);
    });

  });
}

module.exports = setupKbcSocket;
