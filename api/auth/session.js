import { jwtVerify } from 'jose';

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.session;

  if (!sessionToken) {
    return res.status(200).json({ user: null });
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(sessionToken, secret);
    
    return res.status(200).json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    });
  } catch (err) {
    // Invalid or expired token
    return res.status(200).json({ user: null });
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = value;
  });
  
  return cookies;
}
