const io = require('socket.io-client');

describe('WebSocket Tests', () => {
  let socket;
  const SOCKET_URL = process.env.WS_URL || 'http://localhost:3000';

  beforeEach((done) => {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true
    });
    socket.on('connect', done);
  });

  afterEach(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  });

  test('Should connect to WebSocket server', (done) => {
    expect(socket.connected).toBe(true);
    done();
  });

  test('Should join room successfully', (done) => {
    socket.emit('join-room', 'test-room-123');
    socket.on('room-joined', (roomId) => {
      expect(roomId).toBe('test-room-123');
      done();
    });
  });
});
