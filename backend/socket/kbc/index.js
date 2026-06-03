const kbcService = require('../../services/kbc');
const kbcRooms = require('../../services/kbc/rooms');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { awardXP } = require('../../utils/xp');
const { checkAchievements } = require('../../services/achievements');

// Helper to serialize room state safely
function serializeRoom(room) {
  if (!room) return null;
  return {
    roomCode: room.roomCode,
    duelId: room.duelId,
    status: room.status,
    category: room.category,
    currentQuestionIndex: room.currentQuestionIndex,
    timeLeft: room.timeLeft,
    host: room.host ? {
      userId: room.host.userId,
      username: room.host.username,
      score: room.host.score,
      isLocked: room.host.isLocked,
      lockedOption: room.host.lockedOption,
      eliminated: room.host.eliminated,
      lifelines: room.host.lifelines,
      online: !room.host.reconnectTimeout
    } : null,
    guest: room.guest ? {
      userId: room.guest.userId,
      username: room.guest.username,
      score: room.guest.score,
      isLocked: room.guest.isLocked,
      lockedOption: room.guest.lockedOption,
      eliminated: room.guest.eliminated,
      lifelines: room.guest.lifelines,
      online: !room.guest.reconnectTimeout
    } : null,
    winnerId: room.winnerId,
    questionsCount: room.questions ? room.questions.length : 0
  };
}

// Helper to serialize question safely (omit answers and explanations)
function serializeQuestion(q) {
  if (!q) return null;
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
    category: q.category,
    points: q.points
  };
}

// Global active timers
const activeTimers = new Map();

function startTimer(roomCode, io) {
  const room = kbcRooms.get(roomCode);
  if (!room) return;

  if (activeTimers.has(roomCode)) {
    clearInterval(activeTimers.get(roomCode));
  }
  
  room.timeLeft = 30;
  room.roundStartTime = Date.now();

  const interval = setInterval(async () => {
    room.timeLeft--;
    io.to(`kbc_room:${roomCode}`).emit('kbc_timer_tick', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(interval);
      activeTimers.delete(roomCode);
      
      // Auto-lock anyone who hasn't locked
      const now = Date.now();
      if (!room.host.eliminated && !room.host.isLocked) {
        room.host.isLocked = true;
        room.host.lockedOption = null;
        room.host.lockTime = now;
      }
      if (room.guest && !room.guest.eliminated && !room.guest.isLocked) {
        room.guest.isLocked = true;
        room.guest.lockedOption = null;
        room.guest.lockTime = now;
      }

      await resolveRound(roomCode, io);
    }
  }, 1000);

  activeTimers.set(roomCode, interval);
}

