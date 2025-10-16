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

    const { kv } = await import('@vercel/kv');
    const user = await kv.get(`user:${email}`);

    if (!user || user.password !== password) {
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
      message: 'Erro ao fazer login' 
    });
  }
}
