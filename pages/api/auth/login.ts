
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { cuit, password } = req.body;

  // This is a mock authentication.
  // In a real application, you would validate this against your database
  // or an external authentication service.
  if (cuit === '20123456783' && password === 'password123') {
    // Generate a mock token. In a real app, use a library like 'jsonwebtoken'.
    const token = `mock-token-${Date.now()}`;
    return res.status(200).json({ token });
  } else {
    return res.status(401).json({ message: 'CUIT o contraseña inválidos' });
  }
}