async function resolveRound(roomCode, io) {
  const room = kbcRooms.get(roomCode);
  if (!room) return;

  // Clear running timer
  if (activeTimers.has(roomCode)) {
    clearInterval(activeTimers.get(roomCode));
    activeTimers.delete(roomCode);
  }

  const q = room.questions[room.currentQuestionIndex];
  const now = Date.now();

  // Process Host
  let hostCorrect = false;
  if (!room.host.eliminated) {
    const elapsedSeconds = room.host.lockTime ? (room.host.lockTime - room.roundStartTime) / 1000 : 30;
    room.host.totalTimeTaken += elapsedSeconds;

    if (room.host.lockedOption === q.correctAnswer) {
      room.host.score++;
      hostCorrect = true;
    } else {
      room.host.eliminated = true;
    }
  }

  // Process Guest
  let guestCorrect = false;
  if (room.guest && !room.guest.eliminated) {
    const elapsedSeconds = room.guest.lockTime ? (room.guest.lockTime - room.roundStartTime) / 1000 : 30;
    room.guest.totalTimeTaken += elapsedSeconds;

    if (room.guest.lockedOption === q.correctAnswer) {
      room.guest.score++;
      guestCorrect = true;
    } else {
      room.guest.eliminated = true;
    }
  }

  // Broadcast round resolution
  io.to(`kbc_room:${roomCode}`).emit('kbc_round_resolved', {
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    hostResult: {
      userId: room.host.userId,
      isCorrect: hostCorrect,
      score: room.host.score,
      eliminated: room.host.eliminated
    },
    guestResult: room.guest ? {
      userId: room.guest.userId,
      isCorrect: guestCorrect,
      score: room.guest.score,
      eliminated: room.guest.eliminated
    } : null,
    room: serializeRoom(room)
  });

  // Check Game Over conditions
  const hostStillPlaying = !room.host.eliminated;
  const guestStillPlaying = room.guest && !room.guest.eliminated;
  const isJackpotReached = room.currentQuestionIndex >= 14;

  if ((!hostStillPlaying && !guestStillPlaying) || isJackpotReached) {
    await endGame(roomCode, io);
  } else {
    // Synchronized 7-second progression delay
    setTimeout(() => {
      const activeRoom = kbcRooms.get(roomCode);
      if (!activeRoom || activeRoom.status !== 'active') return;

      activeRoom.currentQuestionIndex++;
      
      // Reset lock state for next question
      if (!activeRoom.host.eliminated) {
        activeRoom.host.isLocked = false;
        activeRoom.host.lockedOption = null;
        activeRoom.host.lockTime = null;
      }
      if (activeRoom.guest && !activeRoom.guest.eliminated) {
        activeRoom.guest.isLocked = false;
        activeRoom.guest.lockedOption = null;
        activeRoom.guest.lockTime = null;
      }

      io.to(`kbc_room:${roomCode}`).emit('kbc_next_question', {
        room: serializeRoom(activeRoom),
        question: serializeQuestion(activeRoom.questions[activeRoom.currentQuestionIndex])
      });

      startTimer(roomCode, io);
    }, 7000);
  }
}

