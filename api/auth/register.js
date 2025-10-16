import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos os campos são obrigatórios' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Senha deve ter no mínimo 6 caracteres' 
      });
    }

    const redis = Redis.fromEnv();
    
    const existingUser = await redis.get(`user:${email}`);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Este email já está cadastrado' 
      });
    }

    const userData = {
      email,
      username,
      password,
      createdAt: Date.now(),
      keyCount: 0
    };

    await redis.set(`user:${email}`, JSON.stringify(userData));

    return res.status(201).json({ 
      success: true, 
      message: 'Conta criada com sucesso!',
      data: {
        email: userData.email,
        username: userData.username,
        token: Buffer.from(`${email}:${Date.now()}`).toString('base64')
      }
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar conta: ' + error.message
    });
  }
}
