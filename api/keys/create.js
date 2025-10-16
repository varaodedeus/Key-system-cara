import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { email, duration } = req.body;

    const redis = Redis.fromEnv();
    
    const userData = await redis.get(`user:${email}`);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    const user = typeof userData === 'string' ? JSON.parse(userData) : userData;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 3) key += '-';
    }

    const keyData = {
      key,
      owner: email,
      createdAt: Date.now(),
      expiresAt: Date.now() + (parseInt(duration) * 60 * 60 * 1000),
      hwid: null,
      uses: 0
    };

    await redis.set(`key:${key}`, JSON.stringify(keyData));
    
    const userKeys = await redis.get(`user:${email}:keys`);
    const keysList = userKeys ? (typeof userKeys === 'string' ? JSON.parse(userKeys) : userKeys) : [];
    keysList.push(key);
    await redis.set(`user:${email}:keys`, JSON.stringify(keysList));

    user.keyCount = (user.keyCount || 0) + 1;
    await redis.set(`user:${email}`, JSON.stringify(user));

    return res.status(200).json({ 
      success: true, 
      message: 'Key criada com sucesso!',
      data: keyData
    });

  } catch (error) {
    console.error('Erro ao criar key:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar key: ' + error.message
    });
  }
}