async function endGame(roomCode, io) {
  const room = kbcRooms.get(roomCode);
  if (!room || room.status === 'completed') return;

  room.status = 'completed';

  const hostScore = room.host.score;
  const guestScore = room.guest ? room.guest.score : 0;

  let winnerId = null;

  if (hostScore > guestScore) {
    winnerId = room.host.userId;
  } else if (guestScore > hostScore) {
    winnerId = room.guest ? room.guest.userId : null;
  } else if (hostScore === guestScore && room.guest) {
    // Tiebreaker: faster total response time
    if (room.host.totalTimeTaken < room.guest.totalTimeTaken) {
      winnerId = room.host.userId;
    } else if (room.guest.totalTimeTaken < room.host.totalTimeTaken) {
      winnerId = room.guest.userId;
    } else {
      winnerId = null; // Perfect draw
    }
  }

  room.winnerId = winnerId;

  // Rewards configuration
  const wager = room.betAmount || 0;
  const hostRewards = { tokenChange: 0, eloChange: 0, winner: winnerId === room.host.userId };
  const guestRewards = room.guest ? { tokenChange: 0, eloChange: 0, winner: winnerId === room.guest.userId } : null;

  try {
    await prisma.$transaction(async (tx) => {
      // Row-level lock to prevent duplicate KBC game resolutions or race conditions
      if (room.duelId) {
        const duels = await tx.$queryRaw`SELECT status FROM "Duel" WHERE id = ${room.duelId} FOR UPDATE`;
        const dbDuel = duels[0];
        if (!dbDuel || dbDuel.status !== 'active') {
          throw new Error("ALREADY_COMPLETED");
        }
      }

      if (winnerId) {
        // Winner update
        const winnerIsHost = winnerId === room.host.userId;
        const loserId = winnerIsHost ? (room.guest ? room.guest.userId : null) : room.host.userId;

        // Increment Winner Stats
        const winnerUser = await tx.user.findUnique({ where: { id: winnerId } });
        if (winnerUser) {
          const nextStreak = winnerUser.currentStreak + 1;
          const newTokens = winnerUser.tokens + 50 + wager; // 50 base prize + guest's wager matches
          
          await awardXP(winnerId, 50, tx);

          await tx.user.update({
            where: { id: winnerId },
            data: {
              totalDuels: { increment: 1 },
              totalWins: { increment: 1 },
              tokens: newTokens,
              currentStreak: nextStreak,
              bestStreak: Math.max(winnerUser.bestStreak, nextStreak)
            }
          });

          if (winnerIsHost) {
            hostRewards.tokenChange = 50 + wager;
          } else if (guestRewards) {
            guestRewards.tokenChange = 50 + wager;
          }
        }

        // Decrement Loser Stats
        if (loserId) {
          await awardXP(loserId, 15, tx);

          await tx.user.update({
            where: { id: loserId },
            data: {
              totalDuels: { increment: 1 },
              tokens: { decrement: wager },
              currentStreak: 0
            }
          });

          if (winnerIsHost && guestRewards) {
            guestRewards.tokenChange = -wager;
          } else {
            hostRewards.tokenChange = -wager;
          }
        }

        // Audit achievements
        if (winnerId) {
          await checkAchievements(winnerId, tx, io);
        }
        if (loserId) {
          await checkAchievements(loserId, tx, io);
        }

        // Update Duel record
        if (room.duelId) {
          await tx.duel.update({
            where: { id: room.duelId },
            data: {
              status: "completed",
              winnerId: winnerId,
              endedAt: new Date()
            }
          });

          // Update DuelParticipant record for winner
          await tx.duelParticipant.updateMany({
            where: { duelId: room.duelId, userId: winnerId },
            data: { isWinner: true }
          });
        }
      } else {
        // Draw or no winner (both scores equal, speed identical)
        if (room.duelId) {
          await tx.duel.update({
            where: { id: room.duelId },
            data: {
              status: "completed",
              endedAt: new Date()
            }
          });
        }

        // Increment matches for both
        await tx.user.update({
          where: { id: room.host.userId },
          data: { totalDuels: { increment: 1 } }
        });
        if (room.guest) {
          await tx.user.update({
            where: { id: room.guest.userId },
            data: { totalDuels: { increment: 1 } }
          });
        }
      }
    });
  } catch (dbErr) {
    if (dbErr.message === "ALREADY_COMPLETED") {
      console.log(`KBC match ${room.duelId} was already resolved.`);
      return; // Return early without emitting game ended event again
    } else {
      console.error("Failed to commit KBC match result to DB:", dbErr);
      return;
    }
  }

  io.to(`kbc_room:${roomCode}`).emit('kbc_game_ended', {
    room: serializeRoom(room),
    winnerId,
    hostRewards,
    guestRewards
  });
}

