import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent Database File Path
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Interface definitions matching requirements
export interface UserRecord {
  uid: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  prefix: string;
  averageServiceTime: number; // in minutes
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface CounterRecord {
  id: string;
  counterNumber: string;
  serviceId: string;
  assignedStaff: string;
  status: 'AVAILABLE' | 'SERVING' | 'BREAK' | 'OFFLINE';
  currentTokenId?: string | null;
}

export interface TokenRecord {
  id: string;
  tokenNumber: string;
  userId: string;
  userName: string;
  serviceId: string;
  counterId?: string | null;
  counterNumber?: string | null;
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED' | 'HOLD';
  createdAt: string;
  calledAt?: string | null;
  completedAt?: string | null;
  estimatedWaitTime: number; // minutes
}

export interface NotificationRecord {
  id: string;
  userId: string;
  tokenId?: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  services: ServiceRecord[];
  counters: CounterRecord[];
  tokens: TokenRecord[];
  notifications: NotificationRecord[];
}

// Initial presentation seed data
function getInitialSeedData(): DatabaseSchema {
  const now = new Date();
  const timeAgo = (mins: number) => new Date(now.getTime() - mins * 60 * 1000).toISOString();

  return {
    users: [
      {
        uid: 'usr-alex',
        name: 'Alex Morgan',
        email: 'alex.morgan@university.edu',
        passwordHash: 'student123',
        role: 'USER',
        createdAt: timeAgo(120),
      },
      {
        uid: 'usr-admin',
        name: 'Prof. K. Sharma',
        email: 'admin@smartqueue.ac.in',
        passwordHash: 'admin123',
        role: 'ADMIN',
        createdAt: timeAgo(300),
      },
      {
        uid: 'usr-sarah',
        name: 'Sarah Jenkins',
        email: 'sarah.j@university.edu',
        passwordHash: 'student123',
        role: 'USER',
        createdAt: timeAgo(90),
      },
    ],
    services: [
      {
        id: 'srv-student',
        name: 'Student Section',
        description: 'Bonafide certificates, identity cards, character certificates, and general student inquiries.',
        prefix: 'A',
        averageServiceTime: 5,
        status: 'ACTIVE',
        createdAt: timeAgo(500),
      },
      {
        id: 'srv-exam',
        name: 'Examination Cell',
        description: 'Hall tickets, grade card verification, re-evaluation forms, and transcript collection.',
        prefix: 'E',
        averageServiceTime: 8,
        status: 'ACTIVE',
        createdAt: timeAgo(500),
      },
      {
        id: 'srv-accounts',
        name: 'Accounts Department',
        description: 'Semester tuition fees, laboratory dues clearance, fee receipts, and refund requests.',
        prefix: 'F',
        averageServiceTime: 6,
        status: 'ACTIVE',
        createdAt: timeAgo(500),
      },
      {
        id: 'srv-admission',
        name: 'Admission Office',
        description: 'New enrollment documents, branch transfers, lateral entry counseling, and verification.',
        prefix: 'D',
        averageServiceTime: 10,
        status: 'ACTIVE',
        createdAt: timeAgo(500),
      },
      {
        id: 'srv-scholarship',
        name: 'Scholarship Section',
        description: 'Merit scholarship applications, government grants verification, and fee waiver endorsements.',
        prefix: 'S',
        averageServiceTime: 5,
        status: 'ACTIVE',
        createdAt: timeAgo(500),
      },
    ],
    counters: [
      {
        id: 'cnt-1',
        counterNumber: 'Counter 01',
        serviceId: 'srv-student',
        assignedStaff: 'Priya Patel',
        status: 'SERVING',
        currentTokenId: 'tok-a24',
      },
      {
        id: 'cnt-2',
        counterNumber: 'Counter 02',
        serviceId: 'srv-exam',
        assignedStaff: 'Rajesh Nair',
        status: 'SERVING',
        currentTokenId: 'tok-e12',
      },
      {
        id: 'cnt-3',
        counterNumber: 'Counter 03',
        serviceId: 'srv-accounts',
        assignedStaff: 'Anita Rao',
        status: 'AVAILABLE',
        currentTokenId: null,
      },
      {
        id: 'cnt-4',
        counterNumber: 'Counter 04',
        serviceId: 'srv-admission',
        assignedStaff: 'Vikram Singh',
        status: 'SERVING',
        currentTokenId: 'tok-d15',
      },
      {
        id: 'cnt-5',
        counterNumber: 'Counter 05',
        serviceId: 'srv-student',
        assignedStaff: 'Meera Joshi',
        status: 'AVAILABLE',
        currentTokenId: null,
      },
    ],
    tokens: [
      {
        id: 'tok-a21',
        tokenNumber: 'A-021',
        serviceId: 'srv-student',
        userId: 'usr-u1',
        userName: 'Alex Carter',
        counterId: 'cnt-1',
        counterNumber: 'Counter 01',
        status: 'COMPLETED',
        createdAt: timeAgo(45),
        calledAt: timeAgo(30),
        completedAt: timeAgo(22),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-a22',
        tokenNumber: 'A-022',
        serviceId: 'srv-student',
        userId: 'usr-u2',
        userName: 'Rohan Verma',
        counterId: 'cnt-1',
        counterNumber: 'Counter 01',
        status: 'COMPLETED',
        createdAt: timeAgo(40),
        calledAt: timeAgo(22),
        completedAt: timeAgo(15),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-a23',
        tokenNumber: 'A-023',
        serviceId: 'srv-student',
        userId: 'usr-u3',
        userName: 'Elena Chen',
        counterId: 'cnt-1',
        counterNumber: 'Counter 01',
        status: 'COMPLETED',
        createdAt: timeAgo(35),
        calledAt: timeAgo(15),
        completedAt: timeAgo(8),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-a24',
        tokenNumber: 'A-024',
        serviceId: 'srv-student',
        userId: 'usr-u4',
        userName: 'Pooja Gupta',
        counterId: 'cnt-1',
        counterNumber: 'Counter 01',
        status: 'SERVING',
        createdAt: timeAgo(28),
        calledAt: timeAgo(8),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-a25',
        tokenNumber: 'A-025',
        serviceId: 'srv-student',
        userId: 'usr-u5',
        userName: 'David Kim',
        status: 'WAITING',
        createdAt: timeAgo(20),
        estimatedWaitTime: 5,
      },
      {
        id: 'tok-a26',
        tokenNumber: 'A-026',
        serviceId: 'srv-student',
        userId: 'usr-u6',
        userName: 'Maria Garcia',
        status: 'WAITING',
        createdAt: timeAgo(16),
        estimatedWaitTime: 10,
      },
      {
        id: 'tok-a27',
        tokenNumber: 'A-027',
        serviceId: 'srv-student',
        userId: 'usr-alex', // Alex Morgan's active token
        userName: 'Alex Morgan',
        status: 'WAITING',
        createdAt: timeAgo(10),
        estimatedWaitTime: 15,
      },
      {
        id: 'tok-e11',
        tokenNumber: 'E-011',
        serviceId: 'srv-exam',
        userId: 'usr-u7',
        userName: 'Liam Wilson',
        counterId: 'cnt-2',
        counterNumber: 'Counter 02',
        status: 'COMPLETED',
        createdAt: timeAgo(50),
        calledAt: timeAgo(25),
        completedAt: timeAgo(14),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-e12',
        tokenNumber: 'E-012',
        serviceId: 'srv-exam',
        userId: 'usr-u8',
        userName: 'Sophia Martin',
        counterId: 'cnt-2',
        counterNumber: 'Counter 02',
        status: 'SERVING',
        createdAt: timeAgo(30),
        calledAt: timeAgo(14),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-e13',
        tokenNumber: 'E-013',
        serviceId: 'srv-exam',
        userId: 'usr-u9',
        userName: 'Ethan Hunt',
        status: 'WAITING',
        createdAt: timeAgo(12),
        estimatedWaitTime: 8,
      },
      {
        id: 'tok-d15',
        tokenNumber: 'D-015',
        serviceId: 'srv-admission',
        userId: 'usr-u10',
        userName: 'Chloe Bennett',
        counterId: 'cnt-4',
        counterNumber: 'Counter 04',
        status: 'SERVING',
        createdAt: timeAgo(25),
        calledAt: timeAgo(5),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-d16',
        tokenNumber: 'D-016',
        serviceId: 'srv-admission',
        userId: 'usr-u11',
        userName: 'Noah Taylor',
        status: 'WAITING',
        createdAt: timeAgo(8),
        estimatedWaitTime: 10,
      },
      {
        id: 'tok-f40',
        tokenNumber: 'F-040',
        serviceId: 'srv-accounts',
        userId: 'usr-u12',
        userName: 'Lucas Scott',
        counterId: 'cnt-3',
        counterNumber: 'Counter 03',
        status: 'COMPLETED',
        createdAt: timeAgo(40),
        calledAt: timeAgo(20),
        completedAt: timeAgo(10),
        estimatedWaitTime: 0,
      },
      {
        id: 'tok-f41',
        tokenNumber: 'F-041',
        serviceId: 'srv-accounts',
        userId: 'usr-u13',
        userName: 'Zoe Kravitz',
        status: 'WAITING',
        createdAt: timeAgo(14),
        estimatedWaitTime: 6,
      },
      {
        id: 'tok-s30',
        tokenNumber: 'S-030',
        serviceId: 'srv-scholarship',
        userId: 'usr-u14',
        userName: 'Daniel Craig',
        counterId: 'cnt-1',
        counterNumber: 'Counter 01',
        status: 'COMPLETED',
        createdAt: timeAgo(60),
        calledAt: timeAgo(45),
        completedAt: timeAgo(38),
        estimatedWaitTime: 0,
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        userId: 'usr-alex',
        tokenId: 'tok-a27',
        message: 'Token A-027 has been issued. 2 people ahead of you.',
        read: false,
        createdAt: timeAgo(10),
      },
    ],
  };
}

// Database helper
class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading db.json, re-initializing seed data', err);
        this.data = getInitialSeedData();
        this.save();
      }
    } else {
      this.data = getInitialSeedData();
      this.save();
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      broadcastSSE('update', { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to write db.json', err);
    }
  }

  public reset() {
    this.data = getInitialSeedData();
    this.save();
    return this.data;
  }
}

