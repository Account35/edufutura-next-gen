// k6 Load Test: Real-time Features
// Tests Supabase Realtime WebSocket connections under load

import { check, sleep, group } from 'k6';
import ws from 'k6/ws';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL, TEST_USERS } from '../k6.config.js';
import { login, randomString } from '../utils/helpers.js';

// Custom metrics
const connectionTime = new Trend('ws_connection_time');
const messageLatency = new Trend('ws_message_latency');
const messagesReceived = new Counter('ws_messages_received');
const connectionErrors = new Counter('ws_connection_errors');
const messageDeliveryRate = new Rate('ws_message_delivery');

// Test configuration
export const options = {
  scenarios: {
    // Test concurrent WebSocket connections
    concurrentConnections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '3m', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    'ws_connection_time': ['p(95)<5000'],
    'ws_message_latency': ['p(95)<500'],
    'ws_message_delivery': ['rate>0.99'],
    'ws_connection_errors': ['count<50']
  }
};

// Supabase Realtime WebSocket URL
const REALTIME_URL = BASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket';

export default function() {
  // Login to get access token
  const session = login(TEST_USERS.premium.email, TEST_USERS.premium.password);
  
  if (!session) {
    connectionErrors.add(1);
    return;
  }
  
  const { accessToken, user } = session;
  
  group('WebSocket Connection', () => {
    const startTime = Date.now();
    
    // Connect to Supabase Realtime
    const wsUrl = `${REALTIME_URL}?apikey=${__ENV.SUPABASE_ANON_KEY}&vsn=1.0.0`;
    
    const res = ws.connect(wsUrl, null, function(socket) {
      connectionTime.add(Date.now() - startTime);
      
      let heartbeatInterval;
      let messageCount = 0;
      const messageSentTimes = {};
      
      socket.on('open', () => {
        // Join a channel (e.g., group chat)
        const joinPayload = {
          topic: `realtime:public:group_chat_messages`,
          event: 'phx_join',
          payload: {
            config: {
              postgres_changes: [
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'group_chat_messages'
                }
              ]
            }
          },
          ref: '1'
        };
        
        socket.send(JSON.stringify(joinPayload));
        
        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          socket.send(JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: Date.now().toString()
          }));
        }, 30000);
      });
      
      socket.on('message', (data) => {
        messagesReceived.add(1);
        
        try {
          const msg = JSON.parse(data);
          
          // Track message delivery latency
          if (msg.ref && messageSentTimes[msg.ref]) {
            messageLatency.add(Date.now() - messageSentTimes[msg.ref]);
            messageDeliveryRate.add(1);
            delete messageSentTimes[msg.ref];
          }
          
          // Handle channel join confirmation
          if (msg.event === 'phx_reply' && msg.payload?.status === 'ok') {
            messageCount++;
          }
          
          // Handle postgres_changes events
          if (msg.event === 'postgres_changes') {
            messageCount++;
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      });
      
      socket.on('error', (e) => {
        connectionErrors.add(1);
        console.error('WebSocket error:', e);
      });
      
      socket.on('close', () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
      });
      
      // Simulate sending messages
      socket.setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          const ref = Date.now().toString() + i;
          messageSentTimes[ref] = Date.now();
          
          socket.send(JSON.stringify({
            topic: `realtime:public:group_chat_messages`,
            event: 'broadcast',
            payload: {
              type: 'broadcast',
              event: 'test_message',
              payload: {
                message: `Load test message ${i} - ${randomString(20)}`,
                sender_id: user.id,
                timestamp: new Date().toISOString()
              }
            },
            ref: ref
          }));
          
          sleep(1);
        }
      }, 2000);
      
      // Keep connection open for test duration
      socket.setTimeout(() => {
        socket.close();
      }, 60000);
    });
    
    check(res, {
      'WebSocket connected': (r) => r && r.status === 101
    });
  });
  
  sleep(5);
}

export function setup() {
  console.log('Starting Realtime Load Test');
  console.log('Testing WebSocket connections and message broadcasting');
  
  // Verify login works
  const session = login(TEST_USERS.premium.email, TEST_USERS.premium.password);
  
  if (!session) {
    throw new Error('Test account login failed');
  }
  
  return { verified: true };
}

export function teardown(data) {
  console.log('Realtime Load Test Complete');
}