function setupKbcSocket(io) {
  io.on('connection', (socket) => {

    // 1. Join waiting room / active game
    socket.on('kbc_join_lobby', async ({ roomCode, userId }) => {
      if (!roomCode || !userId) return;
      const code = roomCode.toUpperCase();
      const room = kbcRooms.get(code);

      if (!room) {
        socket.emit('kbc_error', { message: "Room not found." });
        return;
      }

      try {
        const userRecord = await prisma.user.findUnique({ where: { id: userId } });
        if (!userRecord) {
          socket.emit('kbc_error', { message: "User profile not found." });
          return;
        }

        socket.kbcRoomCode = code;
        socket.kbcUserId = userId;
        socket.join(`kbc_room:${code}`);

        if (room.host.userId === userId) {
          // Host rejoined
          room.host.socketId = socket.id;
          if (room.host.reconnectTimeout) {
            clearTimeout(room.host.reconnectTimeout);
            room.host.reconnectTimeout = null;
            io.to(`kbc_room:${code}`).emit('kbc_player_reconnected', { userId, username: room.host.username });
          }
        } else {
          // Guest handling
          if (!room.guest) {
            // New guest joining waiting room
            if (room.status !== 'waiting') {
              socket.emit('kbc_error', { message: "Match already in progress." });
              return;
            }

            room.guest = {
              userId: userRecord.id,
              username: userRecord.username,
              socketId: socket.id,
              score: 0,
              isLocked: false,
              lockedOption: null,
              lockTime: null,
              lifelines: { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false },
              eliminated: false,
              totalTimeTaken: 0,
              reconnectTimeout: null
            };

            // Register guest in DB duel participants
            const existing = await prisma.duelParticipant.findFirst({
              where: { duelId: room.duelId, userId: userRecord.id }
            });
            if (!existing) {
              await prisma.duelParticipant.create({
                data: { duelId: room.duelId, userId: userRecord.id }
              });
            }
          } else if (room.guest.userId === userId) {
            // Guest rejoined
            room.guest.socketId = socket.id;
            if (room.guest.reconnectTimeout) {
              clearTimeout(room.guest.reconnectTimeout);
              room.guest.reconnectTimeout = null;
              io.to(`kbc_room:${code}`).emit('kbc_player_reconnected', { userId, username: room.guest.username });
            }
          } else {
            // Third user trying to enter
            socket.emit('kbc_error', { message: "This room is full." });
            return;
          }
        }

        // Send initial room setup
        socket.emit('kbc_room_joined', {
          room: serializeRoom(room),
          currentQuestion: room.status === 'active' ? serializeQuestion(room.questions[room.currentQuestionIndex]) : null
        });

        // Broadcast update to others
        io.to(`kbc_room:${code}`).emit('kbc_room_updated', serializeRoom(room));

      } catch (err) {
        console.error("Socket lobby join error:", err);
        socket.emit('kbc_error', { message: "Internal server error joining room." });
      }
    });

    // 2. Direct invitation sending
    socket.on('kbc_send_invite', ({ hostUsername, friendId, roomCode }) => {
      // Access the global onlineUsers Map from server.js
      // Since onlineUsers is globally accessible, check its value
      // Wait, is onlineUsers imported or declared globally?
      // In server.js: const onlineUsers = new Map();
      // Since server.js runs setupKbcSocket(io) after instantiating it, we can fetch
      // it from socket.adapter or check if we can pass/find online sockets.
      // Sockets are in rooms, we can target `user:${friendId}` room!
      // In server.js, a user socket joins `user:${userId}` upon registration!
      // So we can send to `user:${friendId}` directly without checking the Map!
      // This is a beautiful socket.io feature that avoids mapping concerns entirely.
      io.to(`user:${friendId}`).emit('kbc_invite_received', {
        roomCode,
        hostUsername
      });
    });

    // 3. Start game (Host only)
    socket.on('kbc_start_match', async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const room = kbcRooms.get(code);

      if (!room || room.host.socketId !== socket.id) return;
      if (!room.guest) return; // Cannot start without a guest

      try {
        room.questions = kbcService.generateQuestionSet(room.category);
        room.status = 'active';
        room.host.totalTimeTaken = 0;
        room.guest.totalTimeTaken = 0;

        await prisma.duel.update({
          where: { id: room.duelId },
          data: { status: 'active', startedAt: new Date() }
        });

        io.to(`kbc_room:${code}`).emit('kbc_game_started', {
          room: serializeRoom(room),
          question: serializeQuestion(room.questions[0])
        });

        startTimer(code, io);
      } catch (err) {
        console.error("Failed to start KBC match:", err);
        socket.emit('kbc_error', { message: "Failed to generate match questions." });
      }
    });

    // 4. Lock option (anti-cheat validated)
    socket.on('kbc_lock_option', async ({ roomCode, optionIndex }) => {
      const code = roomCode.toUpperCase();
      const room = kbcRooms.get(code);

      if (!room || room.status !== 'active') return;

      const player = (room.host.socketId === socket.id) ? room.host : (room.guest && room.guest.socketId === socket.id ? room.guest : null);
      if (!player || player.eliminated || player.isLocked) return;

      // Lock parameters validation
      if (optionIndex < 0 || optionIndex > 3) return;

      player.isLocked = true;
      player.lockedOption = optionIndex;
      player.lockTime = Date.now();

      io.to(`kbc_room:${code}`).emit('kbc_player_locked', {
        userId: player.userId,
        username: player.username
      });

      // Verify if round can be resolved
      const hostLocked = room.host.eliminated || room.host.isLocked;
      const guestLocked = !room.guest || room.guest.eliminated || room.guest.isLocked;

      if (hostLocked && guestLocked) {
        await resolveRound(code, io);
      }
    });

    // 5. Use Lifeline
    socket.on('kbc_use_lifeline', ({ roomCode, lifelineType }) => {
      const code = roomCode.toUpperCase();
      const room = kbcRooms.get(code);

      if (!room || room.status !== 'active') return;

      const player = (room.host.socketId === socket.id) ? room.host : (room.guest && room.guest.socketId === socket.id ? room.guest : null);
      if (!player || player.eliminated || player.lifelines[lifelineType]) return;

      player.lifelines[lifelineType] = true;

      // Broadcast lifeline usage to opponent
      io.to(`kbc_room:${code}`).emit('kbc_lifeline_used', {
        userId: player.userId,
        username: player.username,
        lifelineType,
        room: serializeRoom(room)
      });

      const q = room.questions[room.currentQuestionIndex];
      const correctIdx = q.correctAnswer;

      if (lifelineType === 'fiftyFifty') {
        const incorrect = [0, 1, 2, 3].filter(idx => idx !== correctIdx);
        // Shuffle incorrect options and take two to eliminate
        const toEliminate = incorrect.sort(() => Math.random() - 0.5).slice(0, 2);
        socket.emit('kbc_lifeline_result', { lifelineType: 'fiftyFifty', data: toEliminate });

      } else if (lifelineType === 'audiencePoll') {
        const poll = [0, 0, 0, 0];
        let remaining = 100;
        const correctWeight = Math.floor(Math.random() * 20) + 60; // 60% - 80% correct
        poll[correctIdx] = correctWeight;
        remaining -= correctWeight;

        const incorrect = [0, 1, 2, 3].filter(idx => idx !== correctIdx);
        const w1 = Math.floor(Math.random() * (remaining - 5));
        poll[incorrect[0]] = w1;
        remaining -= w1;
        
        const w2 = Math.floor(Math.random() * remaining);
        poll[incorrect[1]] = w2;
        remaining -= w2;

        poll[incorrect[2]] = remaining;

        socket.emit('kbc_lifeline_result', { lifelineType: 'audiencePoll', data: poll });

      } else if (lifelineType === 'expertAdvice') {
        const optionLetters = ['A', 'B', 'C', 'D'];
        const message = `Based on technical specifications, option ${optionLetters[correctIdx]} is correct. ${q.explanation}`;
        socket.emit('kbc_lifeline_result', { lifelineType: 'expertAdvice', data: message });

      } else if (lifelineType === 'skip') {
        // Swap current question with a new one of same difficulty from kbcService
        try {
          const matchingPool = kbcService.generateQuestionSet(room.category);
          // Find replacement not already in the set
          const replacement = matchingPool.find(item => 
            item.difficulty === q.difficulty && 
            !room.questions.some(existing => existing.id === item.id)
          );

          if (replacement) {
            room.questions[room.currentQuestionIndex] = replacement;

            // Notify room that question was swapped and reset timer
            io.to(`kbc_room:${code}`).emit('kbc_question_skipped', {
              userWhoSkipped: player.username,
              question: serializeQuestion(replacement),
              room: serializeRoom(room)
            });

            // Reset current lock states for skip (since question changed)
            if (!room.host.eliminated) {
              room.host.isLocked = false;
              room.host.lockedOption = null;
              room.host.lockTime = null;
            }
            if (room.guest && !room.guest.eliminated) {
              room.guest.isLocked = false;
              room.guest.lockedOption = null;
              room.guest.lockTime = null;
            }

            startTimer(code, io);
          }
        } catch (skipErr) {
          console.error("Error applying skip lifeline:", skipErr);
        }
      }
    });

    // 6. Rematch Request
    socket.on('kbc_rematch', async ({ roomCode }) => {
      const code = roomCode.toUpperCase();
      const room = kbcRooms.get(code);

      if (!room || room.status !== 'completed') return;

      // Check if both host and guest are ready for rematch
      // Just reset the room directly when a player triggers it
      try {
        room.status = 'waiting';
        room.currentQuestionIndex = 0;
        room.questions = [];
        room.winnerId = null;

        // Reset host
        room.host.score = 0;
        room.host.isLocked = false;
        room.host.lockedOption = null;
        room.host.lockTime = null;
        room.host.eliminated = false;
        room.host.totalTimeTaken = 0;
        room.host.lifelines = { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false };

        // Reset guest
        if (room.guest) {
          room.guest.score = 0;
          room.guest.isLocked = false;
          room.guest.lockedOption = null;
          room.guest.lockTime = null;
          room.guest.eliminated = false;
          room.guest.totalTimeTaken = 0;
          room.guest.lifelines = { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false };
        }

        // Create new Duel DB entry
        const newDuel = await prisma.duel.create({
          data: {
            gameType: "kbc",
            status: "waiting",
            betAmount: Number(room.betAmount || 0),
            language: room.category,
            difficulty: "mixed"
          }
        });

        room.duelId = newDuel.id;

        // Create participants
        await prisma.duelParticipant.create({
          data: { duelId: newDuel.id, userId: room.host.userId }
        });
        if (room.guest) {
          await prisma.duelParticipant.create({
            data: { duelId: newDuel.id, userId: room.guest.userId }
          });
        }

        io.to(`kbc_room:${code}`).emit('kbc_rematch_started', serializeRoom(room));
      } catch (err) {
        console.error("Rematch failed:", err);
      }
    });

    // 7. Explicit leave lobby
    socket.on('kbc_leave', ({ roomCode }) => {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = kbcRooms.get(code);

      if (!room) return;

      const isHost = (room.host.socketId === socket.id);
      
      socket.leave(`kbc_room:${code}`);
      
      if (isHost) {
        // Close room if host leaves waiting lobby
        if (room.status === 'waiting') {
          io.to(`kbc_room:${code}`).emit('kbc_room_closed', { message: "Host left the room." });
          kbcRooms.delete(code);
        } else {
          // If match active, eliminate host
          room.host.eliminated = true;
          io.to(`kbc_room:${code}`).emit('kbc_player_left', { userId: room.host.userId, username: room.host.username });
        }
      } else if (room.guest && room.guest.socketId === socket.id) {
        if (room.status === 'waiting') {
          room.guest = null;
          io.to(`kbc_room:${code}`).emit('kbc_room_updated', serializeRoom(room));
        } else {
          room.guest.eliminated = true;
          io.to(`kbc_room:${code}`).emit('kbc_player_left', { userId: room.guest.userId, username: room.guest.username });
        }
      }
    });

    // 8. Disconnect handler with Reconnection support
    socket.on('disconnect', () => {
      const code = socket.kbcRoomCode;
      const userId = socket.kbcUserId;

      if (!code || !userId) return;

      const room = kbcRooms.get(code);
      if (!room) return;

      const isHost = (room.host.userId === userId);
      const player = isHost ? room.host : (room.guest && room.guest.userId === userId ? room.guest : null);

      if (!player) return;

      if (room.status === 'waiting') {
        // In waiting room: clean up immediately
        if (isHost) {
          io.to(`kbc_room:${code}`).emit('kbc_room_closed', { message: "Host disconnected." });
          kbcRooms.delete(code);
        } else {
          room.guest = null;
          io.to(`kbc_room:${code}`).emit('kbc_room_updated', serializeRoom(room));
        }
      } else if (room.status === 'active') {
        // Active game: set a 20-second grace period for reconnection
        io.to(`kbc_room:${code}`).emit('kbc_player_disconnected', { userId, username: player.username });

        player.reconnectTimeout = setTimeout(async () => {
          player.eliminated = true;
          player.reconnectTimeout = null;
          io.to(`kbc_room:${code}`).emit('kbc_player_left', { userId, username: player.username });

          // Resolve round if other player is locked
          const hostLocked = room.host.eliminated || room.host.isLocked;
          const guestLocked = !room.guest || room.guest.eliminated || room.guest.isLocked;

          if (hostLocked && guestLocked) {
            await resolveRound(code, io);
          }
        }, 20000);
      }
    });

  });
}

module.exports = setupKbcSocket;