const db = new DatabaseManager();

// Server-Sent Events (SSE) subscribers for real-time queue synchronization
const sseClients: Response[] = [];

function broadcastSSE(event: string, payload: unknown) {
  const data = JSON.stringify(payload);
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// SSE Route
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: {"connected":true}\n\n');
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Middleware: Authenticate via Bearer or custom headers
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userUid = req.headers['x-user-uid'] as string;

  if (userUid) {
    const user = db.get().users.find((u) => u.uid === userUid);
    if (user) {
      (req as unknown as { user: UserRecord }).user = user;
      return next();
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = db.get().users.find((u) => u.uid === token || u.email === token);
    if (user) {
      (req as unknown as { user: UserRecord }).user = user;
      return next();
    }
  }

  next();
}

app.use(authMiddleware);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as unknown as { user?: UserRecord }).user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// ----------------------------------------------------
// 1. AUTHENTICATION ROUTES
// ----------------------------------------------------

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Weak password: must be at least 6 characters' });
  }

  const existing = db.get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const userRole: 'USER' | 'ADMIN' = role === 'ADMIN' ? 'ADMIN' : 'USER';
  const newUser: UserRecord = {
    uid: 'usr-' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: password, // In production, use bcrypt
    role: userRole,
    createdAt: new Date().toISOString(),
  };

  db.get().users.push(newUser);
  db.save();

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, token: newUser.uid });
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Empty fields: Email and password are required' });
  }

  const user = db.get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Account not found: check your email address' });
  }

  if (user.passwordHash !== password) {
    return res.status(401).json({ error: 'Wrong password. Please try again or use Forgot Password.' });
  }

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token: user.uid });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const user = db.get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'No registered account found with this email' });
  }

  // Password reset link simulation
  res.json({
    message: `A secure password reset link has been dispatched to ${email}.`,
    success: true,
  });
});

