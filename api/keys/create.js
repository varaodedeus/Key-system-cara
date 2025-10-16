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

    const { kv } = await import('@vercel/kv');
    
    const user = await kv.get(`user:${email}`);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

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

    await kv.set(`key:${key}`, keyData);
    
    const userKeys = await kv.get(`user:${email}:keys`) || [];
    userKeys.push(key);
    await kv.set(`user:${email}:keys`, userKeys);

    user.keyCount = (user.keyCount || 0) + 1;
    await kv.set(`user:${email}`, user);

    return res.status(200).json({ 
      success: true, 
      message: 'Key criada com sucesso!',
      data: keyData
    });

  } catch (error) {
    console.error('Erro ao criar key:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar key' 
    });
  }
}
