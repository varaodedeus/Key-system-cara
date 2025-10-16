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
    const { key, hwid } = req.body;

    if (!key || !hwid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Key e HWID são obrigatórios' 
      });
    }

    const redis = Redis.fromEnv();
    const keyDataRaw = await redis.get(`key:${key}`);

    if (!keyDataRaw) {
      return res.status(404).json({ 
        success: false, 
        message: 'Key inválida' 
      });
    }

    const keyData = typeof keyDataRaw === 'string' ? JSON.parse(keyDataRaw) : keyDataRaw;

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
