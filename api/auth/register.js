// ============================================
// api/auth/register.js (REDIS CLOUD)
// ============================================
import { createClient } from 'redis';

let redisClient = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://default:2sHaUyF6u1VS7Govipi3MxV9C6dEQntk@redis-19762.c82.us-east-1-2.ec2.redns.redis-cloud.com:19762'
    });
    await redisClient.connect();
  }
  return redisClient;
}

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

    const redis = await getRedis();
    
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


// ============================================
// api/auth/login.js (REDIS CLOUD)
// ============================================
import { createClient } from 'redis';

let redisClient = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://default:2sHaUyF6u1VS7Govipi3MxV9C6dEQntk@redis-19762.c82.us-east-1-2.ec2.redns.redis-cloud.com:19762'
    });
    await redisClient.connect();
  }
  return redisClient;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }

    const redis = await getRedis();
    const userData = await redis.get(`user:${email}`);
    
    if (!userData) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    const user = JSON.parse(userData);

    if (user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou senha incorretos' 
      });
    }

    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return res.status(200).json({ 
      success: true, 
      message: 'Login realizado com sucesso!',
      data: {
        token,
        email: user.email,
        username: user.username,
        keyCount: user.keyCount || 0
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao fazer login: ' + error.message
    });
  }
}


// ============================================
// api/keys/create.js (REDIS CLOUD)
// ============================================
import { createClient } from 'redis';

let redisClient = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://default:2sHaUyF6u1VS7Govipi3MxV9C6dEQntk@redis-19762.c82.us-east-1-2.ec2.redns.redis-cloud.com:19762'
    });
    await redisClient.connect();
  }
  return redisClient;
}

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

    const redis = await getRedis();
    
    const userData = await redis.get(`user:${email}`);
    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    const user = JSON.parse(userData);

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
    const keysList = userKeys ? JSON.parse(userKeys) : [];
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


// ============================================
// api/keys/validate.js (REDIS CLOUD)
// ============================================
import { createClient } from 'redis';

let redisClient = null;

async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://default:2sHaUyF6u1VS7Govipi3MxV9C6dEQntk@redis-19762.c82.us-east-1-2.ec2.redns.redis-cloud.com:19762'
    });
    await redisClient.connect();
  }
  return redisClient;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Key e HWID são obrigatórios' 
      });
    }

    const redis = await getRedis();
    const keyDataRaw = await redis.get(`key:${key}`);

    if (!keyDataRaw) {
      return res.status(404).json({ 
        success: false, 
        message: 'Key inválida' 
      });
    }

    const keyData = JSON.parse(keyDataRaw);

    if (keyData.expiresAt <= Date.now()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Key expirada' 
      });
    }

    if (keyData.hwid && keyData.hwid !== hwid) {
      return res.status(403).json({ 
        success: false, 
        message: 'Key já em uso em outro dispositivo' 
      });
    }

    if (!keyData.hwid) {
      keyData.hwid = hwid;
      keyData.firstUse = Date.now();
    }

    keyData.uses = (keyData.uses || 0) + 1;
    keyData.lastUse = Date.now();

    await redis.set(`key:${key}`, JSON.stringify(keyData));

    return res.status(200).json({ 
      success: true, 
      message: 'Key válida!',
      data: {
        expiresAt: keyData.expiresAt,
        timeRemaining: keyData.expiresAt - Date.now()
      }
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno: ' + error.message
    });
  }
}
