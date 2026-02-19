import { SignJWT } from 'jose';

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  
  // Check for OAuth errors
  if (error) {
    return res.redirect(302, `/auth.html?error=${encodeURIComponent(error)}`);
  }

  // Verify state parameter
  const cookies = parseCookies(req.headers.cookie);
  if (state !== cookies.oauth_state) {
    return res.redirect(302, '/auth.html?error=invalid_state');
  }

  try {
    const baseUrl = getBaseUrl(req);
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl}/api/auth/callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect(302, '/auth.html?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userResponse.ok) {
      return res.redirect(302, '/auth.html?error=failed_to_get_user');
    }

    const user = await userResponse.json();

    // Create session JWT
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const sessionToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // Set session cookie
    const cookieOptions = [
      `session=${sessionToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=604800', // 7 days
      process.env.NODE_ENV === 'production' ? 'Secure' : ''
    ].filter(Boolean).join('; ');

    // Clear oauth_state cookie
    res.setHeader('Set-Cookie', [
      cookieOptions,
      'oauth_state=; Path=/; HttpOnly; Max-Age=0'
    ]);

    // Redirect to onboarding or dashboard
    res.redirect(302, '/onboarding.html');
    
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(302, '/auth.html?error=callback_failed');
  }
}

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
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
