import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
}

// Mock database for demo purposes (In production use MongoDB/Prisma)
const users: User[] = [];

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user: User = { id: Date.now().toString(), email, password: hashedPassword, name };
  users.push(user);

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1d' });
  
  res.status(201).json({ user: { id: user.id, email, name }, token });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1d' });
  
  res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
});

export default router;