// Current user session check
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as unknown as { user?: UserRecord }).user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ----------------------------------------------------
// 2. SERVICES ROUTES
// ----------------------------------------------------

// List services
app.get('/api/services', (_req: Request, res: Response) => {
  res.json(db.get().services);
});

// Add service (Admin)
app.post('/api/services', requireAdmin, (req: Request, res: Response) => {
  const { name, description, prefix, averageServiceTime } = req.body;
  if (!name || !prefix) {
    return res.status(400).json({ error: 'Name and Prefix are required' });
  }

  const newService: ServiceRecord = {
    id: 'srv-' + Date.now(),
    name: name.trim(),
    description: (description || '').trim(),
    prefix: prefix.trim().toUpperCase(),
    averageServiceTime: Number(averageServiceTime) || 5,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  db.get().services.push(newService);
  db.save();
  res.status(201).json(newService);
});

// Edit service (Admin)
app.put('/api/services/:id', requireAdmin, (req: Request, res: Response) => {
  const service = db.get().services.find((s) => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const { name, description, prefix, averageServiceTime, status } = req.body;
  if (name !== undefined) service.name = name.trim();
  if (description !== undefined) service.description = description.trim();
  if (prefix !== undefined) service.prefix = prefix.trim().toUpperCase();
  if (averageServiceTime !== undefined) service.averageServiceTime = Number(averageServiceTime);
  if (status !== undefined) service.status = status;

  db.save();
  res.json(service);
});

// Delete service (Admin)
app.delete('/api/services/:id', requireAdmin, (req: Request, res: Response) => {
  const idx = db.get().services.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Service not found' });

  db.get().services.splice(idx, 1);
  db.save();
  res.json({ success: true });
});

// ----------------------------------------------------
// 3. COUNTERS ROUTES
// ----------------------------------------------------

// List counters
app.get('/api/counters', (_req: Request, res: Response) => {
  res.json(db.get().counters);
});

// Add counter (Admin)
app.post('/api/counters', requireAdmin, (req: Request, res: Response) => {
  const { counterNumber, serviceId, assignedStaff, status } = req.body;
  if (!counterNumber || !assignedStaff) {
    return res.status(400).json({ error: 'Counter number and staff name are required' });
  }

  const newCounter: CounterRecord = {
    id: 'cnt-' + Date.now(),
    counterNumber: counterNumber.trim(),
    serviceId: serviceId || '',
    assignedStaff: assignedStaff.trim(),
    status: status || 'AVAILABLE',
    currentTokenId: null,
  };

  db.get().counters.push(newCounter);
  db.save();
  res.status(201).json(newCounter);
});

// Edit counter (Admin)
app.put('/api/counters/:id', requireAdmin, (req: Request, res: Response) => {
  const counter = db.get().counters.find((c) => c.id === req.params.id);
  if (!counter) return res.status(404).json({ error: 'Counter not found' });

  const { counterNumber, serviceId, assignedStaff, status, currentTokenId } = req.body;
  if (counterNumber !== undefined) counter.counterNumber = counterNumber.trim();
  if (serviceId !== undefined) counter.serviceId = serviceId;
  if (assignedStaff !== undefined) counter.assignedStaff = assignedStaff.trim();
  if (status !== undefined) counter.status = status;
  if (currentTokenId !== undefined) counter.currentTokenId = currentTokenId;

  db.save();
  res.json(counter);
});

// ----------------------------------------------------
// 4. TOKENS & QUEUE LOGIC ROUTES
// ----------------------------------------------------

// List all tokens
app.get('/api/tokens', (req: Request, res: Response) => {
  const { userId, serviceId, status } = req.query;
  let tokens = db.get().tokens;

  if (userId) {
    tokens = tokens.filter((t) => t.userId === userId);
  }
  if (serviceId) {
    tokens = tokens.filter((t) => t.serviceId === serviceId);
  }
  if (status) {
    tokens = tokens.filter((t) => t.status === status);
  }

  res.json(tokens);
});

// Generate Token
app.post('/api/tokens', (req: Request, res: Response) => {
  const { serviceId, userName, userId } = req.body;

  if (!serviceId) {
    return res.status(400).json({ error: 'Service ID is required' });
  }

  const service = db.get().services.find((s) => s.id === serviceId);
  if (!service || service.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Selected service is currently unavailable' });
  }

  const prefix = service.prefix;
  const currentUserId = userId || (req as unknown as { user?: UserRecord }).user?.uid || 'usr-guest';
  const effectiveUserName = userName || (req as unknown as { user?: UserRecord }).user?.name || 'Student';

  // Check for duplicate active token to prevent double-clicking
  const existingActive = db.get().tokens.find(
    (t) => t.userId === currentUserId && (t.status === 'WAITING' || t.status === 'CALLED' || t.status === 'SERVING')
  );
  if (existingActive) {
    return res.status(409).json({
      error: `You already have an active token (${existingActive.tokenNumber}) in the queue.`,
      activeToken: existingActive,
    });
  }

  // Find highest serial number for this prefix
  const prefixTokens = db.get().tokens.filter((t) => t.tokenNumber.startsWith(`${prefix}-`));
  let maxSeq = 20;
  for (const t of prefixTokens) {
    const num = parseInt(t.tokenNumber.split('-')[1], 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = maxSeq + 1;
  const tokenNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

  // Calculate people ahead & estimated waiting time
  // Waiting time calculation: number of people ahead × average service time
  const waitingAhead = db.get().tokens.filter(
    (t) => t.serviceId === serviceId && t.status === 'WAITING'
  ).length;

  const estimatedWaitTime = Math.max(2, (waitingAhead + 1) * service.averageServiceTime);

  const newToken: TokenRecord = {
    id: 'tok-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    tokenNumber,
    userId: currentUserId,
    userName: effectiveUserName,
    serviceId,
    counterId: null,
    counterNumber: null,
    status: 'WAITING',
    createdAt: new Date().toISOString(),
    calledAt: null,
    completedAt: null,
    estimatedWaitTime,
  };

  db.get().tokens.push(newToken);

  // Add notification
  db.get().notifications.push({
    id: 'notif-' + Date.now(),
    userId: currentUserId,
    tokenId: newToken.id,
    message: `Your token ${tokenNumber} for ${service.name} has been generated. ${waitingAhead} people ahead.`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  db.save();

  res.status(201).json(newToken);
});

// Admin Queue Controls: Call Next
app.put('/api/tokens/call-next', requireAdmin, (req: Request, res: Response) => {
  const { counterId, serviceId } = req.body;

  // Pick counter
  let counter: CounterRecord | undefined;
  if (counterId) {
    counter = db.get().counters.find((c) => c.id === counterId);
  } else {
    counter = db.get().counters.find((c) => c.status === 'AVAILABLE') || db.get().counters[0];
  }

  if (!counter) {
    return res.status(400).json({ error: 'No available counter found' });
  }

  // Find earliest WAITING token (FIFO)
  let eligibleTokens = db.get().tokens.filter((t) => t.status === 'WAITING');
  if (serviceId) {
    eligibleTokens = eligibleTokens.filter((t) => t.serviceId === serviceId);
  } else if (counter.serviceId) {
    eligibleTokens = eligibleTokens.filter((t) => t.serviceId === counter!.serviceId);
  }

  eligibleTokens.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const tokenToCall = eligibleTokens[0];

  if (!tokenToCall) {
    return res.status(404).json({ error: 'No waiting tokens in this queue' });
  }

  const now = new Date().toISOString();
  tokenToCall.status = 'CALLED';
  tokenToCall.counterId = counter.id;
  tokenToCall.counterNumber = counter.counterNumber;
  tokenToCall.calledAt = now;

  counter.status = 'SERVING';
  counter.currentTokenId = tokenToCall.id;

  // Notify user
  db.get().notifications.push({
    id: 'notif-' + Date.now(),
    userId: tokenToCall.userId,
    tokenId: tokenToCall.id,
    message: `Token ${tokenToCall.tokenNumber}: Please proceed to ${counter.counterNumber} (${counter.assignedStaff}).`,
    read: false,
    createdAt: now,
  });

  db.save();

  res.json({ token: tokenToCall, counter });
});

// Admin Queue Controls: Complete Token
app.put('/api/tokens/:id/complete', requireAdmin, (req: Request, res: Response) => {
  const token = db.get().tokens.find((t) => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'COMPLETED';
  token.completedAt = new Date().toISOString();

  // Free assigned counter
  if (token.counterId) {
    const counter = db.get().counters.find((c) => c.id === token.counterId);
    if (counter) {
      counter.status = 'AVAILABLE';
      counter.currentTokenId = null;
    }
  }

  db.save();
  res.json(token);
});

// Admin Queue Controls: Skip Token
app.put('/api/tokens/:id/skip', requireAdmin, (req: Request, res: Response) => {
  const token = db.get().tokens.find((t) => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'SKIPPED';

  if (token.counterId) {
    const counter = db.get().counters.find((c) => c.id === token.counterId);
    if (counter) {
      counter.status = 'AVAILABLE';
      counter.currentTokenId = null;
    }
  }

  db.save();
  res.json(token);
});

// Admin Queue Controls: Recall Token
app.put('/api/tokens/:id/recall', requireAdmin, (req: Request, res: Response) => {
  const token = db.get().tokens.find((t) => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'CALLED';
  token.calledAt = new Date().toISOString();

  db.get().notifications.push({
    id: 'notif-' + Date.now(),
    userId: token.userId,
    tokenId: token.id,
    message: `RECALL: Token ${token.tokenNumber} please report immediately to ${token.counterNumber || 'Counter'}.`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  db.save();
  res.json(token);
});

// Cancel Token (User or Admin)
app.put('/api/tokens/:id/cancel', (req: Request, res: Response) => {
  const token = db.get().tokens.find((t) => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'CANCELLED';

  if (token.counterId) {
    const counter = db.get().counters.find((c) => c.id === token.counterId);
    if (counter) {
      counter.status = 'AVAILABLE';
      counter.currentTokenId = null;
    }
  }

  db.save();
  res.json(token);
});

// Hold Token (Admin)
app.put('/api/tokens/:id/hold', requireAdmin, (req: Request, res: Response) => {
  const token = db.get().tokens.find((t) => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'HOLD';
  db.save();
  res.json(token);
});

// Transfer Token (Admin)
app.put('/api/tokens/:id/transfer', requireAdmin, (req: Request, res: Response) => {
  const token = db.get().tokens.find((t) => t.id === req.params.id);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  const { targetServiceId } = req.body;
  const targetService = db.get().services.find((s) => s.id === targetServiceId);
  if (!targetService) return res.status(404).json({ error: 'Target service not found' });

  token.serviceId = targetServiceId;
  token.status = 'WAITING';
  token.counterId = null;
  token.counterNumber = null;

  db.save();
  res.json(token);
});

// Reset Queue (Admin)
app.post('/api/queue/reset', requireAdmin, (_req: Request, res: Response) => {
  const data = db.reset();
  res.json({ message: 'Queue reset to initial presentation dataset', data });
});

// ----------------------------------------------------
// 5. NOTIFICATIONS ROUTES
// ----------------------------------------------------

app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  let notifs = db.get().notifications;
  if (userId) {
    notifs = notifs.filter((n) => n.userId === userId);
  }
  res.json(notifs);
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const notif = db.get().notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    db.save();
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// 6. ANALYTICS ROUTE
// ----------------------------------------------------

app.get('/api/analytics', (_req: Request, res: Response) => {
  const tokens = db.get().tokens;
  const waitingTokens = tokens.filter((t) => t.status === 'WAITING').length;
  const servingTokens = tokens.filter((t) => t.status === 'SERVING' || t.status === 'CALLED').length;
  const completedTokens = tokens.filter((t) => t.status === 'COMPLETED').length;
  const cancelledTokens = tokens.filter((t) => t.status === 'CANCELLED').length;
  const skippedTokens = tokens.filter((t) => t.status === 'SKIPPED').length;

  let totalWaitMin = 0;
  const completedWithCalls = tokens.filter((t) => t.status === 'COMPLETED' && t.calledAt);
  if (completedWithCalls.length > 0) {
    for (const t of completedWithCalls) {
      const wait = (new Date(t.calledAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60);
      totalWaitMin += Math.max(1, wait);
    }
    totalWaitMin = Math.round(totalWaitMin / completedWithCalls.length);
  } else {
    totalWaitMin = 12;
  }

  res.json({
    totalToday: tokens.length,
    waitingTokens,
    servingTokens,
    completedTokens,
    cancelledTokens,
    skippedTokens,
    avgWaitMinutes: totalWaitMin,
    avgServiceTimeMinutes: 6,
    peakHours: '11:00 AM',
  });
});

// ----------------------------------------------------
// 7. VITE DEV MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false as const,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartQueue server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
